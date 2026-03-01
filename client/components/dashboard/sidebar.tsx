"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  Landmark,
  BadgePercent,
  GitCompare,
  Sparkles,
  FolderOpen,
  ClipboardCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lock,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentStore, selectIsInitialized } from "@/store/documentStore";

/** Routes that are fully blocked until at least one document is verified. */
const GATED_HREFS = new Set([
  "/dashboard",
  "/dashboard/tax-overview",
  "/dashboard/income",
  "/dashboard/deductions",
  "/dashboard/regime",
  "/dashboard/ai-insights",
  "/dashboard/filing",
]);

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard",   href: "/dashboard",            icon: LayoutDashboard },
      { label: "Tax Overview", href: "/dashboard/tax-overview", icon: BarChart2 },
    ],
  },
  {
    label: "Tax Analysis",
    items: [
      { label: "Income Sources",         href: "/dashboard/income",      icon: Landmark     },
      { label: "Deductions & Exemptions", href: "/dashboard/deductions",  icon: BadgePercent },
      { label: "Regime Comparison",       href: "/dashboard/regime",      icon: GitCompare   },
      { label: "AI Insights",             href: "/dashboard/ai-insights", icon: Sparkles     },
    ],
  },
  {
    label: "Compliance",
    items: [
      { label: "Documents & Uploads",  href: "/dashboard/documents", icon: FolderOpen    },
      { label: "Filing & Compliance",  href: "/dashboard/filing",    icon: ClipboardCheck },
      { label: "Settings",             href: "/dashboard/settings",  icon: Settings       },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function DashboardSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname      = usePathname();
  const docs          = useDocumentStore((s) => s.docs);
  const isInitialized = selectIsInitialized(docs);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-[#09090F] border-r border-white/5 transition-all duration-200 shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#09090F] text-white/40 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand */}
      <div className="flex h-14 items-center px-4 border-b border-white/5 shrink-0">
        {collapsed ? (
          <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400">T</span>
        ) : (
          <span className="text-lg font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400">TaxMate</span>
        )}
      </div>

      {/* Uninitialized banner */}
      {!isInitialized && !collapsed && (
        <div className="mx-2 mt-3 flex items-start gap-2 rounded-lg border border-purple-500/20 bg-purple-500/8 px-3 py-2.5">
          <Upload size={12} className="mt-0.5 shrink-0 text-purple-400" />
          <p className="text-[11px] leading-snug text-purple-300/80">
            Upload documents to unlock your tax insights
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const isGated    = !isInitialized && GATED_HREFS.has(href);
                const isDocuments = href === "/dashboard/documents";
                const active     = pathname === href;
                // When gated, clicking redirects to Documents
                const resolvedHref = isGated ? "/dashboard/documents" : href;

                return (
                  <li key={href}>
                    {/* Documents & Uploads — always highlighted when uninitialized */}
                    {isDocuments && !isInitialized ? (
                      <Link
                        href={resolvedHref}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                          "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30 hover:bg-purple-500/20"
                        )}
                      >
                        <Icon size={16} className="shrink-0 text-purple-400" />
                        {!collapsed && (
                          <span className="flex-1 truncate">Documents & Uploads</span>
                        )}
                        {!collapsed && (
                          <span className="rounded-full bg-purple-500/30 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300 uppercase tracking-wider">
                            Start
                          </span>
                        )}
                      </Link>
                    ) : (
                      <Link
                        href={resolvedHref}
                        title={isGated ? "Upload documents to unlock" : label}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                          active && !isGated
                            ? "bg-white/10 text-white"
                            : isGated
                              ? "cursor-default opacity-40 hover:bg-transparent"
                              : "text-white/40 hover:bg-white/5 hover:text-white/80"
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            "shrink-0",
                            active && !isGated ? "text-purple-400" : "text-white/30"
                          )}
                        />
                        {!collapsed && (
                          <span className="flex-1 truncate">{label}</span>
                        )}
                        {/* Lock icon — only when gated and sidebar is expanded */}
                        {isGated && !collapsed && (
                          <Lock size={10} className="shrink-0 text-white/20" />
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
