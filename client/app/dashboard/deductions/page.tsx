"use client";

import { useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "used" | "partial" | "unused";

interface Deduction {
  id: string;
  section: string;
  label: string;
  description: string;
  limit: number;
  claimed: number;
  status: Status;
  hasProof: boolean;
  uploadCta?: boolean;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<Status, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  used:    { label: "Fully Used",     color: "text-green-400",  bg: "bg-green-400/10",  icon: CheckCircle2  },
  partial: { label: "Partially Used", color: "text-amber-400",  bg: "bg-amber-400/10",  icon: AlertTriangle },
  unused:  { label: "Not Claimed",    color: "text-white/30",   bg: "bg-white/5",        icon: Circle        },
};

// ─── AI Suggestions ───────────────────────────────────────────────────────────
const AI_SUGGESTIONS = [
  { section: "80CCD(1B)", saving: 15600, detail: "Additional ₹50,000 NPS contribution eligible under Old Regime." },
  { section: "80GG",      saving: 60000, detail: "If you pay rent but don't get HRA — claim up to ₹5,000/month." },
  { section: "80EEA",     saving: 15000, detail: "First-time home buyer? Additional ₹1.5L deduction on home loan interest." },
  { section: "80TTA",     saving: 3000,  detail: "Interest on savings account up to ₹10,000 is deductible." },
];

// ─── Deductions data ──────────────────────────────────────────────────────────
const DEFAULT_DEDUCTIONS: Deduction[] = [
  { id: "1", section: "80C",      label: "Sec 80C Investments",   description: "ELSS, PPF, LIC, EPF, NSC, home loan principal, tuition fees",  limit: 150000, claimed: 104000, status: "partial", hasProof: true,  uploadCta: true  },
  { id: "2", section: "80D",      label: "Health Insurance",       description: "Mediclaim premium — self & family (below 60 yrs)",              limit: 25000,  claimed: 25000,  status: "used",    hasProof: true                    },
  { id: "3", section: "HRA",      label: "House Rent Allowance",   description: "Actual HRA, 50% basic (metro) or 40% basic, rent – 10% basic",  limit: 84000,  claimed: 0,      status: "unused",  hasProof: false, uploadCta: true  },
  { id: "4", section: "STD",      label: "Standard Deduction",     description: "Flat deduction available to all salaried employees",             limit: 50000,  claimed: 50000,  status: "used",    hasProof: false                   },
  { id: "5", section: "80E",      label: "Education Loan Interest", description: "Interest on loan taken for higher education",                  limit: 999999, claimed: 0,      status: "unused",  hasProof: false, uploadCta: false  },
  { id: "6", section: "80G",      label: "Donations",              description: "Donations to approved funds and charitable institutions",         limit: 100000, claimed: 10000,  status: "partial", hasProof: false, uploadCta: true  },
  { id: "7", section: "80CCD(1)", label: "NPS Employee Contribution", description: "Up to 10% of salary; already sub-set of 80C ₹1.5L cap",    limit: 120000, claimed: 120000, status: "used",    hasProof: true                    },
  { id: "8", section: "LTA",      label: "Leave Travel Allowance", description: "Actual travel expenditure for domestic travel, 2 trips in 4yrs", limit: 40000,  claimed: 0,      status: "unused",  hasProof: false, uploadCta: true  },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, status }: { pct: number; status: Status }) {
  const color =
    status === "used"    ? "bg-green-400"  :
    status === "partial" ? "bg-amber-400"  :
                           "bg-white/15";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div
        className={cn("h-1.5 rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── Deduction Card ───────────────────────────────────────────────────────────
function DeductionCard({ d }: { d: Deduction }) {
  const [expanded, setExpanded] = useState(false);
  const pct = d.limit < 999999 ? (d.claimed / d.limit) * 100 : 100;
  const remaining = d.limit < 999999 ? d.limit - d.claimed : 0;
  const meta = STATUS_META[d.status];
  const StatusIcon = meta.icon;

  return (
    <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden transition-colors hover:border-white/10">
      {/* Card header */}
      <button
        className="w-full flex items-start gap-4 px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {d.section}
            </span>
            <p className="text-sm font-medium text-white/85 truncate">
              {d.label}
            </p>
          </div>

          {/* Progress bar + amounts */}
          <div className="space-y-1.5">
            <ProgressBar pct={pct} status={d.status} />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/40">
                ₹{d.claimed.toLocaleString("en-IN")} claimed
                {d.limit < 999999
                  ? ` / ₹${d.limit.toLocaleString("en-IN")} limit`
                  : ""}
              </span>
              {remaining > 0 && (
                <span className="text-amber-400">
                  ₹{remaining.toLocaleString("en-IN")} remaining
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1", meta.bg)}>
            <StatusIcon size={11} className={meta.color} />
            <span className={cn("text-[10px] font-medium", meta.color)}>
              {meta.label}
            </span>
          </div>
          {expanded ? (
            <ChevronUp size={14} className="text-white/20" />
          ) : (
            <ChevronDown size={14} className="text-white/20" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-3 bg-white/1">
          <p className="text-xs text-white/40 leading-relaxed">{d.description}</p>
          <div className="flex flex-wrap gap-2">
            {d.uploadCta && (
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/8 transition-colors">
                <Upload size={11} /> Upload Proof
              </button>
            )}
            {d.hasProof && (
              <span className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-1.5 text-xs text-green-400">
                <CheckCircle2 size={11} /> Proof uploaded
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DeductionsPage() {
  const deductions = DEFAULT_DEDUCTIONS;
  const totalClaimed = deductions.reduce((s, d) => s + d.claimed, 0);
  const totalLimit = deductions
    .filter((d) => d.limit < 999999)
    .reduce((s, d) => s + d.limit, 0);
  const totalSavings = Math.round(totalClaimed * 0.3);
  const unusedCount = deductions.filter((d) => d.status === "unused").length;

  const grouped = {
    used:    deductions.filter((d) => d.status === "used"),
    partial: deductions.filter((d) => d.status === "partial"),
    unused:  deductions.filter((d) => d.status === "unused"),
  };

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-white">
          Deductions & Exemptions
        </h1>
        <p className="text-xs text-white/35 mt-0.5">
          FY 2024-25 · Section-wise deduction tracker
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Claimed",    value: `₹${(totalClaimed / 1000).toFixed(0)}K`,   accent: "text-white"       },
          { label: "Available Limit",  value: `₹${(totalLimit / 100000).toFixed(1)}L`,   accent: "text-white/60"    },
          { label: "Tax Savings Est.", value: `₹${(totalSavings / 1000).toFixed(0)}K`,   accent: "text-green-400"   },
          { label: "Unclaimed Sections", value: `${unusedCount}`,                          accent: "text-amber-400"   },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-white/5 bg-white/2 px-4 py-4"
          >
            <p className="text-[11px] font-medium uppercase tracking-widest text-white/35 mb-1.5">
              {k.label}
            </p>
            <p className={cn("text-xl font-semibold tabular-nums", k.accent)}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-400/15">
            <Sparkles size={13} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/85">AI Deduction Suggestions</p>
            <p className="text-xs text-white/30">
              Potential additional savings identified by TaxMate AI
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AI_SUGGESTIONS.map((s) => (
            <div
              key={s.section}
              className="flex items-start gap-3 rounded-lg border border-purple-500/15 bg-purple-500/5 px-4 py-3"
            >
              <span className="mt-0.5 rounded border border-purple-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 shrink-0">
                {s.section}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-white/70 leading-relaxed">{s.detail}</p>
                <p className="mt-1 text-[11px] font-semibold text-green-400">
                  Saves ₹{s.saving.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grouped deduction cards */}
      {(["partial", "used", "unused"] as Status[]).map((status) =>
        grouped[status].length > 0 ? (
          <div key={status}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status === "used"    ? "bg-green-400" :
                  status === "partial" ? "bg-amber-400"  :
                                         "bg-white/20"
                )}
              />
              <p className="text-xs font-semibold uppercase tracking-widest text-white/35">
                {STATUS_META[status].label} ({grouped[status].length})
              </p>
            </div>
            <div className="space-y-2">
              {grouped[status].map((d) => (
                <DeductionCard key={d.id} d={d} />
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
