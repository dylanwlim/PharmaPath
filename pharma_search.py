import requests
import random
import os

# You would set this in your terminal: setx GOOGLE_API_KEY "your_key_here"
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "YOUR_GOOGLE_API_KEY")

def search_drug_info(brand_name):
    """Fetches basic NDC data and drug label warnings from openFDA."""
    ndc_url = "https://api.fda.gov/drug/ndc.json"
    ndc_params = {'search': f'brand_name:"{brand_name}"', 'limit': 1}
    
    result_data = {
        "found": False,
        "generic_name": None,
        "manufacturer": None
    }

    try:
        response = requests.get(ndc_url, params=ndc_params)
        if response.status_code == 200:
            data = response.json().get("results", [])
            if data:
                drug = data[0]
                result_data["found"] = True
                result_data["generic_name"] = drug.get("generic_name", "Unknown")
                result_data["manufacturer"] = drug.get("labeler_name", "Unknown")
    except requests.exceptions.RequestException as e:
        print(f"FDA API Error: {e}")

    return result_data

def get_real_pharmacies(location_query):
    """Uses Google Places API to find real pharmacies near the user."""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"pharmacy in {location_query}",
        "key": GOOGLE_API_KEY
    }
    
    real_pharmacies = []
    
    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            results = response.json().get("results", [])
            # Grab the top 3 real pharmacies
            for place in results[:3]:
                real_pharmacies.append({
                    "name": place.get("name"),
                    "address": place.get("formatted_address"),
                    # We simulate a base price to calculate copays later
                    "base_price": random.randint(50, 200) 
                })
    except requests.exceptions.RequestException as e:
        print(f"Google Places API Error: {e}")
        
    return real_pharmacies

def simulate_inventory_and_pricing(pharmacies, requested_qty, insurer):
    """Applies simulated inventory and insurance logic to real locations."""
    results = []
    
    for pharm in pharmacies:
        # Simulating the exact problem you mentioned: 30 vs 90 day supply
        stock_available = random.choice([0, 30, 90, 120])
        copay = round(pharm["base_price"] * random.choice([0.1, 0.2, 0.5]), 2)
        
        status = ""
        action = ""
        
        if stock_available == 0:
            status = "Out of Stock"
            action = "Check back tomorrow."
        elif stock_available >= requested_qty:
            status = f"In Stock (Has {stock_available} days)"
            action = f"Can fill full {requested_qty} day prescription."
        else:
            status = f"Partial Stock (Has {stock_available} days)"
            action = f"WARNING: Cannot fill {requested_qty} days. Partial fill of {stock_available} days available."
            
        results.append({
            "pharmacy": pharm["name"],
            "address": pharm["address"],
            "status": status,
            "action": action,
            "copay": copay
        })
        
    return results

if __name__ == "__main__":
    print("--- PharmaPath Demo Initialized ---")
    
    query = input("Enter Brand Name Drug (e.g., Lipitor): ")
    quantity = int(input("Enter Prescription Amount (Days Supply, e.g., 30 or 90): "))
    location = input("Enter Zip Code or City: ")
    insurer = input("Enter Health Insurer (e.g., Aetna, BlueCross): ")
    
    print(f"\n[1/3] Fetching verified data from openFDA for '{query}'...")
    drug_data = search_drug_info(query)
    
    if drug_data["found"]:
        generic = drug_data['generic_name']
        print(f"  > Match found. Generic: {generic}")
        
        print(f"\n[2/3] Locating real pharmacies near {location} via Google Places...")
        local_pharmacies = get_real_pharmacies(location)
        
        if not local_pharmacies:
            print("Could not find pharmacies or Google API Key is invalid.")
        else:
            print("\n[3/3] Querying inventory systems...")
            final_results = simulate_inventory_and_pricing(local_pharmacies, quantity, insurer)
            
            print("\n=== LOCAL AVAILABILITY RESULTS ===")
            for res in final_results:
                print(f"Pharmacy: {res['pharmacy']}")
                print(f"Address: {res['address']}")
                print(f"Estimated {insurer} Copay: ${res['copay']:.2f}")
                print(f"Inventory: {res['status']}")
                print(f"Note: {res['action']}")
                print("-" * 40)
    else:
        print("Drug not found in the openFDA database.")