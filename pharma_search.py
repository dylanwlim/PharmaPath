import requests
import random

def search_drug_info(brand_name):
    """Fetches basic NDC data and drug label warnings from openFDA."""
    ndc_url = "https://api.fda.gov/drug/ndc.json"
    label_url = "https://api.fda.gov/drug/label.json"

    ndc_params = {'search': f'brand_name:"{brand_name}"', 'limit': 1}
    
    result_data = {
        "search_term": brand_name,
        "found": False,
        "generic_name": None,
        "manufacturer": None,
        "warnings": None
    }

    try:
        ndc_response = requests.get(ndc_url, params=ndc_params)
        if ndc_response.status_code == 200:
            ndc_data = ndc_response.json().get("results", [])
            if ndc_data:
                drug = ndc_data[0]
                result_data["found"] = True
                result_data["generic_name"] = drug.get("generic_name", "Unknown")
                result_data["manufacturer"] = drug.get("labeler_name", "Unknown")

                generic = result_data["generic_name"]
                label_params = {'search': f'openfda.generic_name:"{generic}"', 'limit': 1}
                label_response = requests.get(label_url, params=label_params)
                
                if label_response.status_code == 200:
                    label_data = label_response.json().get("results", [])
                    if label_data:
                        warnings = label_data[0].get("warnings", ["No specific warnings listed."])
                        result_data["warnings"] = warnings[0][:200] + "..." if len(warnings[0]) > 200 else warnings[0]

    except requests.exceptions.RequestException as e:
        print(f"Network error occurred: {e}")

    return result_data

def mock_pharmacy_inventory(generic_name, location, insurer, strength, requested_qty):
    """Simulates checking local pharmacies for stock and insurance coverage."""
    print(f"\nScanning pharmacies near {location} for {generic_name} ({strength})...")
    print(f"Checking formulary pricing for {insurer}...\n")
    
    # Mock data representing local pharmacies
    pharmacies = [
        {"name": "Walgreens #1042", "distance": "0.8 miles", "base_price": 120},
        {"name": "CVS Pharmacy", "distance": "1.2 miles", "base_price": 135},
        {"name": "Local Care Rx", "distance": "2.5 miles", "base_price": 90}
    ]
    
    results = []
    
    for pharm in pharmacies:
        # Simulate inventory levels (specifically addressing the partial fill problem)
        stock_available = random.choice([0, 30, 90, 120])
        
        # Simulate insurance coverage (copay varies)
        copay = round(pharm["base_price"] * random.choice([0.1, 0.2, 0.5, 1.0]), 2)
        
        status = ""
        action = ""
        
        if stock_available == 0:
            status = "Out of Stock"
            action = "Check back tomorrow or select another location."
        elif stock_available >= requested_qty:
            status = f"In Stock (Has {stock_available} days)"
            action = f"Can fill full {requested_qty} day prescription."
        else:
            status = f"Partial Stock (Has {stock_available} days)"
            action = f"WARNING: Cannot fill full {requested_qty} days. You can do a partial fill of {stock_available} days here."
            
        results.append({
            "pharmacy": pharm["name"],
            "distance": pharm["distance"],
            "status": status,
            "action": action,
            "copay": copay
        })
        
    return results

if __name__ == "__main__":
    print("--- PharmaPath Demo Initialized ---")
    
    # User Inputs
    query = input("Enter Brand Name Drug (e.g., Lipitor): ")
    strength = input("Enter Strength (e.g., 20mg): ")
    quantity = int(input("Enter Prescription Amount (Days Supply, e.g., 30 or 90): "))
    location = input("Enter Zip Code or City: ")
    insurer = input("Enter Health Insurer (e.g., Aetna, BlueCross): ")
    
    print(f"\n[1/2] Fetching verified data from openFDA for '{query}'...")
    data = search_drug_info(query)
    
    if data["found"]:
        generic = data['generic_name']
        print(f"  > Match found. Generic equivalent: {generic}")
        print(f"  > Manufacturer: {data['manufacturer']}")
        
        print("\n[2/2] Connecting to local inventory network...")
        inventory_results = mock_pharmacy_inventory(generic, location, insurer, strength, quantity)
        
        print("=== LOCAL AVAILABILITY RESULTS ===")
        for res in inventory_results:
            print(f"Pharmacy: {res['pharmacy']} ({res['distance']})")
            print(f"Estimated {insurer} Copay: ${res['copay']:.2f}")
            print(f"Inventory: {res['status']}")
            print(f"Note: {res['action']}")
            print("-" * 40)
            
    else:
        print("Drug not found in the openFDA database. Please check your spelling.")