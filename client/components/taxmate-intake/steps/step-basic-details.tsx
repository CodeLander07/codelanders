"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TaxmateIntakeFormValues } from "../schema";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepBasicDetails() {
  const { register, formState: { errors } } = useFormContext<TaxmateIntakeFormValues>();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" {...register("fullName")} placeholder="Enter full name" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} />
        {errors.fullName && <p id="fullName-error" className="text-sm text-destructive" role="alert">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="age">Age</Label>
        <Input id="age" type="number" min={18} max={120} {...register("age")} placeholder="18" aria-invalid={!!errors.age} aria-describedby={errors.age ? "age-error" : undefined} />
        {errors.age && <p id="age-error" className="text-sm text-destructive" role="alert">{errors.age.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="mobileNumber">Mobile Number</Label>
        <Input id="mobileNumber" type="tel" {...register("mobileNumber")} placeholder="10-digit number starting with 6-9" aria-invalid={!!errors.mobileNumber} aria-describedby={errors.mobileNumber ? "mobileNumber-error" : "mobileNumber-hint"} />
        <p id="mobileNumber-hint" className="text-xs text-muted-foreground">Enter 10-digit Indian mobile number (e.g. 9876543210)</p>
        {errors.mobileNumber && <p id="mobileNumber-error" className="text-sm text-destructive" role="alert">{errors.mobileNumber.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} {...register("password")} placeholder="Min 8 characters" className="pr-10" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</p>}
      </div>
    </div>
  );
}
