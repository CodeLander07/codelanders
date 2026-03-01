"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Plus, RefreshCw, CheckCircle2, Archive,
  Trash2, ChevronDown, ChevronUp, AlertCircle, Lock, Eye,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaxSlab   { min: number; max: number | null; rate: number }
interface Policy {
  id:              number;
  financial_year:  string;
  version:         string;
  status:          "draft" | "active" | "archived";
  notes:           string | null;
  effective_from:  string | null;
  effective_to:    string | null;
  filing_deadline: string | null;
  standard_deduction:           number;
  old_regime_rebate_limit:      number;
  old_regime_rebate_amount:     number;
  new_regime_rebate_limit:      number;
  new_regime_rebate_amount:     number;
  cess_rate:       number;
  deduction_limits: Record<string, number>;
  old_regime_slabs: TaxSlab[];
  new_regime_slabs: TaxSlab[];
  eligibility_flags: Record<string, unknown>;
  created_at:  string | null;
  activated_at: string | null;
  archived_at:  string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  draft:    "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  archived: "bg-white/8 text-white/40 border border-white/10",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLE[status] ?? "bg-white/8 text-white/40"}`}>
      {status}
    </span>
  );
}

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [adminKey,   setAdminKey]   = useState("");
  const [keyInput,   setKeyInput]   = useState("");
  const [authError,  setAuthError]  = useState("");
  const [policies,   setPolicies]   = useState<Policy[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const [expanded,   setExpanded]   = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // ── Toast helper ─────────────────────────────────────────────────────────
  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── API helpers ───────────────────────────────────────────────────────────
  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  }), [adminKey]);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/policies`, { headers: headers() });
      if (r.status === 403) { setAuthError("Invalid admin key."); setAdminKey(""); return; }
      setPolicies(await r.json());
      setAuthError("");
    } catch { notify("Network error loading policies.", false); }
    finally { setLoading(false); }
  }, [headers]);

  const activate = async (id: number) => {
    const r = await fetch(`${API}/api/admin/policies/${id}/activate`, { method: "POST", headers: headers() });
    if (!r.ok) { notify((await r.json()).detail ?? "Activation failed.", false); return; }
    const d = await r.json();
    notify(d.message);
    loadPolicies();
  };

  const archive = async (id: number) => {
    if (!confirm("Archive this policy? It will become read-only.")) return;
    const r = await fetch(`${API}/api/admin/policies/${id}/archive`, { method: "POST", headers: headers() });
    if (!r.ok) { notify((await r.json()).detail ?? "Archive failed.", false); return; }
    notify("Policy archived.");
    loadPolicies();
  };

  const deletePolicy = async (id: number) => {
    if (!confirm("Permanently delete this DRAFT policy?")) return;
    const r = await fetch(`${API}/api/admin/policies/${id}`, { method: "DELETE", headers: headers() });
    if (!r.ok) { notify((await r.json()).detail ?? "Delete failed.", false); return; }
    notify("Draft deleted.");
    loadPolicies();
  };

  // Load policies after key is set
  useEffect(() => { if (adminKey) loadPolicies(); }, [adminKey, loadPolicies]);

  // ── Admin key gate ────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05050A]">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0C0C14] p-8 text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/15">
            <Lock size={22} className="text-purple-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Admin Access</h1>
          <p className="text-sm text-white/40">Enter the admin secret key to manage tax policies.</p>
          {authError && (
            <p className="text-xs font-medium text-red-400">{authError}</p>
          )}
          <input
            type="password"
            placeholder="Admin secret key"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setAdminKey(keyInput.trim()); }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/50"
          />
          <button
            onClick={() => setAdminKey(keyInput.trim())}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
          >
            Unlock Admin Panel
          </button>
        </div>
      </div>
    );
  }

  // ── Policy list ───────────────────────────────────────────────────────────
  const active   = policies.find((p) => p.status === "active");
  const drafts   = policies.filter((p) => p.status === "draft");
  const archived = policies.filter((p) => p.status === "archived");

  return (
    <div className="min-h-screen bg-[#05050A] px-6 py-8 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl transition-all
          ${toast.ok
            ? "border-emerald-500/30 bg-[#0C0C14] text-emerald-400"
            : "border-red-500/30 bg-[#0C0C14] text-red-400"}`}>
          {toast.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
            <ShieldCheck size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Tax Policy Admin</h1>
            <p className="text-xs text-white/40">Manage and activate Indian Income Tax rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadPolicies} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors">
            <Plus size={12} /> New Policy
          </button>
        </div>
      </div>

      {/* Active policy card */}
      {active && (
        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge status="active" />
                <span className="text-sm font-semibold text-white">{active.financial_year} — {active.version}</span>
              </div>
              <p className="text-xs text-white/50">
                Activated {active.activated_at ? new Date(active.activated_at).toLocaleString("en-IN") : "—"} &nbsp;|&nbsp;
                Filing deadline: {active.filing_deadline ?? "—"} &nbsp;|&nbsp;
                Policy #{active.id}
              </p>
              {active.notes && <p className="mt-1 text-xs text-white/35 italic">{active.notes}</p>}
            </div>
            <button onClick={() => setExpanded(expanded === active.id ? null : active.id)} className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors">
              {expanded === active.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Details
            </button>
          </div>
          {expanded === active.id && <PolicyDetails policy={active} />}
        </div>
      )}

      {/* Draft policies */}
      {drafts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Drafts</h2>
          <div className="space-y-2">
            {drafts.map((p) => (
              <PolicyRow
                key={p.id} policy={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onActivate={() => activate(p.id)}
                onArchive={() => archive(p.id)}
                onDelete={() => deletePolicy(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Archived</h2>
          <div className="space-y-2">
            {archived.map((p) => (
              <PolicyRow
                key={p.id} policy={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {policies.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/6 bg-white/2 p-12 text-center">
          <p className="text-sm text-white/30">No policies found. Create the first one to get started.</p>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePolicyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadPolicies(); }}
          headers={headers()}
        />
      )}
    </div>
  );
}

// ─── Policy row ───────────────────────────────────────────────────────────────

function PolicyRow({
  policy, expanded, onToggle,
  onActivate, onArchive, onDelete,
}: {
  policy: Policy;
  expanded: boolean;
  onToggle: () => void;
  onActivate?: () => void;
  onArchive?:  () => void;
  onDelete?:   () => void;
}) {
  const isArchived = policy.status === "archived";
  return (
    <div className="rounded-xl border border-white/8 bg-[#0C0C14] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Badge status={policy.status} />
        <span className="flex-1 text-sm font-medium text-white/80">
          {policy.financial_year} — {policy.version}
        </span>
        <span className="text-xs text-white/30">#{policy.id}</span>
        {!isArchived && onActivate && (
          <button onClick={onActivate} className="flex items-center gap-1 rounded-lg bg-purple-600/80 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-500 transition-colors">
            <CheckCircle2 size={11} /> Activate
          </button>
        )}
        {!isArchived && onArchive && (
          <button onClick={onArchive} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:border-white/20 transition-colors">
            <Archive size={11} /> Archive
          </button>
        )}
        {policy.status === "draft" && onDelete && (
          <button onClick={onDelete} className="flex items-center gap-1 rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors">
            <Trash2 size={11} />
          </button>
        )}
        <button onClick={onToggle} className="text-white/30 hover:text-white/60 transition-colors">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {expanded && <PolicyDetails policy={policy} />}
    </div>
  );
}

// ─── Policy details ───────────────────────────────────────────────────────────

function PolicyDetails({ policy }: { policy: Policy }) {
  return (
    <div className="border-t border-white/6 px-4 pb-4 pt-3 grid grid-cols-2 gap-5 text-xs text-white/60">
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/30">General</h3>
        <Row label="Effective"   value={`${policy.effective_from ?? "—"} → ${policy.effective_to ?? "—"}`} />
        <Row label="Std. Deduction" value={`₹${fmt(policy.standard_deduction)}`} />
        <Row label="Cess"        value={`${(policy.cess_rate * 100).toFixed(0)}%`} />
        <Row label="Filing Deadline" value={policy.filing_deadline ?? "—"} />
        {policy.notes && <Row label="Notes" value={policy.notes} />}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Deduction Limits</h3>
        {Object.entries(policy.deduction_limits).map(([k, v]) => (
          <Row key={k} label={k} value={typeof v === "number" && v < 2 ? `${(v * 100).toFixed(0)}%` : `₹${fmt(v as number)}`} />
        ))}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Old Regime</h3>
        <Row label="Rebate 87A limit"  value={`₹${fmt(policy.old_regime_rebate_limit)}`} />
        <Row label="Rebate 87A amount" value={`₹${fmt(policy.old_regime_rebate_amount)}`} />
        {policy.old_regime_slabs.map((s, i) => (
          <Row key={i} label={`${fmt(s.min)}–${s.max ? fmt(s.max) : "∞"}`} value={`${(s.rate * 100).toFixed(0)}%`} />
        ))}
      </div>
      <div className="space-y-1.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-white/30">New Regime</h3>
        <Row label="Rebate 87A limit"  value={`₹${fmt(policy.new_regime_rebate_limit)}`} />
        <Row label="Rebate 87A amount" value={`₹${fmt(policy.new_regime_rebate_amount)}`} />
        {policy.new_regime_slabs.map((s, i) => (
          <Row key={i} label={`${fmt(s.min)}–${s.max ? fmt(s.max) : "∞"}`} value={`${(s.rate * 100).toFixed(0)}%`} />
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-white/40 shrink-0">{label}</span>
      <span className="text-white/75 text-right truncate">{value}</span>
    </div>
  );
}

// ─── Create policy modal ──────────────────────────────────────────────────────

function CreatePolicyModal({
  onClose, onCreated, headers,
}: { onClose: () => void; onCreated: () => void; headers: Record<string, string> }) {
  const [form, setForm] = useState({
    financial_year:  "FY 2025-26",
    version:         "v2",
    notes:           "",
    effective_from:  "2025-04-01",
    effective_to:    "2026-03-31",
    filing_deadline: "2025-07-31",
    standard_deduction:           "75000",
    old_regime_rebate_limit:      "500000",
    old_regime_rebate_amount:     "12500",
    new_regime_rebate_limit:      "1200000",
    new_regime_rebate_amount:     "60000",
    cess_rate:                    "0.04",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {
        financial_year:           form.financial_year,
        version:                  form.version,
        notes:                    form.notes || null,
        effective_from:           form.effective_from || null,
        effective_to:             form.effective_to || null,
        filing_deadline:          form.filing_deadline || null,
        standard_deduction:       parseFloat(form.standard_deduction),
        old_regime_rebate_limit:  parseFloat(form.old_regime_rebate_limit),
        old_regime_rebate_amount: parseFloat(form.old_regime_rebate_amount),
        new_regime_rebate_limit:  parseFloat(form.new_regime_rebate_limit),
        new_regime_rebate_amount: parseFloat(form.new_regime_rebate_amount),
        cess_rate:                parseFloat(form.cess_rate),
      };
      const r = await fetch(`${API}/api/admin/policies`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!r.ok) { setError((await r.json()).detail ?? "Create failed."); return; }
      onCreated();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  const F = ({ label, fkey, type = "text" }: { label: string; fkey: keyof typeof form; type?: string }) => (
    <div className="space-y-1">
      <label className="text-[11px] text-white/40">{label}</label>
      <input
        type={type}
        value={form[fkey]}
        onChange={(e) => setForm((f) => ({ ...f, [fkey]: e.target.value }))}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 transition-colors"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0C0C14] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Create New Draft Policy</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <F label="Financial Year"          fkey="financial_year" />
          <F label="Version"                 fkey="version" />
          <F label="Effective From (YYYY-MM-DD)" fkey="effective_from" />
          <F label="Effective To (YYYY-MM-DD)"   fkey="effective_to" />
          <F label="Filing Deadline (YYYY-MM-DD)" fkey="filing_deadline" />
          <F label="Standard Deduction (₹)"      fkey="standard_deduction" type="number" />
          <F label="Old Regime Rebate Limit (₹)"  fkey="old_regime_rebate_limit" type="number" />
          <F label="Old Regime Rebate Amount (₹)" fkey="old_regime_rebate_amount" type="number" />
          <F label="New Regime Rebate Limit (₹)"  fkey="new_regime_rebate_limit" type="number" />
          <F label="New Regime Rebate Amount (₹)" fkey="new_regime_rebate_amount" type="number" />
          <F label="Cess Rate (e.g., 0.04)"       fkey="cess_rate" type="number" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-white/40">Notes (optional)</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50 transition-colors resize-none"
          />
        </div>

        <p className="text-[11px] text-white/30">
          The policy will be saved as <span className="text-blue-400 font-semibold">DRAFT</span>. Slabs and deduction limits use default FY 2025-26 values and can be edited after creation via the PUT endpoint.
        </p>

        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={saving} className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Create Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
