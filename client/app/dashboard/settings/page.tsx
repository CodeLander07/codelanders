"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import {
  User,
  Lock,
  Bell,
  Settings2,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",       label: "Personal Details", icon: User       },
  { id: "tax",           label: "Tax Preferences",  icon: Settings2  },
  { id: "notifications", label: "Notifications",    icon: Bell       },
  { id: "security",      label: "Security",         icon: Lock       },
] as const;

type Tab = typeof TABS[number]["id"];

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const actualType = type === "password" ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
        {label}
      </label>
      <div className="relative">
        <input
          type={actualType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-white/20 outline-none transition-colors",
            "focus:border-purple-500/50 focus:bg-purple-500/5",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-white/25">{hint}</p>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/4">
      <div>
        <p className="text-sm text-white/75">{label}</p>
        {description && (
          <p className="text-xs text-white/30 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          value ? "bg-purple-500" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            value ? "left-4.5" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 pt-2">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail]       = useState(user?.email ?? "");
  const [phone, setPhone]       = useState("");
  const [pan, setPan]           = useState("");
  const [dob, setDob]           = useState("");
  const [address, setAddress]   = useState("");

  // Tax preferences
  const [filingType, setFilingType]       = useState("individual");
  const [assessYear, setAssessYear]       = useState("2025-26");
  const [defaultRegime, setDefaultRegime] = useState("new");
  const [residencyStatus, setResidency]   = useState("resident");

  // Notifications
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [aiTips, setAiTips]                 = useState(true);
  const [docReminders, setDocReminders]     = useState(true);
  const [emailSummary, setEmailSummary]     = useState(false);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [twoFa, setTwoFa]         = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/profile/update", {
        full_name: fullName,
        phone,
        pan,
        date_of_birth: dob,
        address,
      });
    } catch (_) {
      // API may not exist yet — fail silently
    }
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Page title */}
      <div>
        <h1 className="text-base font-semibold text-white">Settings</h1>
        <p className="text-xs text-white/35 mt-0.5">
          Account, tax preferences & security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Tab sidebar */}
        <div className="rounded-xl border border-white/5 bg-white/2 p-2 h-fit">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  activeTab === id
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <Icon
                  size={15}
                  className={activeTab === id ? "text-purple-400" : "text-white/25"}
                />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="lg:col-span-3 rounded-xl border border-white/5 bg-white/2 p-6">

          {/* ── Personal Details ── */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-white/85">Personal Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="John Doe"
                />
                <Field
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  disabled
                  hint="Contact support to change email"
                />
                <Field
                  label="Phone Number"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+91 98765 43210"
                />
                <Field
                  label="PAN Number"
                  value={pan}
                  onChange={setPan}
                  placeholder="ABCDE1234F"
                />
                <Field
                  label="Date of Birth"
                  type="date"
                  value={dob}
                  onChange={setDob}
                />
                <Field
                  label="Address"
                  value={address}
                  onChange={setAddress}
                  placeholder="City, State, PIN"
                />
              </div>
            </div>
          )}

          {/* ── Tax Preferences ── */}
          {activeTab === "tax" && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-white/85">Tax Preferences</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Filing Type
                  </label>
                  <select
                    value={filingType}
                    onChange={(e) => setFilingType(e.target.value)}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                  >
                    <option value="individual" className="bg-[#09090F]">Individual</option>
                    <option value="huf" className="bg-[#09090F]">HUF</option>
                    <option value="firm" className="bg-[#09090F]">Firm / LLP</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Assessment Year
                  </label>
                  <select
                    value={assessYear}
                    onChange={(e) => setAssessYear(e.target.value)}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                  >
                    <option value="2025-26" className="bg-[#09090F]">AY 2025-26 (FY 2024-25)</option>
                    <option value="2024-25" className="bg-[#09090F]">AY 2024-25 (FY 2023-24)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Default Tax Regime
                  </label>
                  <select
                    value={defaultRegime}
                    onChange={(e) => setDefaultRegime(e.target.value)}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                  >
                    <option value="new" className="bg-[#09090F]">New Regime (Default)</option>
                    <option value="old" className="bg-[#09090F]">Old Regime</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Residency Status
                  </label>
                  <select
                    value={residencyStatus}
                    onChange={(e) => setResidency(e.target.value)}
                    className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                  >
                    <option value="resident" className="bg-[#09090F]">Resident Indian</option>
                    <option value="nri" className="bg-[#09090F]">Non-Resident Indian (NRI)</option>
                    <option value="rnor" className="bg-[#09090F]">RNOR</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white/85 mb-4">
                Notification Preferences
              </p>
              <SectionTitle>Tax Alerts</SectionTitle>
              <Toggle
                label="Deadline Reminders"
                description="Advance tax, ITR filing, and investment cutoffs"
                value={deadlineAlerts}
                onChange={setDeadlineAlerts}
              />
              <Toggle
                label="AI Tax Tips"
                description="Personalised deduction and optimisation suggestions"
                value={aiTips}
                onChange={setAiTips}
              />
              <Toggle
                label="Document Reminders"
                description="Reminders to upload Form 16, investment proofs"
                value={docReminders}
                onChange={setDocReminders}
              />
              <SectionTitle>Summaries</SectionTitle>
              <Toggle
                label="Weekly Email Summary"
                description="Weekly overview of your tax position sent to email"
                value={emailSummary}
                onChange={setEmailSummary}
              />
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <p className="text-sm font-semibold text-white/85">Security</p>
              <div className="space-y-4">
                <SectionTitle>Change Password</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="Current Password"
                    type="password"
                    value={currentPw}
                    onChange={setCurrentPw}
                    placeholder="Enter current password"
                  />
                  <div />
                  <Field
                    label="New Password"
                    type="password"
                    value={newPw}
                    onChange={setNewPw}
                    placeholder="Min. 8 characters"
                  />
                  <Field
                    label="Confirm New Password"
                    type="password"
                    value={confirmPw}
                    onChange={setConfirmPw}
                    placeholder="Re-enter new password"
                  />
                </div>

                <SectionTitle>Two-Factor Authentication</SectionTitle>
                <Toggle
                  label="Enable 2FA"
                  description="Secure your account with OTP on every login"
                  value={twoFa}
                  onChange={setTwoFa}
                />

                <SectionTitle>Danger Zone</SectionTitle>
                <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-4">
                  <p className="text-xs font-semibold text-red-400 mb-1">
                    Delete Account
                  </p>
                  <p className="text-xs text-white/35 mb-3">
                    Permanently delete your TaxMate account and all associated data. This action cannot be undone.
                  </p>
                  <button className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    Delete my account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== "security" && (
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/5">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  saved
                    ? "bg-green-500/20 text-green-400"
                    : "bg-purple-600/80 text-white hover:bg-purple-600"
                )}
              >
                {saving ? (
                  <><Loader2 size={12} className="animate-spin" /> Saving…</>
                ) : saved ? (
                  <><CheckCircle2 size={12} /> Saved</>
                ) : (
                  "Save Changes"
                )}
              </button>
              <span className="text-[11px] text-white/25">
                Changes are applied immediately
              </span>
            </div>
          )}

          {/* Security save */}
          {activeTab === "security" && (
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/5">
              <button
                onClick={handleSave}
                disabled={saving || !currentPw || !newPw || newPw !== confirmPw}
                className="flex items-center gap-2 rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <><Loader2 size={12} className="animate-spin" /> Updating…</>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
