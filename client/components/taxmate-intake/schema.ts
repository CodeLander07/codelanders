import { z } from "zod";

const ACCEPTED_FILE_TYPES = "application/pdf,image/jpeg,image/jpg,image/png,image/webp";

export const basicDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  age: z.coerce.number().min(18, "Must be 18 or older").max(120, "Invalid age"),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const officialDetailsSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{4}\s?\d{4}\s?\d{4}$/, "Enter valid 12-digit Aadhaar"),
  panNumber: z.string().length(10, "PAN must be 10 characters").regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format"),
  employmentType: z.enum(["salaried", "self-employed", "freelancer", "unemployed"]),
  stateOfResidence: z.string().min(1, "Select state"),
  disabilityStatus: z.enum(["yes", "no"]),
});

// FileList is browser-only; avoid reference during SSR
const fileListSchema =
  typeof FileList !== "undefined"
    ? z.instanceof(FileList)
    : (z.any() as z.ZodType<FileList>);
const requiredFileSchema = fileListSchema.refine((f) => f?.length > 0, "File is required");

export const financialSchema = z
  .object({
    annualIncome: z.coerce.number().min(0, "Must be 0 or more"),
    monthlyEmi: z.coerce.number().min(0, "Must be 0 or more"),
    investmentsFdSavings: z.coerce.number().min(0, "Must be 0 or more"),
    bankStatement: requiredFileSchema,
    salarySlip: requiredFileSchema,
    rentReceipts: fileListSchema.optional(),
    otherSpendingProofs: fileListSchema.optional(),
    ownLand: z.enum(["yes", "no"]).optional(),
    landDetails: z.string().optional(),
    earnRentFromProperty: z.enum(["yes", "no"]).optional(),
    monthlyRent: z.coerce.number().optional(),
    soldProperty: z.enum(["yes", "no"]).optional(),
    saleAgreementFile: fileListSchema.optional(),
    runBusiness: z.enum(["yes", "no"]).optional(),
    agriculturalIncome: z.enum(["yes", "no"]).optional(),
    agriculturalIncomeCertificate: fileListSchema.optional(),
    isTrader: z.enum(["yes", "no"]).optional(),
    yearlyPnLStatement: fileListSchema.optional(),
  })
  .refine(
    (data) => data.ownLand !== "yes" || (data.landDetails?.trim().length ?? 0) > 0,
    { message: "Land details required when you own land", path: ["landDetails"] }
  )
  .refine(
    (data) => data.earnRentFromProperty !== "yes" || (data.monthlyRent ?? 0) >= 0,
    { message: "Monthly rent required", path: ["monthlyRent"] }
  )
  .refine(
    (data) => data.soldProperty !== "yes" || (data.saleAgreementFile?.length ?? 0) > 0,
    { message: "Sale agreement file required when you have sold property", path: ["saleAgreementFile"] }
  )
  .refine(
    (data) => data.agriculturalIncome !== "yes" || (data.agriculturalIncomeCertificate?.length ?? 0) > 0,
    { message: "Income certificate required when you earn agricultural income", path: ["agriculturalIncomeCertificate"] }
  )
  .refine(
    (data) => data.isTrader !== "yes" || (data.yearlyPnLStatement?.length ?? 0) > 0,
    { message: "Yearly P&L statement required when you are a trader", path: ["yearlyPnLStatement"] }
  );

// Combined schema for summary (optional full validation on submit)
export const taxmateIntakeSchema = basicDetailsSchema
  .merge(officialDetailsSchema)
  .merge(financialSchema);

export type TaxmateIntakeFormValues = z.infer<typeof taxmateIntakeSchema>;
export type BasicDetailsValues = z.infer<typeof basicDetailsSchema>;
export type OfficialDetailsValues = z.infer<typeof officialDetailsSchema>;
export type FinancialValues = z.infer<typeof financialSchema>;

export const ACCEPTED_FILE_TYPES_LIST = ACCEPTED_FILE_TYPES;

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];
