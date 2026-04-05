export const surfaceNames = {
  patient: "Pharmacy Finder",
  prescriber: "Medication Lookup",
  methodology: "How to Use",
} as const;

export const openSurfaceLabels = {
  patient: `Open ${surfaceNames.patient}`,
  prescriber: `Open ${surfaceNames.prescriber}`,
} as const;

export const combinedSurfaceLabel = `${surfaceNames.patient} + ${surfaceNames.prescriber}`;
