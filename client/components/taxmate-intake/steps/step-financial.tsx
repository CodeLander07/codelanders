"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TaxmateIntakeFormValues } from "../schema";
import { ACCEPTED_FILE_TYPES_LIST } from "../schema";
import { Controller } from "react-hook-form";
import { Info } from "lucide-react";

function FileNames({ fileList }: { fileList?: FileList | null }) {
  if (!fileList?.length) return null;
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Selected: {Array.from(fileList).map((f) => f.name).join(", ")}
    </p>
  );
}

export function StepFinancial() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<TaxmateIntakeFormValues>();

  const ownLand = watch("ownLand");
  const earnRentFromProperty = watch("earnRentFromProperty");
  const soldProperty = watch("soldProperty");
  const runBusiness = watch("runBusiness");
  const agriculturalIncome = watch("agriculturalIncome");
  const isTrader = watch("isTrader");

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" aria-hidden />
        <span title="Informational use only">Informational use only. PDF or image files accepted.</span>
      </p>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Numeric Information</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="annualIncome">Annual Income (₹)</Label>
            <Input
              id="annualIncome"
              type="number"
              min={0}
              {...register("annualIncome")}
              aria-invalid={!!errors.annualIncome}
            />
            {errors.annualIncome && (
              <p className="text-sm text-destructive" role="alert">{errors.annualIncome.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlyEmi">Monthly EMI (₹)</Label>
            <Input
              id="monthlyEmi"
              type="number"
              min={0}
              {...register("monthlyEmi")}
              aria-invalid={!!errors.monthlyEmi}
            />
            {errors.monthlyEmi && (
              <p className="text-sm text-destructive" role="alert">{errors.monthlyEmi.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="investmentsFdSavings">Investments (FD / Savings) (₹)</Label>
            <Input
              id="investmentsFdSavings"
              type="number"
              min={0}
              {...register("investmentsFdSavings")}
              aria-invalid={!!errors.investmentsFdSavings}
            />
            {errors.investmentsFdSavings && (
              <p className="text-sm text-destructive" role="alert">{errors.investmentsFdSavings.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Documents</h3>
        <div className="space-y-2">
          <Label htmlFor="bankStatement">Bank Statement</Label>
          <Input
            id="bankStatement"
            type="file"
            accept={ACCEPTED_FILE_TYPES_LIST}
            {...register("bankStatement")}
            aria-invalid={!!errors.bankStatement}
          />
          <FileNames fileList={watch("bankStatement")} />
          {errors.bankStatement && (
            <p className="text-sm text-destructive" role="alert">{errors.bankStatement.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="salarySlip">Salary Slip</Label>
          <Input
            id="salarySlip"
            type="file"
            accept={ACCEPTED_FILE_TYPES_LIST}
            {...register("salarySlip")}
            aria-invalid={!!errors.salarySlip}
          />
          <FileNames fileList={watch("salarySlip")} />
          {errors.salarySlip && (
            <p className="text-sm text-destructive" role="alert">{errors.salarySlip.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rentReceipts">Rent Receipts (optional)</Label>
          <Input id="rentReceipts" type="file" accept={ACCEPTED_FILE_TYPES_LIST} {...register("rentReceipts")} />
          <FileNames fileList={watch("rentReceipts")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="otherSpendingProofs">Other Spending Proofs (optional)</Label>
          <Input id="otherSpendingProofs" type="file" accept={ACCEPTED_FILE_TYPES_LIST} {...register("otherSpendingProofs")} />
          <FileNames fileList={watch("otherSpendingProofs")} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Conditional Information</h3>

        <div className="space-y-2">
          <Label>Do you own land?</Label>
          <Controller
            name="ownLand"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="ownLand-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="ownLand-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
          {ownLand === "yes" && (
            <div className="mt-2">
              <Label htmlFor="landDetails">Land details</Label>
              <Input id="landDetails" {...register("landDetails")} placeholder="Describe land holdings" />
              {errors.landDetails && (
                <p className="text-sm text-destructive" role="alert">{errors.landDetails.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Do you earn rent from property?</Label>
          <Controller
            name="earnRentFromProperty"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="earnRent-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="earnRent-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
          {earnRentFromProperty === "yes" && (
            <div className="mt-2">
              <Label htmlFor="monthlyRent">Monthly Rent (₹)</Label>
              <Input id="monthlyRent" type="number" min={0} {...register("monthlyRent")} />
              {errors.monthlyRent && (
                <p className="text-sm text-destructive" role="alert">{errors.monthlyRent.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Have you sold any property?</Label>
          <Controller
            name="soldProperty"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="soldProperty-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="soldProperty-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
          {soldProperty === "yes" && (
            <div className="mt-2">
              <Label htmlFor="saleAgreementFile">Sale Agreement</Label>
              <Input
                id="saleAgreementFile"
                type="file"
                accept={ACCEPTED_FILE_TYPES_LIST}
                {...register("saleAgreementFile")}
              />
              <FileNames fileList={watch("saleAgreementFile")} />
              {errors.saleAgreementFile && (
                <p className="text-sm text-destructive" role="alert">{errors.saleAgreementFile.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Do you run a business?</Label>
          <Controller
            name="runBusiness"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="runBusiness-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="runBusiness-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Do you earn agricultural income?</Label>
          <Controller
            name="agriculturalIncome"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="agricultural-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="agricultural-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
          {agriculturalIncome === "yes" && (
            <div className="mt-2">
              <Label htmlFor="agriculturalIncomeCertificate">Income Certificate</Label>
              <Input
                id="agriculturalIncomeCertificate"
                type="file"
                accept={ACCEPTED_FILE_TYPES_LIST}
                {...register("agriculturalIncomeCertificate")}
              />
              <FileNames fileList={watch("agriculturalIncomeCertificate")} />
              {errors.agriculturalIncomeCertificate && (
                <p className="text-sm text-destructive" role="alert">{errors.agriculturalIncomeCertificate.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Are you a trader?</Label>
          <Controller
            name="isTrader"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="yes" id="isTrader-yes" />
                  <span>Yes</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="no" id="isTrader-no" />
                  <span>No</span>
                </label>
              </RadioGroup>
            )}
          />
          {isTrader === "yes" && (
            <div className="mt-2">
              <Label htmlFor="yearlyPnLStatement">Yearly Profit &amp; Loss Statement</Label>
              <Input
                id="yearlyPnLStatement"
                type="file"
                accept={ACCEPTED_FILE_TYPES_LIST}
                {...register("yearlyPnLStatement")}
              />
              <FileNames fileList={watch("yearlyPnLStatement")} />
              {errors.yearlyPnLStatement && (
                <p className="text-sm text-destructive" role="alert">{errors.yearlyPnLStatement.message}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
