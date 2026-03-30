import { SiteFooter } from "@/components/site-footer";
import { SiteNavbar } from "@/components/site-navbar";
import { PatientResultsShell } from "@/components/search/patient-results-shell";

export default function PatientResultsPage() {
  return (
    <>
      <SiteNavbar />
      <main>
        <PatientResultsShell />
      </main>
      <SiteFooter />
    </>
  );
}
