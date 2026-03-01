"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardSidebar from "@/components/dashboard/sidebar";
import { useAuthStore } from "@/store/authStore";
import { useDocumentStore, selectIsInitialized } from "@/store/documentStore";
import { usePolicyStore } from "@/store/policyStore";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, Lock, FileUp, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Routes that require at least one verified document before any content is shown.
 * Settings and Documents are always accessible.
 */
const GATED_PATHS = [
  "/dashboard",
  "/dashboard/tax-overview",
  "/dashboard/income",
  "/dashboard/deductions",
  "/dashboard/regime",
  "/dashboard/ai-insights",
  "/dashboard/filing",
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token }   = useAuthStore();
  const docs              = useDocumentStore((s) => s.docs);
  const isInitialized     = selectIsInitialized(docs);
  const pathname          = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Policy store
  const { policyUpdated, activePolicy, fetchActivePolicy, acknowledgeUpdate } = usePolicyStore();
  const refreshDocs  = useDocumentStore((s) => s.refreshDocs);
  const checkAuth    = useAuthStore((s) => s.checkAuth);
  const [globalRefreshing, setGlobalRefreshing] = useState(false);

  // Fetch active policy + all pipeline results on mount
  useEffect(() => {
    if (token) {
      fetchActivePolicy(token as string);
      refreshDocs();
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGlobalRefresh = useCallback(async () => {
    if (globalRefreshing) return;
    setGlobalRefreshing(true);
    await Promise.all([
      checkAuth(),
      token ? fetchActivePolicy(token as string) : Promise.resolve(),
      refreshDocs(),
    ]);
    setGlobalRefreshing(false);
  }, [globalRefreshing, checkAuth, fetchActivePolicy, token, refreshDocs]);

  // True when the current route requires documents but none are verified yet
  const isGated = !isInitialized && GATED_PATHS.includes(pathname);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-[#05050A]">
        {/* Sidebar */}
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />

        {/* Main column */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Top Bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#09090F]/80 px-5 backdrop-blur-sm">
            <div className={cn(
              "flex items-center gap-2 rounded-lg border bg-white/4 px-3 py-1.5 w-64 transition-colors",
              isGated ? "border-white/4 opacity-40 pointer-events-none" : "border-white/8 focus-within:border-white/20"
            )}>
              <Search size={13} className="text-white/30 shrink-0" />
              <input
                type="text"
                placeholder="Search deductions, documents…"
                className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none"
                disabled={isGated}
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Documents-required badge in top bar when gated */}
              {isGated && (
                <Link href="/dashboard/documents">
                  <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-1 text-[11px] font-medium text-amber-400">
                    <Lock size={10} /> Documents required
                  </span>
                </Link>
              )}
              <button
                onClick={handleGlobalRefresh}
                title="Refresh all data"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-white/40 hover:text-white transition-colors",
                  globalRefreshing && "pointer-events-none"
                )}
              >
                <RefreshCw size={13} className={globalRefreshing ? "animate-spin" : ""} />
              </button>
              <button className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-white/40 hover:text-white transition-colors",
                isGated && "opacity-40 pointer-events-none"
              )}>
                <Bell size={14} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-purple-400" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-blue-500 text-xs font-bold text-white select-none">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
            </div>
          </header>

          {/* Policy update notification — non-blocking, user-dismissable */}
          {policyUpdated && activePolicy && (
            <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 bg-amber-500/8 px-5 py-2.5">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <RefreshCw size={12} className="shrink-0" />
                <span className="font-medium">Tax rules updated</span>
                <span className="text-amber-300/60">
                  — {activePolicy.financial_year} {activePolicy.version} is now active.
                  Recalculate to see the latest impact on your filing.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/dashboard/tax-overview">
                  <button className="rounded-md bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/30 transition-colors">
                    Recalculate
                  </button>
                </Link>
                <button onClick={acknowledgeUpdate} className="text-amber-400/60 hover:text-amber-300 transition-colors">
                  <X size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Page content — with gate overlay when uninitialized on a blocked route */}
          <main className="relative flex-1 overflow-y-auto">
            {/* Underlying page always renders so layout doesn't flash */}
            <div className={cn(isGated && "pointer-events-none select-none")}>
              {children}
            </div>

            {/* Blocking overlay */}
            {isGated && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#05050A]/92 backdrop-blur-sm px-6">
                {/* Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/4">
                  <Lock size={26} className="text-white/20" />
                </div>

                {/* Copy */}
                <div className="text-center">
                  <h2 className="text-base font-semibold text-white">
                    Documents required to continue
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-white/35 leading-relaxed">
                    This section unlocks once you upload and verify at least one
                    financial document. Your tax data, insights, and analysis
                    are derived exclusively from your uploaded documents.
                  </p>
                </div>

                {/* CTA */}
                <Link href="/dashboard/documents">
                  <button className="flex items-center gap-2 rounded-lg bg-purple-600/80 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-600 transition-colors">
                    <FileUp size={14} /> Upload Documents
                  </button>
                </Link>

                {/* Status summary when docs exist but none verified */}
                {docs.length > 0 && (
                  <p className="text-xs text-white/25">
                    {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded · waiting for verification
                  </p>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
