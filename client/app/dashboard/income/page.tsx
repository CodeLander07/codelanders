"use client";

import { useState } from "react";
import {
  Briefcase,
  Building2,
  Home,
  TrendingUp,
  MoreHorizontal,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface IncomeSource {
  id: string;
  type: "salary" | "freelance" | "rental" | "capital_gains" | "other";
  label: string;
  fy2425: number;
  fy2324: number;
  taxImpact: number;
}

const TYPE_META = {
  salary:        { icon: Briefcase,  color: "text-indigo-400",  bg: "bg-indigo-400/10",  badge: "bg-indigo-400/15 text-indigo-400" },
  freelance:     { icon: MoreHorizontal, color: "text-purple-400", bg: "bg-purple-400/10", badge: "bg-purple-400/15 text-purple-400" },
  rental:        { icon: Home,        color: "text-amber-400",   bg: "bg-amber-400/10",   badge: "bg-amber-400/15 text-amber-400"   },
  capital_gains: { icon: TrendingUp,  color: "text-green-400",  bg: "bg-green-400/10",  badge: "bg-green-400/15 text-green-400"  },
  other:         { icon: Building2,   color: "text-slate-400",  bg: "bg-slate-400/10",  badge: "bg-slate-400/15 text-slate-400"  },
};

const TYPE_LABELS: Record<IncomeSource["type"], string> = {
  salary:        "Salary",
  freelance:     "Freelance / Business",
  rental:        "Rental Income",
  capital_gains: "Capital Gains",
  other:         "Other Income",
};

// ─── Inline Bar Chart ─────────────────────────────────────────────────────────
function MiniBarChart({ fy2425, fy2324 }: { fy2425: number; fy2324: number }) {
  const max = Math.max(fy2425, fy2324, 1);
  return (
    <div className="flex items-end gap-1 h-10">
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="w-3 rounded-t bg-indigo-500/70"
          style={{ height: `${(fy2324 / max) * 36}px` }}
        />
        <span className="text-[9px] text-white/20">23-24</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="w-3 rounded-t bg-purple-400"
          style={{ height: `${(fy2425 / max) * 36}px` }}
        />
        <span className="text-[9px] text-white/20">24-25</span>
      </div>
    </div>
  );
}

// ─── EditableRow ──────────────────────────────────────────────────────────────
function SourceRow({
  source,
  onSave,
  onDelete,
}: {
  source: IncomeSource;
  onSave: (s: IncomeSource) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(source);
  const meta = TYPE_META[source.type];
  const Icon = meta.icon;
  const yoy = source.fy2324
    ? ((source.fy2425 - source.fy2324) / source.fy2324) * 100
    : 0;

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="border-b border-white/5 bg-white/2">
        <td className="px-4 py-2.5" colSpan={2}>
          <select
            value={draft.type}
            onChange={(e) =>
              setDraft({
                ...draft,
                type: e.target.value as IncomeSource["type"],
                label: TYPE_LABELS[e.target.value as IncomeSource["type"]],
              })
            }
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#09090F]">
                {v}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-2.5 text-xs">
          <input
            type="number"
            value={draft.fy2425}
            onChange={(e) =>
              setDraft({ ...draft, fy2425: +e.target.value })
            }
            className="w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums outline-none"
          />
        </td>
        <td className="px-4 py-2.5 text-xs">
          <input
            type="number"
            value={draft.fy2324}
            onChange={(e) =>
              setDraft({ ...draft, fy2324: +e.target.value })
            }
            className="w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white tabular-nums outline-none"
          />
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex h-6 w-6 items-center justify-center rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
            >
              <Check size={11} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-white/40 hover:text-white"
            >
              <X size={11} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group border-b border-white/5 hover:bg-white/2 transition-colors">
      <td className="px-4 py-3">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            meta.bg
          )}
        >
          <Icon size={13} className={meta.color} />
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium",
            meta.badge
          )}
        >
          {source.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs font-semibold tabular-nums text-white/80">
        ₹{source.fy2425.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 text-xs tabular-nums text-white/35">
        ₹{source.fy2324.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <MiniBarChart fy2425={source.fy2425} fy2324={source.fy2324} />
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums",
              yoy >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {yoy >= 0 ? "+" : ""}
            {yoy.toFixed(1)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs tabular-nums text-amber-400">
        ₹{source.taxImpact.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1.5">
          <button
            onClick={() => setEditing(true)}
            className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-white/30 hover:text-white transition-colors"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={() => onDelete(source.id)}
            className="flex h-6 w-6 items-center justify-center rounded bg-white/5 text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const DEFAULT_SOURCES: IncomeSource[] = [
  { id: "1", type: "salary",        label: "Salary",               fy2425: 1200000, fy2324: 1050000, taxImpact: 89700  },
  { id: "2", type: "freelance",     label: "Freelance / Business", fy2425: 180000,  fy2324: 120000,  taxImpact: 54000  },
  { id: "3", type: "rental",        label: "Rental Income",        fy2425: 144000,  fy2324: 144000,  taxImpact: 43200  },
  { id: "4", type: "capital_gains", label: "Capital Gains",        fy2425: 75000,   fy2324: 40000,   taxImpact: 11250  },
  { id: "5", type: "other",         label: "Other Income",         fy2425: 22000,   fy2324: 18000,   taxImpact: 6600   },
];

export default function IncomePage() {
  const [sources, setSources] = useState<IncomeSource[]>(DEFAULT_SOURCES);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<IncomeSource["type"]>("other");
  const [newFy2425, setNewFy2425] = useState("");
  const [newFy2324, setNewFy2324] = useState("");

  const totalFy2425 = sources.reduce((s, x) => s + x.fy2425, 0);
  const totalFy2324 = sources.reduce((s, x) => s + x.fy2324, 0);
  const totalTax = sources.reduce((s, x) => s + x.taxImpact, 0);
  const totalYoy = totalFy2324
    ? ((totalFy2425 - totalFy2324) / totalFy2324) * 100
    : 0;

  const handleAdd = () => {
    if (!newFy2425) return;
    setSources((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: newType,
        label: TYPE_LABELS[newType],
        fy2425: +newFy2425,
        fy2324: +newFy2324 || 0,
        taxImpact: Math.round(+newFy2425 * 0.3),
      },
    ]);
    setNewFy2425("");
    setNewFy2324("");
    setShowAdd(false);
  };

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">Income Sources</h1>
          <p className="text-xs text-white/35 mt-0.5">
            FY 2024-25 · All income streams and year-wise comparison
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
        >
          <Plus size={12} /> Add Source
        </button>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Income (FY 24-25)",
            value: `₹${(totalFy2425 / 100000).toFixed(2)}L`,
            accent: "text-white",
          },
          {
            label: "Total Income (FY 23-24)",
            value: `₹${(totalFy2324 / 100000).toFixed(2)}L`,
            accent: "text-white/60",
          },
          {
            label: "YoY Growth",
            value: `${totalYoy >= 0 ? "+" : ""}${totalYoy.toFixed(1)}%`,
            accent: totalYoy >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            label: "Total Tax Impact",
            value: `₹${(totalTax / 100000).toFixed(2)}L`,
            accent: "text-amber-400",
          },
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

      {/* Table */}
      <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white/85">
            Income Breakdown
          </p>
          <span className="text-[10px] uppercase tracking-widest text-white/25">
            {sources.length} source{sources.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["", "Source", "FY 2024-25", "FY 2023-24", "YoY Trend", "Tax Impact", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  onSave={(updated) =>
                    setSources((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x))
                    )
                  }
                  onDelete={(id) =>
                    setSources((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              ))}
              {/* Totals row */}
              <tr className="border-t border-white/8 bg-white/2">
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Total
                </td>
                <td className="px-4 py-3 text-xs font-bold tabular-nums text-white">
                  ₹{totalFy2425.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-white/35">
                  ₹{totalFy2324.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-xs font-semibold tabular-nums">
                  <span
                    className={
                      totalYoy >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {totalYoy >= 0 ? "+" : ""}
                    {totalYoy.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-bold tabular-nums text-amber-400">
                  ₹{totalTax.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add source inline form */}
        {showAdd && (
          <div className="border-t border-white/5 px-5 py-4">
            <p className="text-xs font-semibold text-white/60 mb-3">
              Add New Income Source
            </p>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-white/25">
                  Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as IncomeSource["type"])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k} className="bg-[#09090F]">
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-white/25">
                  FY 2024-25 Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={newFy2425}
                  onChange={(e) => setNewFy2425(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-white/25">
                  FY 2023-24 Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="optional"
                  value={newFy2324}
                  onChange={(e) => setNewFy2324(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none w-36"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  className="rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tax impact note */}
      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 px-5 py-4">
        <p className="text-xs font-semibold text-amber-400 mb-1">
          Tax Impact Notice
        </p>
        <p className="text-xs text-white/40 leading-relaxed">
          Tax impact estimates are indicative, calculated at applicable slab
          rates. Capital gains are taxed separately under special rates (STCG
          15%, LTCG 10% above ₹1L). Rental income is eligible for a 30%
          standard deduction. Consult a CA for precise computation.
        </p>
      </div>
    </div>
  );
}
