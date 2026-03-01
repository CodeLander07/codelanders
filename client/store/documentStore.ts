import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export const DOC_CATEGORIES = [
  "Bank Statements",
  "Salary Slips",
  "Rent Receipts",
  "Annual Savings / Investments",
  "Monthly EMI Proofs",
  "Other Spending Proofs",
  "Interest Income (FD, Savings)",
  "Capital Gains (Stocks, Mutual Funds)",
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

/** Mirrors the backend pipeline_stage values + "queued" before first poll */
export type PipelineStage =
  | "queued"
  | "ocr"
  | "validating"
  | "calculating"
  | "analyzing"
  | "complete"
  | "failed";

/** Convenience status used in UI — derived from pipelineStage */
export type DocStatus = "queued" | "processing" | "verified" | "failed";

export interface UploadedDoc {
  id:            string;        // = backend task_id
  name:          string;
  size:          number;
  category:      DocCategory;
  status:        DocStatus;
  uploadedAt:    string;
  // Pipeline metadata
  pipelineStage: PipelineStage;
  documentType:  string | null;   // classified by OCR ("Form 16", "Bank Statement", …)
  calculations:  Record<string, unknown> | null;
  analysis:      Record<string, unknown> | null;
  ollama:        Record<string, unknown> | null;
  error:         string | null;
}

interface DocumentState {
  docs: UploadedDoc[];
  addDoc: (doc: Omit<UploadedDoc, "uploadedAt">) => void;
  /** Patch any fields on a doc by id. */
  patchDoc: (id: string, patch: Partial<UploadedDoc>) => void;
  /** Apply a full pipeline result payload returned by GET /documents/pipeline/{task_id}. */
  applyPipelineResult: (id: string, result: BackendPipelineResult) => void;
  removeDoc:  (id: string) => void;
  clearAll:   () => void;
  /**
   * Re-fetch GET /api/documents/pipeline and merge all results into the store.
   * Adds missing docs from the backend, updates stages for existing ones.
   */
  refreshDocs: () => Promise<void>;
  /** @deprecated use addDoc */
  addDocs: (docs: Omit<UploadedDoc, "uploadedAt">[]) => void;
  updateStatus:   (id: string, status: DocStatus) => void;
  updateCategory: (id: string, category: DocCategory) => void;
}

/** Shape returned by GET /api/documents/pipeline/{task_id} */
export interface BackendPipelineResult {
  task_id:        string;
  filename:       string;
  document_type:  string | null;
  pipeline_stage: PipelineStage;
  ocr_status:     string | null;
  calculations:   Record<string, unknown> | null;
  analysis:       Record<string, unknown> | null;
  ollama:         Record<string, unknown> | null;
  error:          string | null;
  started_at:     string;
  completed_at:   string | null;
}

function stageToStatus(stage: PipelineStage): DocStatus {
  if (stage === "complete") return "verified";
  if (stage === "failed")   return "failed";
  if (stage === "queued")   return "queued";
  return "processing";
}

function categoryFromDocType(docType: string | null): DocCategory {
  if (!docType) return "Bank Statements";
  const t = docType.toLowerCase();
  if (t.includes("salary") || t.includes("form 16") || t.includes("payslip")) return "Salary Slips";
  if (t.includes("rent")) return "Rent Receipts";
  if (t.includes("bank")) return "Bank Statements";
  if (t.includes("emi")  || t.includes("loan"))   return "Monthly EMI Proofs";
  if (t.includes("investment") || t.includes("ppf") || t.includes("elss") || t.includes("lic")) return "Annual Savings / Investments";
  if (t.includes("interest") || t.includes("fd"))  return "Interest Income (FD, Savings)";
  if (t.includes("capital") || t.includes("stock") || t.includes("mutual")) return "Capital Gains (Stocks, Mutual Funds)";
  return "Bank Statements";
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      docs: [],

      addDoc: (incoming) =>
        set((state) => ({
          docs: [
            {
              ...incoming,
              uploadedAt: new Date().toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              }),
            },
            ...state.docs.filter((d) => d.id !== incoming.id), // dedupe
          ],
        })),

      patchDoc: (id, patch) =>
        set((state) => ({
          docs: state.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      applyPipelineResult: (id, result) =>
        set((state) => ({
          docs: state.docs.map((d) => {
            if (d.id !== id) return d;
            return {
              ...d,
              pipelineStage: result.pipeline_stage,
              status:        stageToStatus(result.pipeline_stage),
              documentType:  result.document_type,
              category:      categoryFromDocType(result.document_type),
              calculations:  result.calculations  ?? d.calculations,
              analysis:      result.analysis      ?? d.analysis,
              ollama:        result.ollama         ?? d.ollama,
              error:         result.error          ?? null,
            };
          }),
        })),

      removeDoc: (id) =>
        set((state) => ({ docs: state.docs.filter((d) => d.id !== id) })),

      clearAll: () => set({ docs: [] }),

      refreshDocs: async () => {
        try {
          const res = await api.get<Record<string, BackendPipelineResult>>("/documents/pipeline");
          const results = Object.values(res.data);
          set((state) => {
            let next = [...state.docs];
            for (const result of results) {
              const idx = next.findIndex((d) => d.id === result.task_id);
              const dateStr = idx >= 0
                ? next[idx].uploadedAt
                : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              const merged: UploadedDoc = {
                id:            result.task_id,
                name:          result.filename,
                size:          idx >= 0 ? next[idx].size : 0,
                uploadedAt:    dateStr,
                category:      categoryFromDocType(result.document_type),
                status:        stageToStatus(result.pipeline_stage),
                pipelineStage: result.pipeline_stage,
                documentType:  result.document_type,
                calculations:  result.calculations  ?? null,
                analysis:      result.analysis      ?? null,
                ollama:        result.ollama         ?? null,
                error:         result.error          ?? null,
              };
              if (idx >= 0) {
                next = next.map((d, i) => i === idx ? merged : d);
              } else {
                next = [merged, ...next];
              }
            }
            return { docs: next };
          });
        } catch {
          // Network error — silently swallow, stale data remains
        }
      },

      // ── Legacy compat ─────────────────────────────────────────────────────
      addDocs: (incoming) =>
        set((state) => ({
          docs: [
            ...incoming.map((d) => ({
              ...d,
              uploadedAt: new Date().toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              }),
            })),
            ...state.docs,
          ],
        })),

      updateStatus: (id, status) =>
        set((state) => ({
          docs: state.docs.map((d) => (d.id === id ? { ...d, status } : d)),
        })),

      updateCategory: (id, category) =>
        set((state) => ({
          docs: state.docs.map((d) => (d.id === id ? { ...d, category } : d)),
        })),
    }),
    { name: "taxmate-documents" }
  )
);

/**
 * A user is INITIALIZED (dashboard unlocked) only when at least one document
 * has completed the FULL pipeline (stage = "complete").
 *
 * Upload alone does NOT count as initialized.
 */
export function selectIsInitialized(docs: UploadedDoc[]): boolean {
  return docs.some((d) => d.pipelineStage === "complete");
}

