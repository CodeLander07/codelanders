"use client";

import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  ReceiptText,
  Banknote,
  PiggyBank,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Stacked Horizontal Bar ─────────────────────────────────────────────────
function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="space-y-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full rounded-full transition-all"
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[11px] text-white/40">
              {s.label} — {((s.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────
interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: "up" | "down";
  loading?: boolean;
}
function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  loading,
}: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/2 p-4 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/35">
          {label}
        </p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconBg
          )}
        >
          <Icon size={14} className={iconColor} />
        </div>
      </div>
      {loading ? (
        <div className="h-7 w-28 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="text-2xl font-semibold tabular-nums text-white">{value}</p>
      )}
      {sub && (
        <p className="flex items-center gap-1 text-[11px] text-white/35">
          {trend === "up" && <ArrowUpRight size={11} className="text-red-400" />}
          {trend === "down" && (
            <ArrowDownRight size={11} className="text-green-400" />
          )}
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Tax Slab Row ─────────────────────────────────────────────────────────────
function SlabRow({
  range,
  rate,
  tax,
  highlight,
}: {
  range: string;
  rate: string;
  tax: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 px-4 py-2.5 text-xs",
        highlight
          ? "rounded-lg border border-purple-500/20 bg-purple-500/5 text-white/80"
          : "border-b border-white/4 text-white/40"
      )}
    >
      <span>{range}</span>
      <span className="text-center">{rate}</span>
      <span className="text-right tabular-nums">{tax}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TaxOverviewPage() {
  const { user } = useAuthStore();
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .post("/tax/calculate", {
        age: 30,
        income_details: { salary: 1200000 },
        deductions: { section_80c: 150000, section_80d: 25000 },
      })
      .then((r) => setTaxData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const gross = taxData?.gross_income ?? 1200000;
  const deductions = 175000;
  const taxable = gross - deductions;
  const recTax =
    taxData?.recommendation === "Old Regime"
      ? taxData?.old_regime?.tax_liability
      : taxData?.new_regime?.tax_liability;
  const tds = 85000;
  const refundOrDue = tds && recTax ? tds - recTax : null;

  const stackSegments = [
    { label: "Salary", value: gross * 0.72, color: "#818cf8" },
    { label: "Deductions", value: deductions, color: "#34d399" },
    { label: "Tax Payable", value: recTax ?? 120000, color: "#fb923c" },
    { label: "Net Take-home", value: gross - (recTax ?? 120000) - deductions, color: "#94a3b8" },
  ];

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-white">Tax Overview</h1>
        <p className="text-xs text-white/35 mt-0.5">
          FY 2024-25 · Complete tax summary for {user?.full_name?.split(" ")[0] ?? "your"}
           account
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Annual Income"
          value={`₹${(gross / 100000).toFixed(1)}L`}
          sub="Gross income"
          icon={Banknote}
          iconColor="text-blue-400"
          iconBg="bg-blue-400/10"
          loading={loading}
        />
        <SummaryCard
          label="Total Deductions"
          value={`₹${deductions.toLocaleString("en-IN")}`}
          sub="Sec 80C, 80D"
          icon={PiggyBank}
          iconColor="text-green-400"
          iconBg="bg-green-400/10"
          trend="down"
        />
        <SummaryCard
          label="Taxable Income"
          value={`₹${taxable.toLocaleString("en-IN")}`}
          sub="After deductions"
          icon={ReceiptText}
          iconColor="text-amber-400"
          iconBg="bg-amber-400/10"
          loading={loading}
        />
        <SummaryCard
          label="Est. Tax Payable"
          value={recTax ? `₹${recTax.toLocaleString("en-IN")}` : "—"}
          sub={`${taxData?.recommendation ?? "—"}`}
          icon={Percent}
          iconColor="text-purple-400"
          iconBg="bg-purple-400/10"
          loading={loading}
        />
        <SummaryCard
          label={refundOrDue && refundOrDue > 0 ? "Refund Expected" : "Amount Due"}
          value={
            refundOrDue !== null
              ? `₹${Math.abs(refundOrDue).toLocaleString("en-IN")}`
              : "—"
          }
          sub="TDS vs payable"
          icon={refundOrDue && refundOrDue > 0 ? TrendingDown : TrendingUp}
          iconColor={refundOrDue && refundOrDue > 0 ? "text-green-400" : "text-red-400"}
          iconBg={refundOrDue && refundOrDue > 0 ? "bg-green-400/10" : "bg-red-400/10"}
          loading={loading}
        />
      </div>

      {/* Income allocation stacked bar */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white/85">
            Income Allocation Overview
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            Proportional breakdown of gross income — FY 2024-25
          </p>
        </div>
        <StackedBar segments={stackSegments} />
      </div>

      {/* Tax computation + slab breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Computation detail */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-5">
          <p className="text-sm font-semibold text-white/85 mb-4">
            Tax Computation — {taxData?.recommendation ?? "Recommended Regime"}
          </p>
          <div className="space-y-3">
            {[
              {
                label: "Gross Total Income",
                value: `₹${gross.toLocaleString("en-IN")}`,
                muted: false,
              },
              {
                label: "Less: Chapter VI-A Deductions",
                value: `− ₹${deductions.toLocaleString("en-IN")}`,
                muted: true,
              },
              {
                label: "Taxable Income",
                value: `₹${taxable.toLocaleString("en-IN")}`,
                muted: false,
              },
              {
                label: "Tax on Total Income",
                value: recTax
                  ? `₹${recTax.toLocaleString("en-IN")}`
                  : "—",
                muted: false,
              },
              {
                label: "Less: TDS Deducted",
                value: `− ₹${tds.toLocaleString("en-IN")}`,
                muted: true,
              },
              {
                label:
                  refundOrDue && refundOrDue > 0
                    ? "Refund Receivable"
                    : "Self-Assessment Tax Due",
                value:
                  refundOrDue !== null
                    ? `₹${Math.abs(refundOrDue).toLocaleString("en-IN")}`
                    : "—",
                muted: false,
                accent:
                  refundOrDue && refundOrDue > 0
                    ? "text-green-400"
                    : "text-red-400",
              },
            ].map((row) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-center justify-between border-b border-white/4 pb-2",
                  row.muted ? "opacity-50" : ""
                )}
              >
                <span className="text-xs text-white/60">{row.label}</span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    (row as any).accent ?? "text-white/85"
                  )}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slab breakdown */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-5">
          <p className="text-sm font-semibold text-white/85 mb-1">
            Tax Slab Breakdown
          </p>
          <p className="text-xs text-white/30 mb-4">
            New Regime — FY 2024-25 slabs
          </p>
          <div>
            <div className="grid grid-cols-3 px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
              <span>Income Range</span>
              <span className="text-center">Rate</span>
              <span className="text-right">Tax</span>
            </div>
            <SlabRow range="₹0 – ₹3L" rate="Nil" tax="₹0" />
            <SlabRow range="₹3L – ₹7L" rate="5%" tax="₹20,000" />
            <SlabRow range="₹7L – ₹10L" rate="10%" tax="₹30,000" />
            <SlabRow
              range="₹10L – ₹12L"
              rate="15%"
              tax="₹30,000"
              highlight
            />
            <SlabRow range="₹12L – ₹15L" rate="20%" tax="—" />
            <SlabRow range="Above ₹15L" rate="30%" tax="—" />
          </div>
          <div className="mt-4 rounded-lg border border-white/5 bg-white/3 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-white/40">Effective Tax Rate</span>
            <span className="text-sm font-semibold text-purple-400 tabular-nums">
              {loading || !recTax
                ? "—"
                : `${((recTax / gross) * 100).toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Regime comparison mini strip */}
      {!loading && taxData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Old */}
          <div
            className={cn(
              "rounded-xl border p-4",
              taxData.recommendation === "Old Regime"
                ? "border-purple-500/30 bg-purple-500/5"
                : "border-white/5 bg-white/2"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white/70">Old Regime</p>
              {taxData.recommendation === "Old Regime" && (
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums text-white">
              ₹{taxData.old_regime.tax_liability.toLocaleString("en-IN")}
            </p>
            <div className="mt-2 h-1 rounded-full bg-white/5">
              <div
                className="h-1 rounded-full bg-purple-500"
                style={{
                  width: `${Math.min(
                    100,
                    (taxData.old_regime.tax_liability / gross) * 400
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-white/25">
              ETR{" "}
              {((taxData.old_regime.tax_liability / gross) * 100).toFixed(2)}%
            </p>
          </div>
          {/* New */}
          <div
            className={cn(
              "rounded-xl border p-4",
              taxData.recommendation === "New Regime"
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-white/5 bg-white/2"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-white/70">New Regime</p>
              {taxData.recommendation === "New Regime" && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Recommended
                </span>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums text-white">
              ₹{taxData.new_regime.tax_liability.toLocaleString("en-IN")}
            </p>
            <div className="mt-2 h-1 rounded-full bg-white/5">
              <div
                className="h-1 rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    100,
                    (taxData.new_regime.tax_liability / gross) * 400
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-white/25">
              ETR{" "}
              {((taxData.new_regime.tax_liability / gross) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
