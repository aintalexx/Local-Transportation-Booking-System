import { useState } from "react";
import { toast } from "sonner";
import {
  User, Bell, Map, Shield, Info,
  Save, RefreshCw, ChevronRight,
  Phone, Mail, Globe, Eye, EyeOff,
  Plus, Trash2, CheckCircle,
} from "lucide-react";
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_OUTLINE_SM,
  CARD, CARD_HEADER, SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE,
} from "../lib/ui";
import { AdminActionConfirmModal } from "../components/AdminActionConfirmModal";
import { logAdminActivity } from "../../utils/adminActivityLogs";

const MAROON = "#6B0E1A";
const GOLD = "#C49A1A";

type SettingsTab = "general" | "notifications" | "routes" | "access" | "about";

const tabs: { key: SettingsTab; label: string; icon: any }[] = [
  { key: "general", label: "General", icon: User },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "routes", label: "Routes", icon: Map },
  { key: "access", label: "Access Control", icon: Shield },
  { key: "about", label: "About", icon: Info },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function FieldRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8 py-3.5 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
      style={{
        background: value ? MAROON : "#D4C5C8",
        height: "22px",
        width: "42px",
      }}
      aria-checked={value}
      role="switch"
    >
      <span
        className="absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform duration-200"
        style={{
          width: "18px",
          height: "18px",
          transform: value ? "translateX(20px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

const routes = [
  { id: 1, name: "PUP Sta. Mesa ↔ V. Mapa LRT", drivers: 8, active: true },
  { id: 2, name: "Pureza ↔ Teresa St", drivers: 5, active: true },
  { id: 3, name: "Teresa St ↔ Pureza LRT", drivers: 6, active: true },
  { id: 4, name: "V. Mapa ↔ Altura St", drivers: 4, active: false },
  { id: 5, name: "Stop and Shop ↔ Bataan St", drivers: 3, active: true },
];

const admins = [
  { name: "Admin User", email: "admin@arangkada.ph", role: "Super Admin", avatar: "AD" },
  { name: "Maria Santos", email: "m.santos@arangkada.ph", role: "Operator", avatar: "MS" },
  { name: "Juan dela Cruz", email: "j.delacruz@arangkada.ph", role: "Monitor", avatar: "JD" },
];

function GeneralTab() {
  const [form, setForm] = useState({
    orgName: "Arangkada Transportation",
    adminEmail: "admin@arangkada.ph",
    phone: "+63 917 123 4567",
    coverage: "Sta. Mesa, Manila",
    timezone: "Asia/Manila",
    showPassword: false,
  });

  function handleSave() {
    void logAdminActivity({
      action: "Record Update",
      actionType: "admin",
      target: "General Settings",
      details: "Updated general admin settings",
    });
    toast.success("Settings saved", {
      description: "General configuration has been updated.",
      duration: 3000,
    });
  }

  return (
    <div className="max-w-xl">
      <SectionTitle>Organization</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        <FieldRow label="Organization Name" sub="Displayed across the dashboard">
          <input
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
            className="w-52 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </FieldRow>
        <FieldRow label="Admin Email" sub="Primary contact for system alerts">
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-muted-foreground" />
            <input
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
              className="w-48 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
        </FieldRow>
        <FieldRow label="Contact Number">
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-muted-foreground" />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-48 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
        </FieldRow>
        <FieldRow label="Coverage Area">
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-muted-foreground" />
            <input
              value={form.coverage}
              onChange={(e) => setForm({ ...form, coverage: e.target.value })}
              className="w-48 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
        </FieldRow>
        <FieldRow label="Timezone">
          <select
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="w-48 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          >
            <option value="Asia/Manila">Asia/Manila (UTC+8)</option>
            <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
          </select>
        </FieldRow>
      </div>

      <SectionTitle>Security</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        <FieldRow label="Admin Password" sub="Last changed 30 days ago">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type={form.showPassword ? "text" : "password"}
                defaultValue="••••••••••"
                className="w-44 px-3 py-1.5 pr-8 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setForm({ ...form, showPassword: !form.showPassword })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {form.showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </FieldRow>
        <FieldRow label="Two-Factor Authentication" sub="Requires OTP on login">
          <Toggle value={true} onChange={() => toast.info("2FA settings updated")} />
        </FieldRow>
        <FieldRow label="Session Timeout" sub="Auto-logout after inactivity">
          <select className="w-36 px-3 py-1.5 text-sm rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring">
            <option>30 minutes</option>
            <option>1 hour</option>
            <option>4 hours</option>
            <option>Never</option>
          </select>
        </FieldRow>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleSave}
          className={BTN_PRIMARY}
          style={{ background: MAROON }}
        >
          <Save size={14} /> Save Changes
        </button>
        <button
          onClick={() => toast.info("Changes discarded")}
          className={BTN_SECONDARY}
        >
          Discard
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newBooking: true, driverApproval: true, cancelledRide: true,
    systemAlert: true, dailyReport: false, weeklyReport: true,
    smsAlerts: false, emailAlerts: true, pushAlerts: true,
  });

  const toggle = (k: keyof typeof prefs) => {
    setPrefs((p) => {
      const next = { ...p, [k]: !p[k] };
      toast.success(`Notification ${next[k] ? "enabled" : "disabled"}`, { duration: 2000 });
      return next;
    });
  };

  return (
    <div className="max-w-xl">
      <SectionTitle>Event Triggers</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        {[
          { key: "newBooking" as const, label: "New Booking", sub: "Alert when a new ride is booked" },
          { key: "driverApproval" as const, label: "Driver Approval Request", sub: "Alert when a driver submits registration" },
          { key: "cancelledRide" as const, label: "Cancelled Ride", sub: "Alert when a passenger cancels" },
          { key: "systemAlert" as const, label: "System Alerts", sub: "Downtime, API errors, GPS failures" },
        ].map(({ key, label, sub }) => (
          <FieldRow key={key} label={label} sub={sub}>
            <Toggle value={prefs[key]} onChange={() => toggle(key)} />
          </FieldRow>
        ))}
      </div>

      <SectionTitle>Reports</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        <FieldRow label="Daily Summary Report" sub="Sent every 11 PM">
          <Toggle value={prefs.dailyReport} onChange={() => toggle("dailyReport")} />
        </FieldRow>
        <FieldRow label="Weekly Analytics Report" sub="Sent every Sunday">
          <Toggle value={prefs.weeklyReport} onChange={() => toggle("weeklyReport")} />
        </FieldRow>
      </div>

      <SectionTitle>Delivery Channels</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        <FieldRow label="Email Notifications" sub="admin@arangkada.ph">
          <Toggle value={prefs.emailAlerts} onChange={() => toggle("emailAlerts")} />
        </FieldRow>
        <FieldRow label="SMS Notifications" sub="+63 917 123 4567">
          <Toggle value={prefs.smsAlerts} onChange={() => toggle("smsAlerts")} />
        </FieldRow>
        <FieldRow label="Push Notifications" sub="Browser push alerts">
          <Toggle value={prefs.pushAlerts} onChange={() => toggle("pushAlerts")} />
        </FieldRow>
      </div>
    </div>
  );
}

function RoutesTab() {
  const [routeList, setRouteList] = useState(routes);
  const [adding, setAdding] = useState(false);
  const [newRoute, setNewRoute] = useState("");
  const [deleteRouteId, setDeleteRouteId] = useState<number | null>(null);

  function toggleRoute(id: number) {
    setRouteList((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, active: !r.active };
        toast.success(`Route ${next.active ? "activated" : "deactivated"}`, {
          description: r.name,
          duration: 2500,
        });
        void logAdminActivity({
          action: "Record Update",
          actionType: "system",
          target: r.name,
          details: `Route ${next.active ? "activated" : "deactivated"}`,
        });
        return next;
      })
    );
  }

  function addRoute() {
    if (!newRoute.trim()) return;
    const routeName = newRoute.trim();
    setRouteList((prev) => [...prev, { id: Date.now(), name: routeName, drivers: 0, active: true }]);
    void logAdminActivity({
      action: "Record Update",
      actionType: "system",
      target: routeName,
      details: "Added route record",
    });
    toast.success("Route added", { description: routeName, duration: 2500 });
    setNewRoute("");
    setAdding(false);
  }

  function removeRoute(id: number) {
    const route = routeList.find((r) => r.id === id);
    setRouteList((prev) => prev.filter((r) => r.id !== id));
    void logAdminActivity({
      action: "Record Deletion",
      actionType: "system",
      target: route?.name || `Route ${id}`,
      details: "Deleted route record",
    });
    toast.error("Route removed", { description: route?.name, duration: 2500 });
  }

  const routeToDelete = routeList.find((route) => route.id === deleteRouteId) || null;

  return (
    <div className="max-w-xl">
      <SectionTitle>Managed Routes</SectionTitle>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {routeList.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
              <div className={`w-2 h-2 rounded-full shrink-0 ${r.active ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.drivers} assigned driver{r.drivers !== 1 ? "s" : ""}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${r.active ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground"}`}>
                {r.active ? "Active" : "Inactive"}
              </span>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Toggle value={r.active} onChange={() => toggleRoute(r.id)} />
                <button
                  onClick={() => setDeleteRouteId(r.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {adding ? (
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-muted/30">
            <input
              autoFocus
              value={newRoute}
              onChange={(e) => setNewRoute(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addRoute(); if (e.key === "Escape") setAdding(false); }}
              placeholder="e.g. Magsaysay Blvd ↔ Altura St"
              className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addRoute} className={BTN_OUTLINE_SM + " text-white hover:text-white"} style={{ background: MAROON, borderColor: MAROON }}>
              Add
            </button>
            <button onClick={() => setAdding(false)} className={BTN_OUTLINE_SM}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-t border-border"
          >
            <Plus size={13} /> Add new route
          </button>
        )}
      </div>

      <AdminActionConfirmModal
        open={Boolean(routeToDelete)}
        title="Delete Record"
        actionLabel="Delete route record"
        description="This will remove the selected route record from the settings list."
        target={routeToDelete?.name}
        confirmLabel="Delete Record"
        destructive
        onConfirm={() => {
          if (routeToDelete) removeRoute(routeToDelete.id);
          setDeleteRouteId(null);
        }}
        onCancel={() => setDeleteRouteId(null)}
      />

      <div className="mt-4 p-4 rounded-xl border border-border bg-card flex items-start gap-3">
        <Map size={14} className="mt-0.5 shrink-0" style={{ color: GOLD }} />
        <div>
          <p className="text-xs font-bold text-foreground">Route Changes Take Effect Immediately</p>
          <p className="text-xs text-muted-foreground mt-0.5">Deactivating a route removes it from driver assignment options but does not affect ongoing rides.</p>
        </div>
      </div>
    </div>
  );
}

function AccessTab() {
  const [adminList, setAdminList] = useState(admins);
  const [deletedAdmins, setDeletedAdmins] = useState<typeof admins>([]);
  const [adminToRemoveEmail, setAdminToRemoveEmail] = useState<string | null>(null);

  function removeAdmin(email: string) {
    const admin = adminList.find((a) => a.email === email);
    if (!admin) return;
    setAdminList((prev) => prev.filter((a) => a.email !== email));
    setDeletedAdmins((prev) => [{ ...admin }, ...prev.filter((a) => a.email !== email)]);
    void logAdminActivity({
      action: "Admin Management Action",
      actionType: "admin",
      target: `${admin.name} (${admin.email})`,
      details: "Removed admin access",
    });
    toast.error("User archived", { description: email, duration: 2500 });
  }

  function restoreAdmin(email: string) {
    const admin = deletedAdmins.find((a) => a.email === email);
    if (!admin) return;
    setDeletedAdmins((prev) => prev.filter((a) => a.email !== email));
    setAdminList((prev) => [...prev, admin]);
    void logAdminActivity({
      action: "Admin Management Action",
      actionType: "admin",
      target: `${admin.name} (${admin.email})`,
      details: "Restored admin access",
    });
    toast.success("Admin restored", { description: email, duration: 2500 });
  }

  const adminToRemove = adminList.find((admin) => admin.email === adminToRemoveEmail) || null;

  const roleColors: Record<string, string> = {
    "Super Admin": "bg-red-50 text-red-700 border-red-200",
    "Operator": "bg-amber-50 text-amber-700 border-amber-200",
    "Monitor": "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="max-w-xl">
      <SectionTitle>Admin Accounts</SectionTitle>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border">
          {adminList.map((a) => (
            <div key={a.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                style={{ background: MAROON }}>
                {a.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.email}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${roleColors[a.role] || ""}`}>
                {a.role}
              </span>
              {a.role !== "Super Admin" && (
                <button
                  onClick={() => setAdminToRemoveEmail(a.email)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => toast.info("Invite flow coming soon", { description: "User invitation is in development.", duration: 3000 })}
          className="w-full flex items-center gap-2 px-5 py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-t border-border"
        >
          <Plus size={13} /> Invite new admin
        </button>
      </div>

      <AdminActionConfirmModal
        open={Boolean(adminToRemove)}
        title="Remove Admin"
        actionLabel="Remove admin"
        description="This will suspend admin access and move the admin account out of the active access list."
        target={adminToRemove ? `${adminToRemove.name} (${adminToRemove.email})` : ""}
        confirmLabel="Remove Admin"
        destructive
        onConfirm={() => {
          if (adminToRemove) removeAdmin(adminToRemove.email);
          setAdminToRemoveEmail(null);
        }}
        onCancel={() => setAdminToRemoveEmail(null)}
      />

      {deletedAdmins.length > 0 && (
        <>
          <SectionTitle>Archived Admin Accounts</SectionTitle>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {deletedAdmins.map((a) => (
                <div key={a.email} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 opacity-60"
                    style={{ background: MAROON }}>
                    {a.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                  <button
                    onClick={() => restoreAdmin(a.email)}
                    className={BTN_OUTLINE_SM}
                  >
                    <RefreshCw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <SectionTitle>Role Permissions</SectionTitle>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {[
          { role: "Super Admin", perms: ["Full system access", "User management", "Route control", "Data export"] },
          { role: "Operator", perms: ["Driver approval", "Booking monitoring", "Live map", "Analytics view"] },
          { role: "Monitor", perms: ["Read-only dashboard", "Live map view", "Analytics view"] },
        ].map(({ role, perms }, i) => (
          <div key={role} className={`px-5 py-4 ${i < 2 ? "border-b border-border" : ""}`}>
            <p className="text-sm font-bold text-foreground mb-2">{role}</p>
            <div className="flex flex-wrap gap-1.5">
              {perms.map((p) => (
                <span key={p} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                  <CheckCircle size={10} style={{ color: MAROON }} /> {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function AboutTab() {
  return (
    <div className="max-w-xl">
      <div className="bg-card border border-border rounded-xl p-6 flex items-center gap-5 mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 text-2xl" style={{ background: MAROON }}>
          🚐
        </div>
        <div>
          <p className="text-lg font-bold text-foreground" style={{ fontFamily: "'Noto Serif Display', serif" }}>Arangkada</p>
          <p className="text-xs text-muted-foreground mt-0.5">Local Transportation Booking & Tracking System</p>
          <p className="text-xs font-bold mt-1" style={{ color: GOLD }}>Version 1.0.0 · June 2025</p>
        </div>
      </div>
      <SectionTitle>System Information</SectionTitle>
      <div className="bg-card border border-border rounded-xl px-5 divide-y divide-border">
        {[
          { label: "System Version", value: "1.0.0-capstone" },
          { label: "Build Date", value: "June 14, 2025" },
          { label: "Server Uptime", value: "99.7% this month" },
          { label: "Database", value: "PostgreSQL 16.2" },
          { label: "GPS Provider", value: "Arangkada GPS Module v2" },
          { label: "Coverage Area", value: "Sta. Mesa, Manila, Philippines" },
          { label: "Total Drivers", value: "7 registered" },
          { label: "Total Routes", value: "5 active routes" },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>
      <SectionTitle>Development Team</SectionTitle>
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Arangkada is a university capstone project developed for the Bachelor of Science in Information Technology program.
          This system was designed to address local transportation management challenges in Sta. Mesa, Manila, Philippines — covering PUP and surrounding barangays.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => toast.info("Documentation link not yet available.")}
            className={BTN_OUTLINE_SM}
          >
            <Info size={12} /> View Docs
          </button>
          <button
            onClick={() => toast.info("Checking for updates…", { duration: 2000 })}
            className={BTN_OUTLINE_SM}
          >
            <RefreshCw size={12} /> Check for Updates
          </button>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const tabContent: Record<SettingsTab, React.ReactNode> = {
    general: <GeneralTab />,
    notifications: <NotificationsTab />,
    routes: <RoutesTab />,
    access: <AccessTab />,
    about: <AboutTab />,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className={PAGE_TITLE}>Settings</h1>
        <p className={PAGE_SUBTITLE}>System configuration and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  activeTab === key
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={activeTab === key ? { background: MAROON } : {}}
              >
                <Icon size={15} />
                {label}
                {activeTab === key && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
}
