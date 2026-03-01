"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronRight,
  CalendarDays,
  FileText,
  Upload,
  BadgeCheck,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type StepStatus = "completed" | "active" | "pending" | "blocked";

interface FilingStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  icon: React.ElementType;
  cta?: { label: string; href: string };
}

interface Deadline {
  event: string;
  date: string;
  daysLeft: number;
  critical: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FILING_STEPS: FilingStep[] = [
  {
    id: 1,
    title: "Gather Documents",
    description: "Form 16, investment proofs, bank statements, rent receipts",
    status: "completed",
    icon: Upload,
    cta: { label: "View Documents", href: "/dashboard/documents" },
  },
  {
    id: 2,
    title: "Verify Income Details",
    description: "Confirm all income sources match Form 26AS and AIS",
    status: "completed",
    icon: FileText,
    cta: { label: "Income Sources", href: "/dashboard/income" },
  },
  {
    id: 3,
    title: "Claim Deductions",
    description: "Enter 80C, 80D, HRA, and other eligible deductions",
    status: "active",
    icon: BadgeCheck,
    cta: { label: "Deductions", href: "/dashboard/deductions" },
  },
  {
    id: 4,
    title: "Choose Tax Regime",
    description: "Compare Old vs New regime and select the optimal one",
    status: "pending",
    icon: CheckCircle2,
    cta: { label: "Regime Comparison", href: "/dashboard/regime" },
  },
  {
    id: 5,
    title: "Review Computation",
    description: "Final review of tax liability, refund or amount due",
    status: "pending",
    icon: FileText,
    cta: { label: "Tax Overview", href: "/dashboard/tax-overview" },
  },
  {
    id: 6,
    title: "File ITR",
    description: "Submit your Income Tax Return on the IT portal",
    status: "blocked",
    icon: Send,
  },
];

const DEADLINES: Deadline[] = [
  { event: "Advance Tax Q4 Payment",        date: "15 Mar 2025", daysLeft: 14, critical: true  },
  { event: "ITR Filing Deadline (No Audit)", date: "31 Jul 2025",  daysLeft: 152, critical: false },
  { event: "ITR Filing (Audit Cases)",       date: "31 Oct 2025",  daysLeft: 244, critical: false },
  { event: "Belated ITR Deadline",           date: "31 Dec 2025",  daysLeft: 305, critical: false },
  { event: "Tax Saving Investment Cutoff",   date: "31 Mar 2025",  daysLeft: 30,  critical: true  },
];

const CHECKLIST = [
  { label: "PAN card verified",                  done: true  },
  { label: "Aadhaar linked to PAN",              done: true  },
  { label: "Bank account pre-validated",         done: true  },
  { label: "Form 16 uploaded",                   done: false },
  { label: "Form 26AS reviewed",                 done: false },
  { label: "All investment proofs uploaded",     done: false },
  { label: "Deductions entered",                 done: false },
  { label: "Regime selected",                    done: false },
  { label: "Tax liability reviewed",             done: false },
  { label: "ITR filed and e-verified",           done: false },
];

// ─── Components ───────────────────────────────────────────────────────────────
const STEP_META: Record<StepStatus, { ring: string; bg: string; text: string; dot: string }> = {
  completed: { ring: "border-green-500/40",  bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400"   },
  active:    { ring: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400"  },
  pending:   { ring: "border-white/8",       bg: "bg-white/3",       text: "text-white/50",   dot: "bg-white/20"    },
  blocked:   { ring: "border-red-500/20",    bg: "bg-red-500/5",     text: "text-red-400/60", dot: "bg-red-400/40"  },
};

function StepCard({ step, index }: { step: FilingStep; index: number }) {
  const meta = STEP_META[step.status];
  const Icon = step.icon;
  const isLast = index === FILING_STEPS.length - 1;

  return (
    <div className="relative flex gap-4">
      {/* connector line */}
      {!isLast && (
        <div className="absolute left-4.75 top-10 h-[calc(100%-8px)] w-0.5 bg-white/5" />
      )}
      {/* Step circle */}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
          meta.ring,
          meta.bg
        )}
      >
        {step.status === "completed" ? (
          <CheckCircle2 size={16} className={meta.text} />
        ) : step.status === "active" ? (
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-purple-400 opacity-40" />
            <span className="h-2 w-2 rounded-full bg-purple-400" />
          </div>
        ) : (
          <Icon size={15} className={meta.text} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 rounded-xl border p-4 mb-3", meta.ring, meta.bg)}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/25">Step {step.id}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                meta.bg,
                meta.text
              )}
            >
              {step.status === "blocked" ? "Incomplete prerequisites" : step.status}
            </span>
          </div>
          {step.cta && (
            <Link
              href={step.cta.href}
              className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white transition-colors"
            >
              {step.cta.label} <ChevronRight size={11} />
            </Link>
          )}
        </div>
        <p className="text-sm font-medium text-white/80">{step.title}</p>
        <p className="text-xs text-white/35 mt-0.5 leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FilingPage() {
  const completedSteps = FILING_STEPS.filter((s) => s.status === "completed").length;
  const totalSteps = FILING_STEPS.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  const checklistDone = CHECKLIST.filter((c) => c.done).length;

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-white">Filing & Compliance</h1>
          <p className="text-xs text-white/35 mt-0.5">
            FY 2024-25 · ITR filing tracker and deadline management
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-purple-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600 transition-colors opacity-50 cursor-not-allowed">
          <Send size={12} /> File ITR
        </button>
      </div>

      {/* Progress KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Filing Progress",     value: `${progress}%`,                        accent: progress === 100 ? "text-green-400" : "text-purple-400" },
          { label: "Steps Completed",     value: `${completedSteps} / ${totalSteps}`,   accent: "text-white"       },
          { label: "Checklist Done",      value: `${checklistDone} / ${CHECKLIST.length}`, accent: "text-white/60" },
          { label: "Critical Deadlines",  value: DEADLINES.filter(d => d.critical).length.toString(), accent: "text-red-400" },
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

      {/* Progress bar */}
      <div className="rounded-xl border border-white/5 bg-white/2 px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-white/85">Overall Filing Progress</p>
          <span className="text-xs text-white/35">{progress}% complete</span>
        </div>
        <div className="h-2 rounded-full bg-white/5">
          <div
            className="h-2 rounded-full bg-linear-to-r from-purple-500 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/25">
          {totalSteps - completedSteps} step{totalSteps - completedSteps !== 1 ? "s" : ""} remaining before you can file ITR
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Filing steps */}
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/2 p-5">
          <p className="text-sm font-semibold text-white/85 mb-5">
            Step-by-step Filing Tracker
          </p>
          <div>
            {FILING_STEPS.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>

        {/* Right column: deadlines + checklist */}
        <div className="space-y-4">
          {/* Deadlines */}
          <div className="rounded-xl border border-white/5 bg-white/2 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={14} className="text-white/40" />
              <p className="text-sm font-semibold text-white/85">
                Important Deadlines
              </p>
            </div>
            <div className="space-y-2">
              {DEADLINES.map((d) => (
                <div
                  key={d.event}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    d.critical
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-white/5 bg-white/2"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-medium text-white/70">
                      {d.event}
                    </p>
                    {d.critical && (
                      <AlertTriangle size={10} className="text-red-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/35">{d.date}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                        d.daysLeft <= 30
                          ? "bg-red-400/15 text-red-400"
                          : "bg-white/5 text-white/30"
                      )}
                    >
                      {d.daysLeft}d left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="rounded-xl border border-white/5 bg-white/2 p-5">
            <p className="text-sm font-semibold text-white/85 mb-4">
              Pre-filing Checklist
            </p>
            <div className="space-y-2">
              {CHECKLIST.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5"
                >
                  {item.done ? (
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  ) : (
                    <Circle size={14} className="text-white/15 shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-xs",
                      item.done ? "text-white/50 line-through" : "text-white/60"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
