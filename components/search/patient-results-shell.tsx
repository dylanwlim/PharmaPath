"use client";

import dynamic from "next/dynamic";

const PatientResultsClient = dynamic(
  () => import("@/components/search/patient-results-client").then((mod) => mod.PatientResultsClient),
  {
    ssr: false,
    loading: () => (
      <div className="px-6 py-32 text-center text-slate-500">Loading patient results...</div>
    ),
  },
);

export function PatientResultsShell() {
  return <PatientResultsClient />;
}
