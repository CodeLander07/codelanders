"use client";

import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ChevronDown,
  Info,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Comparison Table Row ─────────────────────────────────────────────────────
function CompareRow({
  label,
  old,
  newR,
  tooltip,
  highlight,
}: {
  label: string;
  old: string;
  newR: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center gap-4 px-4 py-2.5 text-xs",
        highlight ? "rounded-lg bg-white/3" : "border-b border-white/4"
      )}
    >
      <div className="flex items-center gap-1 text-white/50">
        {label}
        {tooltip && (
          <span className="relative">
            <button
              onMouseEnter={() => setShow(true)}
              onMouseLeave={() => setShow(false)}
              className="text-white/20 hover:text-white/50"
            >
              <Info size={11} />
            </button>
            {show && (
              <span className="absolute bottom-full left-1/2 z-10 mb-1 w-48 -translate-x-1/2 rounded-lg border border-white/10 bg-[#12121a] px-3 py-2 text-[10px] text-white/60 shadow-xl">
                {tooltip}
              </span>
            )}
          </span>
        )}
      </div>
      <span className="text-center font-medium tabular-nums text-white/75">
        {old}
      </span>
      <span className="text-center font-medium tabular-nums text-white/75">
        {newR}
      </span>
    </div>
  );
}

// ─── Feature item ─────────────────────────────────────────────────────────────
function FeatureItem({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/55">
      {available ? (
        <CheckCircle2 size={12} className="text-green-400 shrink-0" />
      ) : (
        <X size={12} className="text-red-400/50 shrink-0" />
      )}
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegimePage() {
  const { user } = useAuthStore();
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(1200000);
  const [deductions80c, setDeductions80c] = useState(150000);
  const [deductions80d, setDeductions80d] = useState(25000);

  const fetchData = () => {
    setLoading(true);
    api
      .post("/tax/calculate", {
        age: 30,
        income_details: { salary: income },
        deductions: { section_80c: deductions80c, section_80d: deductions80d },
      })
      .then((r) => setTaxData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const gross = taxData?.gross_income ?? income;
  const oldTax = taxData?.old_regime?.tax_liability ?? 0;
  const newTax = taxData?.new_regime?.tax_liability ?? 0;
  const savings = taxData?.potential_savings ?? Math.abs(oldTax - newTax);
  const recommended = taxData?.recommendation ?? (oldTax < newTax ? "Old Regime" : "New Regime");
  const isOldBetter = recommended === "Old Regime";

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-white">Regime Comparison</h1>
        <p className="text-xs text-white/35 mt-0.5">
          Old vs New tax regime · FY 2024-25 · AI-powered recommendation
        </p>
      </div>

      {/* Interactive calculator */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-5">
        <p className="text-sm font-semibold text-white/85 mb-4">
          Scenario Calculator
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-white/30">
              Annual Income (₹)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(+e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white tabular-nums outline-none w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-white/30">
              80C Investments (₹)
            </label>
            <input
              type="number"
              value={deductions80c}
              onChange={(e) => setDeductions80c(+e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white tabular-nums outline-none w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-white/30">
              80D Health Insurance (₹)
            </label>
            <input
              type="number"
              value={deductions80d}
              onChange={(e) => setDeductions80d(+e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white tabular-nums outline-none w-36"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg bg-purple-600/80 px-4 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Calculating…" : "Recalculate"}
          </button>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      {!loading && taxData && (
        <div
          className={cn(
            "rounded-xl border px-5 py-4 flex items-center justify-between",
            isOldBetter
              ? "border-purple-500/30 bg-purple-500/8"
              : "border-blue-500/30 bg-blue-500/8"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                isOldBetter ? "bg-purple-400/15" : "bg-blue-400/15"
              )}
            >
              <Sparkles
                size={14}
                className={isOldBetter ? "text-purple-400" : "text-blue-400"}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">
                AI Recommends:{" "}
                <span
                  className={
                    isOldBetter ? "text-purple-400" : "text-blue-400"
                  }
                >
                  {recommended}
                </span>
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                You save ₹{Math.ceil(savings).toLocaleString("en-IN")} more by
                choosing {recommended}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isOldBetter
                ? "bg-purple-500/20 text-purple-400"
                : "bg-blue-500/20 text-blue-400"
            )}
          >
            {isOldBetter ? "More deductions available" : "Simpler, lower rates"}
          </span>
        </div>
      )}

      {/* Side-by-side regime cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Old Regime */}
        <div
          className={cn(
            "rounded-xl border p-5 space-y-4",
            isOldBetter
              ? "border-purple-500/30 bg-purple-500/5"
              : "border-white/5 bg-white/2"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white/85">Old Regime</p>
              <p className="text-xs text-white/30 mt-0.5">
                With all deductions
              </p>
            </div>
            {isOldBetter && (
              <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-[10px] font-semibold text-purple-400">
                ✦ Recommended
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-10 animate-pulse rounded-lg bg-white/5" />
          ) : (
            <div>
              <p className="text-3xl font-bold tabular-nums text-white">
                ₹{oldTax.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-white/30 mt-1">
                ETR {gross > 0 ? ((oldTax / gross) * 100).toFixed(2) : 0}%
              </p>
            </div>
          )}

          <div className="h-1.5 rounded-full bg-white/5">
            <div
              className="h-1.5 rounded-full bg-purple-500 transition-all"
              style={{
                width: `${Math.min(100, gross > 0 ? (oldTax / gross) * 300 : 0)}%`,
              }}
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <FeatureItem label="Section 80C deductions (up to ₹1.5L)" available />
            <FeatureItem label="Section 80D health insurance" available />
            <FeatureItem label="HRA exemption" available />
            <FeatureItem label="LTA exemption" available />
            <FeatureItem label="Interest on home loan (Sec 24)" available />
            <FeatureItem label="NPS additional deduction 80CCD(1B)" available />
            <FeatureItem label="Flat standard deduction ₹50,000" available />
          </div>
        </div>

        {/* New Regime */}
        <div
          className={cn(
            "rounded-xl border p-5 space-y-4",
            !isOldBetter
              ? "border-blue-500/30 bg-blue-500/5"
              : "border-white/5 bg-white/2"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white/85">New Regime</p>
              <p className="text-xs text-white/30 mt-0.5">
                Lower slabs, fewer deductions
              </p>
            </div>
            {!isOldBetter && (
              <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-400">
                ✦ Recommended
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-10 animate-pulse rounded-lg bg-white/5" />
          ) : (
            <div>
              <p className="text-3xl font-bold tabular-nums text-white">
                ₹{newTax.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-white/30 mt-1">
                ETR {gross > 0 ? ((newTax / gross) * 100).toFixed(2) : 0}%
              </p>
            </div>
          )}

          <div className="h-1.5 rounded-full bg-white/5">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all"
              style={{
                width: `${Math.min(100, gross > 0 ? (newTax / gross) * 300 : 0)}%`,
              }}
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <FeatureItem label="Section 80C deductions" available={false} />
            <FeatureItem label="Section 80D health insurance" available={false} />
            <FeatureItem label="HRA exemption" available={false} />
            <FeatureItem label="LTA exemption" available={false} />
            <FeatureItem label="Interest on home loan (Sec 24)" available={false} />
            <FeatureItem label="NPS additional deduction 80CCD(1B)" available={false} />
            <FeatureItem label="Flat standard deduction ₹75,000" available />
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white/85">
            Side-by-Side Comparison
          </p>
        </div>
        <div>
          {/* Header */}
          <div className="grid grid-cols-3 px-4 py-2.5 border-b border-white/5 bg-white/2">
            <span className="text-[10px] uppercase tracking-widest text-white/25">
              Parameter
            </span>
            <span className="text-center text-[10px] uppercase tracking-widest text-white/25">
              Old Regime
            </span>
            <span className="text-center text-[10px] uppercase tracking-widest text-white/25">
              New Regime
            </span>
          </div>
          <CompareRow
            label="Tax Payable"
            old={loading ? "—" : `₹${oldTax.toLocaleString("en-IN")}`}
            newR={loading ? "—" : `₹${newTax.toLocaleString("en-IN")}`}
            highlight
          />
          <CompareRow
            label="Effective Tax Rate"
            old={loading || !gross ? "—" : `${((oldTax / gross) * 100).toFixed(2)}%`}
            newR={loading || !gross ? "—" : `${((newTax / gross) * 100).toFixed(2)}%`}
          />
          <CompareRow
            label="Gross Income"
            old={`₹${(gross / 100000).toFixed(1)}L`}
            newR={`₹${(gross / 100000).toFixed(1)}L`}
          />
          <CompareRow
            label="Standard Deduction"
            old="₹50,000"
            newR="₹75,000"
            tooltip="FY 2024-25: New regime standard deduction raised to ₹75,000"
          />
          <CompareRow
            label="80C Eligible"
            old={`₹${deductions80c.toLocaleString("en-IN")}`}
            newR="Not allowed"
          />
          <CompareRow
            label="Net Savings vs other"
            old={
              isOldBetter
                ? `Save ₹${Math.ceil(savings).toLocaleString("en-IN")}`
                : "—"
            }
            newR={
              !isOldBetter
                ? `Save ₹${Math.ceil(savings).toLocaleString("en-IN")}`
                : "—"
            }
            highlight
          />
        </div>
      </div>

      {/* When to choose guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-purple-500/15 bg-purple-500/5 p-5">
          <p className="text-xs font-semibold text-purple-400 mb-3">
            Choose Old Regime if…
          </p>
          <ul className="space-y-1.5">
            {[
              "You fully utilise ₹1.5L under 80C",
              "You pay significant HRA or rent",
              "You have home loan interest deductions",
              "80D premium is high (family cover)",
              "You invest in NPS for 80CCD(1B)",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-white/50">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-purple-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-5">
          <p className="text-xs font-semibold text-blue-400 mb-3">
            Choose New Regime if…
          </p>
          <ul className="space-y-1.5">
            {[
              "You don't invest in tax-saving instruments",
              "Income is below ₹7L (nil tax with rebate)",
              "Your employer covers health insurance",
              "You prefer simplified ITR filing",
              "You're in the 30% slab with minimal deductions",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-white/50">
                <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
