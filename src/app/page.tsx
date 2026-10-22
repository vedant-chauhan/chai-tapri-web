// Phase 4 holding page. No customer-facing features in this phase (PHASE-4-FOUNDATION §1);
// the real home page arrives with slice 1. Facts below are [Verified] in discovery/A-business-research.md.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6">
      <h1 className="text-display leading-none font-bold tracking-tight">Chai Tapri</h1>
      <p className="text-lg">Northbridge, Perth</p>
      <p>Our website is on its way.</p>
      <address className="not-italic">Shop 6/189 William St, Northbridge WA 6003</address>
    </main>
  );
}
