"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
  basicDetailsSchema,
  officialDetailsSchema,
  financialSchema,
  type TaxmateIntakeFormValues,
} from "./schema";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepBasicDetails } from "./steps/step-basic-details";
import { StepOfficialDetails } from "./steps/step-official-details";
import { StepFinancial } from "./steps/step-financial";
import { StepSummary } from "./steps/step-summary";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Basic Details" },
  { id: 2, title: "Official Details" },
  { id: 3, title: "Financial Information" },
  { id: 4, title: "Summary" },
];

const defaultValues: Partial<TaxmateIntakeFormValues> = {
  fullName: "",
  age: undefined,
  mobileNumber: "",
  password: "",
  aadhaarNumber: "",
  panNumber: "",
  employmentType: undefined,
  stateOfResidence: "",
  disabilityStatus: undefined,
  annualIncome: undefined,
  monthlyEmi: undefined,
  investmentsFdSavings: undefined,
  ownLand: undefined,
  landDetails: "",
  earnRentFromProperty: undefined,
  monthlyRent: undefined,
  soldProperty: undefined,
  runBusiness: undefined,
  agriculturalIncome: undefined,
  isTrader: undefined,
};

function stepSchema(step: number) {
  switch (step) {
    case 1:
      return basicDetailsSchema;
    case 2:
      return officialDetailsSchema;
    case 3:
      return financialSchema;
    default:
      return null;
  }
}

export function TaxmateWizard() {
  const [step, setStep] = React.useState(1);
  const form = useForm<TaxmateIntakeFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const values = form.watch();
  const schema = stepSchema(step);
  const triggerStep = form.trigger;

  const isStepValid = React.useMemo(() => {
    if (!schema) return true;
    const result = schema.safeParse(values);
    return result.success;
  }, [schema, values]);

  const goNext = async () => {
    if (step < 4) {
      const fields = step === 1
        ? (["fullName", "age", "mobileNumber", "password"] as const)
        : step === 2
          ? (["aadhaarNumber", "panNumber", "employmentType", "stateOfResidence", "disabilityStatus"] as const)
          : undefined;
      if (fields) {
        const ok = await triggerStep(fields);
        if (!ok) return;
      } else if (step === 3) {
        const ok = await triggerStep();
        if (!ok) return;
      }
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));
  const goToStep = (s: number) => setStep(s);

  return (
    <FormProvider {...form}>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <ProgressIndicator currentStep={step} steps={STEPS} />
          <h2 className="text-lg font-semibold">{STEPS[step - 1].title}</h2>
        </CardHeader>
        <CardContent>
          {step === 1 && <StepBasicDetails />}
          {step === 2 && <StepOfficialDetails />}
          {step === 3 && <StepFinancial />}
          {step === 4 && <StepSummary onEditStep={goToStep} />}
        </CardContent>
        {step < 4 && (
          <CardFooter className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 1}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={step < 4 && !isStepValid}
            >
              {step === 3 ? "Review" : "Next"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </FormProvider>
  );
}

function ProgressIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { id: number; title: string }[];
}) {
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Form progress">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              s.id <= currentStep ? "bg-primary" : "bg-muted"
            )}
          />
          {i < steps.length - 1 && <span className="sr-only">{s.title}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
