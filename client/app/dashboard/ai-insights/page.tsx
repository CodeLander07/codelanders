"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type Priority = "high" | "medium" | "low";
type InsightType = "optimization" | "warning" | "deadline" | "compliance" | "ai";

interface Insight {
  id: string;
  type: InsightType;
  priority: Priority;
  title: string;
  summary: string;
  detail: string;
  saving?: number;
  action?: { label: string; href: string };
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<InsightType, { icon: React.ElementType; color: string; bg: string }> = {
  optimization: { icon: TrendingUp,    color: "text-green-400",  bg: "bg-green-400/10"  },
  warning:      { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-400/10"  },
  deadline:     { icon: Clock,         color: "text-red-400",    bg: "bg-red-400/10"    },
  compliance:   { icon: CheckCircle2,  color: "text-blue-400",   bg: "bg-blue-400/10"   },
  ai:           { icon: Sparkles,      color: "text-purple-400", bg: "bg-purple-400/10" },
};

const PRIORITY_META: Record<Priority, { label: string; dot: string; badge: string }> = {
  high:   { label: "High",   dot: "bg-red-400",    badge: "bg-red-400/15 text-red-400"    },
  medium: { label: "Medium", dot: "bg-amber-400",  badge: "bg-amber-400/15 text-amber-400"},
  low:    { label: "Low",    dot: "bg-white/20",   badge: "bg-white/8 text-white/35"      },
};

// ─── All insights ─────────────────────────────────────────────────────────────
const INSIGHTS: Insight[] = [
  {
    id: "1",
    type: "ai",
    priority: "high",
    title: "80C deduction ₹46,000 still unclaimed",
    summary: "You have ₹46,000 remaining under Sec 80C. Invest before 31 March.",
    detail: "Your current 80C investments stand at ₹1,04,000 against the ₹1,50,000 limit. You can invest ₹46,000 more in ELSS mutual funds, NSC, 5-year bank FD, or increase LIC premium to fully utilise this deduction. At your 30% slab rate, this saves ₹14,260 in tax.",
    saving: 14260,
    action: { label: "View Deductions", href: "/dashboard/deductions" },
  },
  {
    id: "2",
    type: "deadline",
    priority: "high",
    title: "Advance Tax Q4 due 15 March 2025",
    summary: "Final instalment of advance tax for FY 2024-25 is due.",
    detail: "Under Section 234B, if you've not paid at least 90% of your advance tax liability for the year, you'll pay 1% simple interest per month on the shortfall. Q4 payment should be 100% of your estimated liability minus advance tax already paid in Q1–Q3. Missing this deadline after self-assessment can attract Sec 234A interest too.",
    action: { label: "View Tax Overview", href: "/dashboard/tax-overview" },
  },
  {
    id: "3",
    type: "optimization",
    priority: "high",
    title: "NPS 80CCD(1B) can save ₹15,600",
    summary: "An additional ₹50,000 NPS investment qualifies under Old Regime.",
    detail: "Section 80CCD(1B) allows an exclusive deduction of ₹50,000 for contributions to the National Pension System — over and above the ₹1.5L 80C limit. At the 30% slab rate, this translates to ₹15,600 in tax savings. This benefit is available only under the Old Tax Regime. Tier-I NPS is eligible; Tier-II is not.",
    saving: 15600,
    action: { label: "Regime Comparison", href: "/dashboard/regime" },
  },
  {
    id: "4",
    type: "warning",
    priority: "medium",
    title: "HRA exemption not computed",
    summary: "Rent paid not declared — missing HRA benefit.",
    detail: "If you live in rented accommodation and receive HRA from your employer, you can claim an exemption under Section 10(13A). The exemption is the minimum of: (a) actual HRA received, (b) rent paid minus 10% of basic salary, (c) 50% of basic salary for metros or 40% for non-metros. Submit your rent receipts and landlord PAN (if annual rent > ₹1L) to claim this.",
    action: { label: "Update Income", href: "/dashboard/income" },
  },
  {
    id: "5",
    type: "warning",
    priority: "medium",
    title: "Form 16 not uploaded",
    summary: "Upload Form 16 to auto-verify TDS and income details.",
    detail: "Form 16 is issued by your employer by 15 June for the previous FY. It contains Part A (TDS deducted and deposited with the government) and Part B (salary breakup and deductions). Uploading it lets TaxMate AI pre-populate your ITR, verify TDS credits against 26AS, and flag discrepancies automatically.",
    action: { label: "Upload Documents", href: "/dashboard/documents" },
  },
  {
    id: "6",
    type: "compliance",
    priority: "medium",
    title: "Annual Information Statement not reviewed",
    summary: "AIS may have unreported income — reconcile before filing.",
    detail: "The Annual Information Statement (AIS) aggregates all financial transactions reported to the Income Tax Department — including interest income, dividend, mutual fund redemptions, property sale, and more. Any discrepancy between your ITR and AIS may trigger a notice. Download your AIS from the IT portal and cross-verify all entries.",
  },
  {
    id: "7",
    type: "optimization",
    priority: "low",
    title: "Sec 80TTA: Savings account interest deduction",
    summary: "Up to ₹10,000 from savings account interest is deductible.",
    detail: "Under Section 80TTA, interest earned from savings accounts (not fixed deposits) in banks, post offices, and cooperative societies is deductible up to ₹10,000 per year for individuals and HUFs below 60 years. Senior citizens can claim up to ₹50,000 under Sec 80TTB, covering both savings and FD interest.",
    saving: 3000,
  },
  {
    id: "8",
    type: "compliance",
    priority: "low",
    title: "Verify 26AS TDS credits",
    summary: "Ensure all TDS deductions are reflected in Form 26AS.",
    detail: "Form 26AS is the consolidated tax statement showing all TDS deducted across employers, banks, and clients. If a deductor hasn't filed their TDS return correctly, your credit may not appear, leading to a tax demand. Check your 26AS on the IT portal and reconcile with TDS certificates received.",
  },
];

// ─── Insight Card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const typeMeta = TYPE_META[insight.type];
  const priorityMeta = PRIORITY_META[insight.priority];
  const Icon = typeMeta.icon;

  return (
    <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden hover:border-white/10 transition-colors">
      <button
        className="w-full flex items-start gap-4 px-5 py-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            typeMeta.bg
          )}
        >
          <Icon size={14} className={typeMeta.color} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-medium text-white/85">{insight.title}</p>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                priorityMeta.badge
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", priorityMeta.dot)}
              />
              {priorityMeta.label}
            </span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            {insight.summary}
          </p>
          {insight.saving && (
            <p className="mt-1.5 text-[11px] font-semibold text-green-400">
              Potential saving: ₹{insight.saving.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 mt-0.5 text-white/20">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 bg-white/1 space-y-3">
          <p className="text-xs text-white/50 leading-relaxed">{insight.detail}</p>
          {insight.action && (
            <Link
              href={insight.action.href}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            >
              {insight.action.label}
              <ArrowRight size={11} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AIInsightsPage() {
  const [filter, setFilter] = useState<Priority | "all">("all");

  const filtered =
    filter === "all" ? INSIGHTS : INSIGHTS.filter((i) => i.priority === filter);

  const highCount   = INSIGHTS.filter((i) => i.priority === "high").length;
  const mediumCount = INSIGHTS.filter((i) => i.priority === "medium").length;
  const lowCount    = INSIGHTS.filter((i) => i.priority === "low").length;
  const totalSaving = INSIGHTS.filter((i) => i.saving).reduce((s, i) => s + (i.saving ?? 0), 0);

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">AI Insights</h1>
          <p className="text-xs text-white/35 mt-0.5">
            Personalised tax intelligence — updated daily
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5">
          <Sparkles size={12} className="text-purple-400" />
          <span className="text-xs text-purple-400 font-medium">
            {INSIGHTS.length} insights active
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "High Priority",       value: highCount.toString(),                        accent: "text-red-400"    },
          { label: "Medium Priority",     value: mediumCount.toString(),                      accent: "text-amber-400" },
          { label: "Low Priority",        value: lowCount.toString(),                         accent: "text-white/50"  },
          { label: "Total Savings Found", value: `₹${totalSaving.toLocaleString("en-IN")}`,  accent: "text-green-400" },
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

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "high", "medium", "low"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize",
              filter === p
                ? "bg-white/10 text-white"
                : "text-white/35 hover:text-white/60 hover:bg-white/5"
            )}
          >
            {p === "all" ? `All (${INSIGHTS.length})` : `${p.charAt(0).toUpperCase() + p.slice(1)} (${INSIGHTS.filter((i) => i.priority === p).length})`}
          </button>
        ))}
      </div>

      {/* Insight cards */}
      <div className="space-y-2">
        {filtered.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
