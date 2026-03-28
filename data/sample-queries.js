export const featuredQueries = [
  {
    id: "adderall-xr",
    label: "Controlled stimulant",
    query: "Adderall XR 20 mg",
    description: "A higher-friction access case where shortage and manufacturer signals matter.",
  },
  {
    id: "wegovy",
    label: "GLP-1 therapy",
    query: "Wegovy",
    description: "Useful for seeing recall context, formulation breadth, and manufacturer concentration.",
  },
  {
    id: "amoxicillin",
    label: "Acute prescription",
    query: "Amoxicillin 500 mg",
    description: "A simpler case for testing whether the UI stays concise when risk signals are lighter.",
  },
  {
    id: "sertraline",
    label: "Maintenance refill",
    query: "Sertraline 50 mg",
    description: "A common long-term medication with a broader generic landscape.",
  },
];

export const patientQuestions = [
  "Can I likely get this medication without a long search?",
  "Are there FDA signs it may be harder to fill right now?",
  "What should I ask my pharmacist or doctor next?",
];

export const prescriberQuestions = [
  "Are there shortage or supply-risk signals?",
  "Do manufacturer or formulation constraints stand out?",
  "Should I consider alternatives before the patient starts calling around?",
];
