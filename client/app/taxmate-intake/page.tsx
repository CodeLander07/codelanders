"use client";

import { TaxmateWizard } from "@/components/taxmate-intake/taxmate-wizard";

export default function TaxmateIntakePage() {
  return (
    <main className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Taxmate — User Data Intake
        </h1>
        <TaxmateWizard />
      </div>
    </main>
  );
}
