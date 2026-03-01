/**
 * TaxMate — Policy Store
 *
 * Tracks the currently active tax policy and surfaces a "rules updated"
 * notification whenever the admin activates a new policy.
 *
 * Flow:
 *  1. DashboardLayout calls `fetchActivePolicy()` on mount.
 *  2. If the returned policy_id differs from `lastAcknowledgedId`, the
 *     `policyUpdated` flag becomes true and a non-blocking banner is shown.
 *  3. The user clicks "Recalculate" or dismisses — `acknowledgeUpdate()` is
 *     called, clearing the flag and storing the new policy_id.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ActivePolicyMeta {
  policy_id:       number;
  financial_year:  string;
  version:         string;
  filing_deadline: string | null;
}

interface PolicyState {
  /** Snapshot of the last-fetched active policy, or null if none. */
  activePolicy: ActivePolicyMeta | null;
  /**
   * The policy_id the user last acknowledged.
   * When activePolicy.policy_id !== lastAcknowledgedId → show banner.
   */
  lastAcknowledgedId: number | null;
  /** True when the active policy changed since the user's last acknowledgement. */
  policyUpdated: boolean;

  // Actions
  setActivePolicy: (meta: ActivePolicyMeta | null) => void;
  acknowledgeUpdate: () => void;
  fetchActivePolicy: (token: string) => Promise<void>;
}

export const usePolicyStore = create<PolicyState>()(
  persist(
    (set, get) => ({
      activePolicy:       null,
      lastAcknowledgedId: null,
      policyUpdated:      false,

      setActivePolicy(meta) {
        const prev = get().lastAcknowledgedId;
        set({
          activePolicy:  meta,
          policyUpdated: meta !== null && meta.policy_id !== prev,
        });
      },

      acknowledgeUpdate() {
        const ap = get().activePolicy;
        set({
          lastAcknowledgedId: ap?.policy_id ?? null,
          policyUpdated:      false,
        });
      },

      async fetchActivePolicy(token: string) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/active-context`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return;           // 404 means no active policy → do nothing
          const data = await res.json();
          get().setActivePolicy({
            policy_id:       data.policy_id,
            financial_year:  data.financial_year,
            version:         data.version,
            filing_deadline: data.filing_deadline ?? null,
          });
        } catch {
          // Network error — silent fail, don't block dashboard
        }
      },
    }),
    {
      name:    "taxmate-policy",
      partialize: (s) => ({
        activePolicy:       s.activePolicy,
        lastAcknowledgedId: s.lastAcknowledgedId,
      }),
    }
  )
);
