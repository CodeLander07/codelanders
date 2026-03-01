"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/lib/api";
import {
  FileUp,
  File as FileIcon,
  FileText,
  X,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  FolderOpen,
  AlertTriangle,
  Cpu,
  ScanText,
  BarChart2,
  Brain,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  useDocumentStore,
  selectIsInitialized,
  type UploadedDoc,
  type PipelineStage,
  type BackendPipelineResult,
} from "@/store/documentStore";
import { cn } from "@/lib/utils";

// ─── Pipeline stage metadata ──────────────────────────────────────────────────

const STAGE_META: Record<PipelineStage, {
  label: string;
  icon:  React.ElementType;
  color: string;
  bg:    string;
  spin?: boolean;
}> = {
  queued:      { label: "Queued",       icon: Clock,        color: "text-white/40",   bg: "bg-white/5"         },
  ocr:         { label: "Reading…",     icon: ScanText,     color: "text-blue-400",   bg: "bg-blue-500/10",    spin: true },
  validating:  { label: "Validating…",  icon: ShieldCheck,  color: "text-blue-400",   bg: "bg-blue-500/10",    spin: true },
  calculating: { label: "Calculating…", icon: BarChart2,    color: "text-purple-400", bg: "bg-purple-500/10",  spin: true },
  analyzing:   { label: "AI Analysis…", icon: Brain,        color: "text-indigo-400", bg: "bg-indigo-500/10",  spin: true },
  complete:    { label: "Verified",      icon: CheckCircle2, color: "text-emerald-400",bg: "bg-emerald-500/10" },
  failed:      { label: "Failed",        icon: AlertTriangle,color: "text-red-400",    bg: "bg-red-500/10"     },
};

/** Ordered steps shown in the pipeline progress bar */
const PIPELINE_STEPS: { stage: PipelineStage; label: string; icon: React.ElementType }[] = [
  { stage: "ocr",         label: "OCR",       icon: ScanText    },
  { stage: "validating",  label: "Validate",  icon: ShieldCheck },
  { stage: "calculating", label: "Calculate", icon: BarChart2   },
  { stage: "analyzing",   label: "AI",        icon: Brain       },
  { stage: "complete",    label: "Done",      icon: CheckCircle2 },
];

const STEP_ORDER: PipelineStage[] = ["queued", "ocr", "validating", "calculating", "analyzing", "complete"];
function stageIndex(s: PipelineStage) { return STEP_ORDER.indexOf(s); }

// ─── Pipeline progress bar ────────────────────────────────────────────────────

function PipelineProgress({ stage }: { stage: PipelineStage }) {
  if (stage === "failed") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <AlertTriangle size={12} />
        <span>Processing failed</span>
      </div>
    );
  }
  const currentIdx = stageIndex(stage);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STEPS.map((step, i) => {
        const stepIdx = stageIndex(step.stage);
        const done    = currentIdx >  stepIdx;
        const active  = currentIdx === stepIdx && stage !== "complete";
        const Icon    = step.icon;
        return (
          <div key={step.stage} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all",
              done   ? "bg-emerald-500/15 text-emerald-400" :
              active ? "bg-blue-500/15 text-blue-400" :
                       "text-white/20"
            )}>
              <Icon size={10} className={active ? "animate-pulse" : ""} />
              <span>{step.label}</span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ChevronRight size={10} className={done ? "text-white/20" : "text-white/10"} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Calculations mini-card ───────────────────────────────────────────────────

function CalculationsCard({ calculations }: { calculations: Record<string, unknown> | null }) {
  if (!calculations || calculations.status === "skipped" || calculations.status === "error") return null;
  const gross  = calculations.gross_income as number | undefined;
  const oldTax = (calculations.old_regime as Record<string, unknown> | undefined)?.tax_liability as number | undefined;
  const newTax = (calculations.new_regime as Record<string, unknown> | undefined)?.tax_liability as number | undefined;
  const recom  = calculations.recommendation as string | undefined;
  if (!gross) return null;
  const fmt = (v: number) => "₹" + new Intl.NumberFormat("en-IN").format(Math.round(v));
  return (
    <div className="mt-2 rounded-lg border border-white/6 bg-white/3 px-3 py-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
      <div><p className="text-white/30">Gross Income</p><p className="text-white/75 font-semibold tabular-nums">{fmt(gross)}</p></div>
      <div><p className="text-white/30">Old Regime</p><p className="text-amber-400/80 font-semibold tabular-nums">{oldTax !== undefined ? fmt(oldTax) : "—"}</p></div>
      <div><p className="text-white/30">New Regime</p><p className="text-blue-400/80 font-semibold tabular-nums">{newTax !== undefined ? fmt(newTax) : "—"}</p></div>
      <div><p className="text-white/30">Recommended</p><p className="text-emerald-400 font-semibold">{recom ?? "—"}</p></div>
    </div>
  );
}

// ─── Insights card ────────────────────────────────────────────────────────────

function InsightsCard({ ollama }: { ollama: Record<string, unknown> | null }) {
  if (!ollama) return null;
  if (ollama.status === "pending") {
    return (
      <div className="mt-2 flex items-center gap-2 text-[11px] text-white/30 rounded-lg border border-dashed border-white/8 px-3 py-2">
        <Brain size={11} className="text-indigo-400/40 shrink-0" />
        AI insights pending — Ollama unavailable at processing time
      </div>
    );
  }
  const insights = ollama.insights as Array<{ title: string; description: string; priority: string }> | undefined;
  if (!insights?.length) return null;
  const pc: Record<string, string> = { high: "text-red-400", medium: "text-amber-400", low: "text-white/40" };
  return (
    <div className="mt-2 space-y-1">
      {insights.slice(0, 3).map((ins, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-indigo-500/4 px-3 py-2 text-[11px]">
          <Brain size={10} className="text-indigo-400/60 shrink-0 mt-0.5" />
          <div>
            <span className={cn("font-semibold", pc[ins.priority] ?? "text-white/60")}>{ins.title}</span>
            <span className="ml-1.5 text-white/40">{ins.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocRow({ doc, onDelete }: { doc: UploadedDoc; onDelete: (id: string) => void }) {
  const meta     = STAGE_META[doc.pipelineStage] ?? STAGE_META.queued;
  const StatusIcon = meta.icon;
  return (
    <div className="group rounded-xl border border-white/5 bg-white/2 p-4 transition-colors hover:bg-white/3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
          <FileText size={15} className="text-white/40" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white/80 truncate max-w-xs">{doc.name}</p>
            {doc.documentType && (
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300/80">
                {doc.documentType}
              </span>
            )}
            <div className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5", meta.bg)}>
              <StatusIcon
                size={10}
                className={cn(meta.color, meta.spin && doc.pipelineStage !== "complete" ? "animate-spin" : "")}
              />
              <span className={cn("text-[10px] font-semibold", meta.color)}>{meta.label}</span>
            </div>
          </div>
          <p className="text-[10px] text-white/25 mt-0.5">
            {(doc.size / 1024).toFixed(0)} KB · {doc.uploadedAt}
          </p>
        </div>
        <button
          onClick={() => onDelete(doc.id)}
          className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/5 text-white/30 hover:text-red-400 transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Pipeline progress for in-flight stages */}
      {!["complete", "failed"].includes(doc.pipelineStage) && (
        <div className="mt-2 pl-12">
          <PipelineProgress stage={doc.pipelineStage} />
        </div>
      )}

      {/* Error */}
      {doc.pipelineStage === "failed" && doc.error && (
        <div className="mt-2 pl-12 flex items-start gap-2 text-xs text-red-400/80">
          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
          {doc.error}
        </div>
      )}

      {/* Results panel */}
      {doc.pipelineStage === "complete" && (
        <div className="mt-1 pl-12">
          <CalculationsCard calculations={doc.calculations} />
          <InsightsCard ollama={doc.ollama} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { docs, addDoc, applyPipelineResult, removeDoc, refreshDocs } = useDocumentStore();
  const isInitialized = selectIsInitialized(docs);

  const [staged,      setStaged]      = useState<File[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  // ── Mount hydration — sync latest pipeline results from backend ──────────
  useEffect(() => {
    refreshDocs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshDocs();
    setRefreshing(false);
  }, [refreshDocs]);

  // ── Polling ──────────────────────────────────────────────────────────────
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollInProgress = useCallback(async () => {
    const inProgress = docs.filter(
      (d) => !["complete", "failed"].includes(d.pipelineStage)
    );
    if (!inProgress.length) return;
    for (const doc of inProgress) {
      try {
        const res = await api.get<BackendPipelineResult>(`/documents/pipeline/${doc.id}`);
        applyPipelineResult(doc.id, res.data);
      } catch {
        // task not yet registered server-side — swallow
      }
    }
  }, [docs, applyPipelineResult]);

  useEffect(() => {
    const hasInProgress = docs.some((d) => !["complete", "failed"].includes(d.pipelineStage));
    if (hasInProgress && !pollingRef.current) {
      pollingRef.current = setInterval(pollInProgress, 2000);
    }
    if (!hasInProgress && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [docs, pollInProgress]);

  // ── Dropzone ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    setStaged((prev) => [...prev, ...files]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg":      [".jpg", ".jpeg"],
      "image/png":       [".png"],
      "text/csv":        [".csv"],
    },
  });

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!staged.length || uploading) return;
    setUploading(true);
    for (const file of staged) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post<{ task_id: string; filename: string }>(
          "/documents/upload", fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const { task_id, filename } = res.data;
        addDoc({
          id:            task_id,
          name:          filename ?? file.name,
          size:          file.size,
          category:      "Bank Statements",
          status:        "queued",
          pipelineStage: "queued",
          documentType:  null,
          calculations:  null,
          analysis:      null,
          ollama:        null,
          error:         null,
        });
      } catch (err) {
        console.error("Upload failed for", file.name, err);
      }
    }
    setStaged([]);
    setUploading(false);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const verifiedCount   = docs.filter((d) => d.pipelineStage === "complete").length;
  const processingCount = docs.filter((d) => !["complete", "failed", "queued"].includes(d.pipelineStage)).length;
  const failedCount     = docs.filter((d) => d.pipelineStage === "failed").length;

  return (
    <div className="px-6 py-5 space-y-5">

      {/* Title */}
      <div>
        <h1 className="text-base font-semibold text-white">Documents &amp; Uploads</h1>
        <p className="text-xs text-white/35 mt-0.5">
          Upload once — OCR, extraction, calculations and AI insights run automatically
        </p>
      </div>

      {/* Processing banner */}
      {processingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-300">
              {processingCount} document{processingCount > 1 ? "s" : ""} processing…
            </p>
            <p className="text-[11px] text-blue-300/50 mt-0.5">
              OCR → Validation → Tax Calculation → AI Analysis. Dashboard unlocks when complete.
            </p>
          </div>
        </div>
      )}

      {/* Verified banner */}
      {isInitialized && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold text-emerald-300">
            Documents verified — your dashboard is fully unlocked with real financial data.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Documents", value: docs.length.toString(),     accent: "text-white"       },
          { label: "Verified",        value: verifiedCount.toString(),    accent: "text-emerald-400" },
          { label: "Processing",      value: processingCount.toString(),  accent: "text-blue-400"    },
          { label: "Failed",          value: failedCount.toString(),      accent: failedCount > 0 ? "text-red-400" : "text-white/30" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/5 bg-white/2 px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-white/35 mb-1.5">{k.label}</p>
            <p className={cn("text-xl font-semibold tabular-nums", k.accent)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border border-white/5 bg-white/2 p-5">
        <p className="text-sm font-semibold text-white/85 mb-4">Upload Documents</p>
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            isDragActive
              ? "border-purple-500/60 bg-purple-500/5"
              : "border-white/8 hover:border-white/15 hover:bg-white/2"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              <FileUp size={20} className="text-white/30" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/70">
                {isDragActive ? "Drop files here…" : "Drag & drop files, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-white/30">PDF, JPG, PNG, CSV · Up to 10 MB each</p>
            </div>
          </div>
        </div>

        {staged.length > 0 && (
          <div className="mt-4 space-y-2">
            {staged.map((f, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/3 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <FileIcon size={14} className="text-white/40 shrink-0" />
                  <span className="text-xs text-white/70 truncate max-w-60">{f.name}</span>
                  <span className="text-[10px] text-white/25">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button onClick={() => setStaged((s) => s.filter((_, j) => j !== i))} className="text-white/20 hover:text-red-400 transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-2 flex items-center gap-2 rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              {uploading
                ? <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                : <><Cpu size={12} /> Upload &amp; Process {staged.length} file{staged.length > 1 ? "s" : ""}</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Pipeline explainer */}
      <div className="rounded-xl border border-white/5 bg-white/1 px-5 py-4">
        <p className="text-[11px] font-semibold text-white/30 mb-3 uppercase tracking-widest">What happens after upload</p>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: ScanText,    label: "OCR + Extract",    desc: "Text & tables extracted" },
            { icon: ShieldCheck, label: "Validate",          desc: "Financial fields checked" },
            { icon: BarChart2,   label: "Tax Calculation",   desc: "Deterministic + active policy" },
            { icon: Brain,       label: "AI Analysis",       desc: "Ollama personalised insights" },
          ].map((s) => (
            <div key={s.label} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/2 px-3 py-2 text-xs min-w-40">
              <s.icon size={13} className="text-purple-400/60 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white/60">{s.label}</p>
                <p className="text-white/30 text-[10px]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document list */}
      <div className="rounded-xl border border-white/5 bg-white/2 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-sm font-semibold text-white/85">Documents</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderOpen size={32} className="text-white/10" />
            <p className="text-sm text-white/25">No documents yet — upload one to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} onDelete={removeDoc} />
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 px-5 py-4">
        <p className="text-xs font-semibold text-blue-400 mb-2">Tips for faster verification</p>
        <ul className="space-y-1">
          {[
            "Upload Form 16 Part A & B for automatic salary income population",
            "Investment proofs should be submitted before 31 March for current FY",
            "Machine-readable PDFs extract more accurately than scanned images",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs text-white/40">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
