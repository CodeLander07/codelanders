"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TaxmateIntakeFormValues } from "../schema";
import { INDIAN_STATES } from "../schema";
import { Controller } from "react-hook-form";
import { useCallback } from "react";
import { Info } from "lucide-react";

const EMPLOYMENT_OPTIONS: { value: TaxmateIntakeFormValues["employmentType"]; label: string }[] = [
  { value: "salaried", label: "Salaried" },
  { value: "self-employed", label: "Self-employed" },
  { value: "freelancer", label: "Freelancer" },
  { value: "unemployed", label: "Unemployed" },
];

function formatAadhaar(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function StepOfficialDetails() {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<TaxmateIntakeFormValues>();

  const aadhaarValue = watch("aadhaarNumber");
  const onAadhaarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue("aadhaarNumber", formatAadhaar(e.target.value), { shouldValidate: true });
    },
    [setValue]
  );

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4" aria-hidden />
        <span title="Informational use only">This section is for informational use only.</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
        <Input
          id="aadhaarNumber"
          type="text"
          inputMode="numeric"
          maxLength={14}
          value={aadhaarValue ?? ""}
          onChange={onAadhaarChange}
          placeholder="XXXX XXXX XXXX"
          aria-invalid={!!errors.aadhaarNumber}
          aria-describedby={errors.aadhaarNumber ? "aadhaarNumber-error" : undefined}
        />
        {errors.aadhaarNumber && (
          <p id="aadhaarNumber-error" className="text-sm text-destructive" role="alert">
            {errors.aadhaarNumber.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="panNumber">PAN Number</Label>
        <Input
          id="panNumber"
          {...register("panNumber", {
            onChange: (e) => setValue("panNumber", (e.target.value as string).toUpperCase(), { shouldValidate: true }),
          })}
          placeholder="ABCDE1234F"
          className="uppercase"
          maxLength={10}
          aria-invalid={!!errors.panNumber}
          aria-describedby={errors.panNumber ? "panNumber-error" : undefined}
        />
        <p className="text-xs text-muted-foreground">10-character PAN (letters auto-uppercase)</p>
        {errors.panNumber && (
          <p id="panNumber-error" className="text-sm text-destructive" role="alert">
            {errors.panNumber.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="employmentType">Employment Type</Label>
        <Controller
          name="employmentType"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <SelectTrigger id="employmentType" aria-invalid={!!errors.employmentType}>
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value!} value={opt.value!}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.employmentType && (
          <p className="text-sm text-destructive" role="alert">
            {errors.employmentType.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="stateOfResidence">State of Residence</Label>
        <Controller
          name="stateOfResidence"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <SelectTrigger id="stateOfResidence" aria-invalid={!!errors.stateOfResidence}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.stateOfResidence && (
          <p className="text-sm text-destructive" role="alert">
            {errors.stateOfResidence.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Disability Status</Label>
        <Controller
          name="disabilityStatus"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              className="flex gap-4"
              aria-invalid={!!errors.disabilityStatus}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="yes" id="disability-yes" />
                <span>Yes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="no" id="disability-no" />
                <span>No</span>
              </label>
            </RadioGroup>
          )}
        />
        {errors.disabilityStatus && (
          <p className="text-sm text-destructive" role="alert">
            {errors.disabilityStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
