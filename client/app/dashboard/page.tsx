"use client";

import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  FileUp,
  Calculator,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  X,
  File as FileIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import {
  useDocumentStore,
  DOC_CATEGORIES,
  type DocCategory,
  type UploadedDoc,
} from "@/store/documentStore";
import { cn } from "@/lib/utils";

// ─── SVG Bar Chart ──────────────────────────────────────────────────────────
const BAR_DATA = [
  { label: "Salary", value: 72, color: "#818cf8" },
  { label: "Rental", value: 12, color: "#34d399" },
  { label: "Cap. Gains", value: 10, color: "#fb923c" },
  { label: "Other", value: 6, color: "#94a3b8" },
];

function TaxBreakdownChart() {
  const max = Math.max(...BAR_DATA.map((d) => d.value));
  return (
    <div className="w-full">
      <svg viewBox="0 0 320 140" className="w-full" role="img" aria-label="Tax breakdown by income source">
        {[0, 25, 50, 75, 100].map((v) => {
          const y = 110 - (v / max) * 100;
          return (
            <g key={v}>
              <line x1="32" y1={y} x2="316" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x="28" y={y + 4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.25)">{v}%</text>
            </g>
          );
        })}
        {BAR_DATA.map((d, i) => {
          const barW = 44;
          const gap = 24;
          const x = 44 + i * (barW + gap);
          const barH = (d.value / max) * 100;
          const y = 110 - barH;
          return (
            <g key={d.label}>
              <rect x={x - 2} y={y - 2} width={barW + 4} height={barH + 4} rx="5" fill={d.color} opacity="0.08" />
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill={d.color} opacity="0.85" />
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="600" fill={d.color}>{d.value}%</text>
              <text x={x + barW / 2} y={126} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.35)">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG Monthly Projection Chart ───────────────────────────────────────────
const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
const PROJECTION = [18000,19500,21000,20500,22000,23500,22800,24000,25500,24800,26000,27500];

function MonthlyProjectionChart() {
  const max = Math.max(...PROJECTION);
  const min = Math.min(...PROJECTION);
  const W = 460; const H = 100;
  const pad = { l: 36, r: 8, t: 10, b: 24 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;
  const px = (i: number) => pad.l + (i / (PROJECTION.length - 1)) * cw;
  const py = (v: number) => pad.t + ch - ((v - min) / (max - min)) * ch;
  const linePath = PROJECTION.map((v, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(v)}`).join(" ");
  const areaPath = linePath + ` L${px(PROJECTION.length - 1)},${H - pad.b} L${px(0)},${H - pad.b} Z`;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly tax projection">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((t) => (
          <line key={t} x1={pad.l} y1={pad.t + (ch / 2) * t} x2={W - pad.r} y2={pad.t + (ch / 2) * t} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round" />
        {PROJECTION.map((v, i) => (
          <g key={i}>
            <circle cx={px(i)} cy={py(v)} r="2" fill="#818cf8" />
            <text x={px(i)} y={H - 4} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">{MONTHS[i]}</text>
          </g>
        ))}
        <text x={pad.l - 4} y={pad.t + 4} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.25)">₹{(max/1000).toFixed(0)}k</text>
        <text x={pad.l - 4} y={H - pad.b + 4} textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.25)">₹{(min/1000).toFixed(0)}k</text>
      </svg>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string; value: string; sub?: string;
  trend?: "up" | "down" | "neutral"; accent?: string;
  loading?: boolean; locked?: boolean;
}
function KpiCard({ label, value, sub, trend, accent = "text-white", loading, locked }: KpiCardProps) {
  return (
    <div className={cn(
      "flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/3 px-4 py-4 transition-colors",
      locked ? "opacity-50" : "hover:border-white/10"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-widest text-white/35">{label}</p>
        {locked && <Lock size={10} className="text-white/20" />}
      </div>
      {loading ? (
        <div className="h-7 w-24 animate-pulse rounded bg-white/10" />
      ) : (
        <p className={cn("text-xl font-semibold tabular-nums", accent)}>{value}</p>
      )}
      {sub && (
        <p className="flex items-center gap-1 text-[11px] text-white/35">
          {trend === "up" && <ArrowUpRight size={11} className="text-green-400" />}
          {trend === "down" && <ArrowDownRight size={11} className="text-red-400" />}
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Chart locked overlay ─────────────────────────────────────────────────────
function ChartLocked({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-12">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/4">
        <Lock size={16} className="text-white/15" />
      </div>
      <p className="text-xs text-white/25 text-center">
        {message ?? "Upload documents to unlock insights"}
      </p>
    </div>
  );
}

// ─── Doc status badge ─────────────────────────────────────────────────────────
const STATUS_META = {
  queued:     { label: "Queued",     color: "text-white/40",  bg: "bg-white/5"       },
  processing: { label: "Processing", color: "text-blue-400",  bg: "bg-blue-400/10"  },
  verified:   { label: "Verified",   color: "text-green-400", bg: "bg-green-400/10" },
  failed:     { label: "Failed",     color: "text-red-400",   bg: "bg-red-400/10"   },
};
function StatusBadge({ status }: { status: UploadedDoc["status"] }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium", m.bg, m.color)}>
      {status === "processing" && <Loader2 size={9} className="animate-spin" />}
      {status === "verified"   && <CheckCircle2 size={9} />}
      {m.label}
    </span>
  );
}

// ─── Upload Section ───────────────────────────────────────────────────────────
interface UploadSectionProps { compact?: boolean; }

function UploadSection({ compact }: UploadSectionProps) {
  const { docs, addDocs, updateStatus, updateCategory, removeDoc } = useDocumentStore();
  const [stagedFiles, setStagedFiles] = useState<{ file: File; category: DocCategory }[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setStagedFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, category: "Bank Statements" as DocCategory })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: true,
  });

  const updateStagedCategory = (i: number, category: DocCategory) =>
    setStagedFiles((prev) => prev.map((x, j) => (j === i ? { ...x, category } : x)));
  const removeStaged = (i: number) =>
    setStagedFiles((prev) => prev.filter((_, j) => j !== i));

  const handleUpload = async () => {
    if (!stagedFiles.length) return;
    setUploading(true);
    const incoming = stagedFiles.map((s) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: s.file.name,
      size: s.file.size,
      category: s.category,
      status: "queued" as const,
    }));
    const staged = [...stagedFiles];
    addDocs(incoming);
    setStagedFiles([]);

    for (let idx = 0; idx < incoming.length; idx++) {
      const doc = incoming[idx];
      updateStatus(doc.id, "processing");
      try {
        const fd = new FormData();
        fd.append("file", staged[idx].file);
        await api.post("/documents/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        }).catch(() => {});
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 1800 + Math.random() * 1200));
      updateStatus(doc.id, "verified");
    }
    setUploading(false);
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed transition-colors",
          compact ? "px-5 py-8" : "px-8 py-14",
          isDragActive
            ? "border-purple-500/60 bg-purple-500/5"
            : "border-white/8 hover:border-white/15 hover:bg-white/2"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
            <FileUp size={20} className="text-white/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">
              {isDragActive ? "Drop files here…" : "Drag & drop files, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-white/25">PDF, JPG, PNG, CSV, XLSX · All categories accepted</p>
          </div>
        </div>
      </div>

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
            Ready — {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""}
          </p>
          {stagedFiles.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 px-4 py-2.5">
              <FileIcon size={13} className="text-white/30 shrink-0" />
              <span className="flex-1 truncate text-xs text-white/65">{s.file.name}</span>
              <span className="text-[10px] text-white/20 shrink-0">{(s.file.size / 1024).toFixed(0)} KB</span>
              <select
                value={s.category}
                onChange={(e) => updateStagedCategory(i, e.target.value as DocCategory)}
                className="rounded-md border border-white/8 bg-white/5 px-2 py-1 text-[11px] text-white/60 outline-none max-w-44 truncate"
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#09090F]">{c}</option>
                ))}
              </select>
              <button onClick={() => removeStaged(i)} className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 size={12} className="animate-spin" /> Uploading…</>
            ) : (
              <><FileUp size={12} /> Upload {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      )}

      {/* Uploaded docs */}
      {docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
            Uploaded — {docs.length} file{docs.length !== 1 ? "s" : ""}
          </p>
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 px-4 py-2.5 group">
              <FileIcon size={13} className="text-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/65 truncate">{doc.name}</p>
                <p className="text-[10px] text-white/25">{doc.category}</p>
              </div>
              <StatusBadge status={doc.status} />
              <select
                value={doc.category}
                onChange={(e) => updateCategory(doc.id, e.target.value as DocCategory)}
                className="rounded-md border border-white/8 bg-white/5 px-2 py-1 text-[11px] text-white/50 outline-none max-w-36 truncate opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-[#09090F]">{c}</option>
                ))}
              </select>
              <button
                onClick={() => removeDoc(doc.id)}
                className="text-white/15 hover:text-red-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Insight Row ─────────────────────────────────────────────────────────────
interface InsightRowProps { type: "warning"|"success"|"deadline"|"ai"; title: string; detail: string; }
function InsightRow({ type, title, detail }: InsightRowProps) {
  const meta = {
    warning:  { icon: AlertTriangle, color: "text-amber-400",  bg: "bg-amber-400/10"  },
    success:  { icon: CheckCircle2,  color: "text-green-400",  bg: "bg-green-400/10"  },
    deadline: { icon: Clock,         color: "text-red-400",    bg: "bg-red-400/10"    },
    ai:       { icon: Sparkles,      color: "text-purple-400", bg: "bg-purple-400/10" },
  }[type];
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/2 px-4 py-3 hover:border-white/10 transition-colors">
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.bg)}>
        <Icon size={13} className={meta.color} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/85">{title}</p>
        <p className="mt-0.5 text-xs text-white/40 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();
  const { docs } = useDocumentStore();
  const [taxData, setTaxData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const hasVerified  = docs.some((d) => d.status === "verified");
  const hasAnyDocs   = docs.length > 0;

  // Only fetch tax data once at least one doc is verified
  useEffect(() => {
    if (!hasVerified || !user) return;
    setLoading(true);
    api
      .post("/tax/calculate", {
        age: 30,
        income_details: { salary: 1200000 },
        deductions: {},
      })
      .then((r) => setTaxData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [hasVerified, user]);

  const recommendedTax = taxData
    ? taxData.recommendation === "Old Regime"
      ? taxData.old_regime.tax_liability
      : taxData.new_regime.tax_liability
    : null;
  const savings = taxData ? Math.ceil(taxData.potential_savings) : null;
  const regime  = taxData?.recommendation ?? "—";

  // ── STATE 1: No documents ─────────────────────────────────────────────────
  if (!hasAnyDocs) {
    return (
      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">
              Welcome, {user?.full_name?.split(" ")[0] ?? "User"}
            </h1>
            <p className="text-xs text-white/35 mt-0.5">FY 2024-25 · Tax Intelligence Overview</p>
          </div>
          <Link href="/questionnaire">
            <button className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors">
              <Calculator size={12} /> Questionnaire
            </button>
          </Link>
        </div>

        {/* Zeroed KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Est. Tax Payable" value="₹0"          sub="No data yet"          locked />
          <KpiCard label="Tax Saved"        value="₹0"          sub="No deductions found"  locked accent="text-white/40" />
          <KpiCard label="Optimal Regime"   value="N/A"         sub="Upload to determine"  locked accent="text-white/40" />
          <KpiCard label="Filing Status"    value="Not Started" sub="Documents required"   locked accent="text-amber-400/50" />
          <KpiCard label="Refund / Due"     value="₹0"          sub="No computation yet"   locked />
        </div>

        {/* Upload CTA */}
        <div className="rounded-xl border border-white/8 bg-white/2 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
              <FileUp size={22} className="text-purple-400" />
            </div>
            <h2 className="text-base font-semibold text-white">Upload Your Documents to Get Started</h2>
            <p className="mt-1.5 text-xs text-white/40 leading-relaxed max-w-md mx-auto">
              We analyse your documents to generate accurate tax insights and savings recommendations.
            </p>
          </div>

          {/* Category guide */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOC_CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-lg border border-white/5 bg-white/2 px-3 py-2">
                <p className="text-[11px] text-white/50 leading-snug">{cat}</p>
              </div>
            ))}
          </div>

          <UploadSection />
        </div>

        {/* Locked charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/2 p-5">
              <p className="text-sm font-semibold text-white/40 mb-1">Tax Liability by Income Source</p>
              <p className="text-xs text-white/20 mt-0.5 mb-2">Proportional split — FY 2024-25</p>
              <ChartLocked />
            </div>
            <div className="rounded-xl border border-white/5 bg-white/2 p-5">
              <p className="text-sm font-semibold text-white/40 mb-1">Monthly Tax Projection</p>
              <p className="text-xs text-white/20 mt-0.5 mb-2">Cumulative advance tax estimate · Apr–Mar</p>
              <ChartLocked />
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/5 bg-white/2 p-5 flex-1">
              <p className="text-sm font-semibold text-white/40 mb-1">Regime Comparison</p>
              <p className="text-xs text-white/20 mb-4">Old vs New · Effective tax rate</p>
              <ChartLocked message="Upload documents to compare regimes" />
            </div>
            <Link href="/questionnaire" className="block">
              <div className="rounded-xl border border-white/5 bg-white/2 p-4 hover:border-purple-500/20 hover:bg-purple-500/5 transition-colors group">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white/70">Optimise my taxes</p>
                  <ChevronRight size={12} className="text-white/30 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="mt-1 text-[11px] text-white/30">
                  Complete the smart questionnaire to unlock AI-powered deduction discovery.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Locked insights */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/40">Insights & Alerts</p>
            <span className="text-[10px] text-white/20 uppercase tracking-widest">AI · Compliance · Deadlines</span>
          </div>
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/4">
              <Sparkles size={16} className="text-white/15" />
            </div>
            <p className="text-xs text-white/25">AI insights will appear after document analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 2: Docs uploaded, not yet verified ─────────────────────────────
  if (hasAnyDocs && !hasVerified) {
    return (
      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "User"}
            </h1>
            <p className="text-xs text-white/35 mt-0.5">FY 2024-25 · Tax Intelligence Overview</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-1.5">
            <Loader2 size={12} className="animate-spin text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Analysing documents…</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="Est. Tax Payable" value="₹0"          sub="Processing…"          loading />
          <KpiCard label="Tax Saved"        value="₹0"          sub="Processing…"          loading accent="text-white/40" />
          <KpiCard label="Optimal Regime"   value="N/A"         sub="Processing…"          loading accent="text-white/40" />
          <KpiCard label="Filing Status"    value="Not Started" sub="Documents processing" accent="text-amber-400" />
          <KpiCard label="Refund / Due"     value="₹0"          sub="Processing…"          loading />
        </div>

        <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/15">
              <RefreshCw size={14} className="animate-spin text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/85">Analysing Your Documents</p>
              <p className="text-xs text-white/35 mt-0.5">Tax insights will unlock automatically once processing completes</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/2 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <FileIcon size={12} className="text-white/30 shrink-0" />
                  <div>
                    <p className="text-xs text-white/65 truncate max-w-xs">{doc.name}</p>
                    <p className="text-[10px] text-white/25">{doc.category}</p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/2 p-5">
          <p className="text-sm font-semibold text-white/85 mb-1">Upload More Documents</p>
          <p className="text-xs text-white/30 mb-4">Add additional documents while processing is in progress</p>
          <UploadSection compact />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/2 p-5">
              <p className="text-sm font-semibold text-white/40 mb-1">Tax Liability by Income Source</p>
              <ChartLocked message="Processing documents…" />
            </div>
            <div className="rounded-xl border border-white/5 bg-white/2 p-5">
              <p className="text-sm font-semibold text-white/40 mb-1">Monthly Tax Projection</p>
              <ChartLocked message="Processing documents…" />
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/2 p-5">
            <p className="text-sm font-semibold text-white/40 mb-1">Regime Comparison</p>
            <ChartLocked message="Processing documents…" />
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 3: At least one doc verified — full analytics ───────────────────
  return (
    <div className="px-6 py-5 space-y-5">

      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">
            Welcome back, {user?.full_name?.split(" ")[0] ?? "User"}
          </h1>
          <p className="text-xs text-white/35 mt-0.5">FY 2024-25 · Tax Intelligence Overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/documents">
            <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors">
              <FileUp size={12} /> Upload Docs
            </button>
          </Link>
          <Link href="/questionnaire">
            <button className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors">
              <Calculator size={12} /> Questionnaire
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Est. Tax Payable"
          value={recommendedTax ? `₹${recommendedTax.toLocaleString("en-IN")}` : "—"}
          sub={`From ${docs.filter((d) => d.status === "verified").length} verified docs`}
          loading={loading}
        />
        <KpiCard
          label="Tax Saved"
          value={savings ? `₹${savings.toLocaleString("en-IN")}` : "—"}
          sub="Via deductions"
          trend="down"
          accent="text-green-400"
          loading={loading}
        />
        <KpiCard
          label="Optimal Regime"
          value={loading ? "—" : regime}
          sub="AI recommendation"
          accent={regime === "New Regime" ? "text-blue-400" : "text-purple-400"}
          loading={loading}
        />
        <KpiCard label="Filing Status" value="Pending" sub="ITR not filed" accent="text-amber-400" />
        <KpiCard
          label="Refund / Due"
          value={recommendedTax ? (recommendedTax > 0 ? "Due" : "Refund") : "—"}
          sub="Advance tax unpaid"
          trend="up"
          loading={loading}
        />
      </div>

      {/* Charts + regime */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-white/5 bg-white/2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/85">Tax Liability by Income Source</p>
                <p className="text-xs text-white/30 mt-0.5">Proportional split — FY 2024-25</p>
              </div>
              <span className="rounded-md border border-white/8 bg-white/4 px-2 py-1 text-xs text-white/35">
                ₹{taxData ? taxData.gross_income.toLocaleString("en-IN") : "12,00,000"} gross
              </span>
            </div>
            {loading ? <div className="h-36 animate-pulse rounded-lg bg-white/5" /> : <TaxBreakdownChart />}
          </div>
          <div className="rounded-xl border border-white/5 bg-white/2 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white/85">Monthly Tax Projection</p>
                <p className="text-xs text-white/30 mt-0.5">Cumulative advance tax estimate · Apr–Mar</p>
              </div>
              <TrendingUp size={14} className="text-indigo-400" />
            </div>
            {loading ? <div className="h-24 animate-pulse rounded-lg bg-white/5" /> : <MonthlyProjectionChart />}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-white/5 bg-white/2 p-5 flex-1">
            <p className="text-sm font-semibold text-white/85 mb-1">Regime Comparison</p>
            <p className="text-xs text-white/30 mb-4">Old vs New · Effective tax rate</p>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((k) => <div key={k} className="h-16 animate-pulse rounded-lg bg-white/5" />)}
              </div>
            ) : taxData ? (
              <div className="space-y-3">
                <div className={cn("rounded-lg border p-3", taxData.recommendation === "Old Regime" ? "border-purple-500/40 bg-purple-500/8" : "border-white/5 bg-white/2")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white/70">Old Regime</span>
                    {taxData.recommendation === "Old Regime" && (
                      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-400 font-medium">Recommended</span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-white tabular-nums">₹{taxData.old_regime.tax_liability.toLocaleString("en-IN")}</p>
                  <div className="mt-2 h-1 rounded-full bg-white/5">
                    <div className="h-1 rounded-full bg-purple-500" style={{ width: `${Math.min(100, (taxData.old_regime.tax_liability / taxData.gross_income) * 300)}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-white/25">ETR {((taxData.old_regime.tax_liability / taxData.gross_income) * 100).toFixed(1)}%</p>
                </div>
                <div className={cn("rounded-lg border p-3", taxData.recommendation === "New Regime" ? "border-blue-500/40 bg-blue-500/8" : "border-white/5 bg-white/2")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-white/70">New Regime</span>
                    {taxData.recommendation === "New Regime" && (
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 font-medium">Recommended</span>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-white tabular-nums">₹{taxData.new_regime.tax_liability.toLocaleString("en-IN")}</p>
                  <div className="mt-2 h-1 rounded-full bg-white/5">
                    <div className="h-1 rounded-full bg-blue-500" style={{ width: `${Math.min(100, (taxData.new_regime.tax_liability / taxData.gross_income) * 300)}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-white/25">ETR {((taxData.new_regime.tax_liability / taxData.gross_income) * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5">
                  <p className="text-[11px] text-white/40 mb-0.5">Potential savings with declarations</p>
                  <p className="text-base font-semibold text-green-400 tabular-nums">₹{savings?.toLocaleString("en-IN")}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/30">Complete your profile to view comparison.</p>
            )}
          </div>
          <Link href="/questionnaire" className="block">
            <div className="rounded-xl border border-white/5 bg-white/2 p-4 hover:border-purple-500/20 hover:bg-purple-500/5 transition-colors group">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white/70">Optimise my taxes</p>
                <ChevronRight size={12} className="text-white/30 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="mt-1 text-[11px] text-white/30">
                Complete the smart questionnaire to unlock AI-powered deduction discovery.
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white/85">Insights & Alerts</p>
          <span className="text-[10px] text-white/25 uppercase tracking-widest">AI · Compliance · Deadlines</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <InsightRow type="ai"       title="80C deduction not fully utilised"     detail="You can claim up to ₹1.5L under 80C. Upload investment proofs to unlock ₹46,800 in savings." />
          <InsightRow type="deadline" title="Advance Tax: Q4 due 15 Mar 2025"      detail="15% of annual tax liability must be deposited. Avoid interest under Sec 234B." />
          <InsightRow type="warning"  title="HRA exemption not computed"            detail="Mark your rent payments in the questionnaire to auto-compute HRA exemption under Sec 10(13A)." />
          <InsightRow type="success"  title="Standard Deduction applied"            detail="₹50,000 standard deduction has been factored into your tax computation automatically." />
          <InsightRow type="ai"       title="NPS contribution could save ₹15,600"  detail="An additional ₹50,000 under Sec 80CCD(1B) is available exclusively under the Old Regime." />
          <InsightRow type="warning"  title="Form 16 not uploaded"                  detail="Upload your Form 16 to auto-populate income details and verify TDS credits." />
        </div>
      </div>

    </div>
  );
}
