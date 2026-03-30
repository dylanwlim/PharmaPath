const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildMedicationProfileFromSubmittedSearch,
  buildResolvedLocationFromSubmittedSearch,
} = require("../lib/search/submitted-search-metadata");

test("submitted search metadata builds an openFDA medication profile without index resolution", () => {
  const profile = buildMedicationProfileFromSubmittedSearch(
    {
      medication: "Custom Therapy",
    },
    {
      medicationSource: "openfda",
      medicationWorkflowCategory: "cold_chain",
      medicationLabel: "Custom Therapy Injection",
      medicationSelectedStrength: "2 mg/mL",
      medicationDosageForm: "injection",
      medicationFormulation: "Extended release",
    },
  );

  assert.deepEqual(profile, {
    canonicalLabel: "Custom Therapy",
    workflowCategory: "cold_chain",
    source: "openfda",
    demoOnly: false,
    demoNote: null,
    simulatedUserCount: null,
    medicationLabel: "Custom Therapy Injection",
    selectedStrength: "2 mg/mL",
    dosageForm: "injection",
    formulation: "Extended release",
  });
});

test("submitted search metadata builds a resolved location from client coordinates", () => {
  const location = buildResolvedLocationFromSubmittedSearch(
    {
      location: "New York, NY 10001, USA",
      locationPlaceId: "resolved-place-id",
    },
    {
      locationLat: 40.7536854,
      locationLng: -73.9991637,
    },
  );

  assert.deepEqual(location, {
    raw_query: "New York, NY 10001, USA",
    display_label: "New York, NY 10001, USA",
    formatted_address: "New York, NY 10001, USA",
    name: null,
    place_id: "resolved-place-id",
    coordinates: {
      lat: 40.7536854,
      lng: -73.9991637,
    },
    types: [],
    resolution_source: "client_resolve",
    city: null,
    state: null,
    postal_code: null,
    neighborhood: null,
    country: null,
    country_code: null,
    route: null,
    street_number: null,
  });
});
