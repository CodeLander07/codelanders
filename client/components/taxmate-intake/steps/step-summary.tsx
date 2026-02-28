"use client";

import { useFormContext } from "react-hook-form";
import { TaxmateIntakeFormValues } from "../schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function maskAadhaar(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12) return "•••• •••• ••••";
  return `XXXX XXXX ${digits.slice(-4)}`;
}

function maskPan(value: string) {
  if (!value || value.length < 10) return "••••••••••";
  return `${value.slice(0, 2)}XXXXX${value.slice(-4)}`;
}

function maskPassword() {
  return "••••••••";
}

function fileListNames(fileList?: FileList | null) {
  if (!fileList?.length) return "—";
  return Array.from(fileList).map((f) => f.name).join(", ");
}

export function StepSummary({ onEditStep }: { onEditStep: (step: number) => void }) {
  const { getValues } = useFormContext<TaxmateIntakeFormValues>();
  const v = getValues();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your information below. Use Edit to change any section.
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <h3 className="text-sm font-medium">Basic Details</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(1)}>Edit</Button>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Full Name:</strong> {v.fullName || "—"}</p>
          <p><strong>Age:</strong> {v.age ?? "—"}</p>
          <p><strong>Mobile:</strong> {v.mobileNumber || "—"}</p>
          <p><strong>Password:</strong> {maskPassword()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <h3 className="text-sm font-medium">Official Details</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(2)}>Edit</Button>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Aadhaar:</strong> {maskAadhaar(v.aadhaarNumber ?? "")}</p>
          <p><strong>PAN:</strong> {maskPan(v.panNumber ?? "")}</p>
          <p><strong>Employment:</strong> {v.employmentType ? String(v.employmentType).replace(/-/g, " ") : "—"}</p>
          <p><strong>State:</strong> {v.stateOfResidence || "—"}</p>
          <p><strong>Disability:</strong> {v.disabilityStatus ?? "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
          <h3 className="text-sm font-medium">Financial Information</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => onEditStep(3)}>Edit</Button>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p><strong>Annual Income (₹):</strong> {v.annualIncome != null ? v.annualIncome.toLocaleString() : "—"}</p>
          <p><strong>Monthly EMI (₹):</strong> {v.monthlyEmi != null ? v.monthlyEmi.toLocaleString() : "—"}</p>
          <p><strong>Investments FD/Savings (₹):</strong> {v.investmentsFdSavings != null ? v.investmentsFdSavings.toLocaleString() : "—"}</p>
          <p><strong>Bank Statement:</strong> {fileListNames(v.bankStatement)}</p>
          <p><strong>Salary Slip:</strong> {fileListNames(v.salarySlip)}</p>
          <p><strong>Rent Receipts:</strong> {fileListNames(v.rentReceipts)}</p>
          <p><strong>Other Spending Proofs:</strong> {fileListNames(v.otherSpendingProofs)}</p>
          {v.ownLand === "yes" && <p><strong>Land Details:</strong> {v.landDetails || "—"}</p>}
          {v.earnRentFromProperty === "yes" && <p><strong>Monthly Rent (₹):</strong> {v.monthlyRent != null ? v.monthlyRent.toLocaleString() : "—"}</p>}
          {v.soldProperty === "yes" && <p><strong>Sale Agreement:</strong> {fileListNames(v.saleAgreementFile)}</p>}
          <p><strong>Run a business:</strong> {v.runBusiness ?? "—"}</p>
          {v.agriculturalIncome === "yes" && <p><strong>Agricultural Income Certificate:</strong> {fileListNames(v.agriculturalIncomeCertificate)}</p>}
          {v.isTrader === "yes" && <p><strong>Yearly P&amp;L Statement:</strong> {fileListNames(v.yearlyPnLStatement)}</p>}
        </CardContent>
      </Card>

      <p className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground" role="status">
        This information is collected for analysis purposes only and does not constitute tax advice.
      </p>

      <Button
        type="button"
        onClick={() => { if (typeof window !== "undefined") window.alert("Form submitted. (No data sent — frontend only.)"); }}
      >
        Submit
      </Button>
    </div>
  );
}
