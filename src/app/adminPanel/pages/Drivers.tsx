import { useState } from "react";
import {
  Search, Filter, Eye, Check, X, ChevronDown,
  UserCheck, Star, ArrowUpRight, Download,
  CheckCircle, XCircle, ShieldOff, MapPin,
} from "lucide-react";
import { useNavigate } from "../context/NavigationContext";
import { useAppState } from "../context/AppStateContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BTN_OUTLINE_SM,
  BTN_ICON_SM, CARD, CARD_HEADER,
  SECTION_TITLE, PAGE_TITLE, PAGE_SUBTITLE, TH, TD,
} from "../lib/ui";
import { toast } from "sonner";

const MAROON = "#6B0E1A";
const GOLD   = "#C49A1A";

// Flash-row background by hint type
const FLASH_BG: Record<string, string> = {
  success: "bg-green-50  ring-1 ring-green-300",
  warning: "bg-amber-50  ring-1 ring-amber-300",
  error:   "bg-rose-50   ring-1 ring-rose-300",
};

const TABS = ["All", "Active", "Pending", "Blocked"] as const;
type TabKey = typeof TABS[number];

export function Drivers() {
  const { navigate } = useNavigate();
  const {
    drivers, recentChanges,
    approveDriver, rejectDriver, blockDriver, reinstateDriver, approveBatch,
    pendingDriverCount,
  } = useAppState();

  const [search,   setSearch]   = useState("");
  const [tab,      setTab]      = useState<TabKey>("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);
  // Track which IDs are confirming a destructive action
  const [confirming, setConfirming] = useState<Record<string, "block" | "reject">>({});

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      d.name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.plate.toLowerCase().includes(q);
    const matchTab =
      tab === "All"     ? true :
      tab === "Active"  ? d.status === "Active"  :
      tab === "Pending" ? d.status === "Pending" :
                          d.status === "Blocked";
    return matchSearch && matchTab;
  });

  const selectedDriver = drivers.find((d) => d.id === selected);

  // ─── Confirmation helpers ─────────────────────────────────────────────────
  function requestConfirm(id: string, action: "block" | "reject") {
    setConfirming((prev) => ({ ...prev, [id]: action }));
    // Auto-cancel after 4 s
    setTimeout(() => setConfirming((prev) => {
      const next = { ...prev }; delete next[id]; return next;
    }), 4000);
  }

  function cancelConfirm(id: string) {
    setConfirming((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  function confirmAction(id: string) {
    const action = confirming[id];
    cancelConfirm(id);
    if (action === "block")  blockDriver(id);
    if (action === "reject") { rejectDriver(id); setSelected(null); }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Driver Management</h1>
          <p className={PAGE_SUBTITLE}>{drivers.length} total drivers registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.info("Generating export…", { description: "Driver list CSV will be ready shortly.", duration: 3000 })}
            className={BTN_SECONDARY}
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={approveBatch}
            className={`${BTN_PRIMARY} relative`}
            style={{ background: MAROON }}
          >
            <UserCheck size={14} />
            Approve All Pending
            {pendingDriverCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-white font-bold rounded-full transition-all duration-300"
                style={{ background: GOLD, width: 18, height: 18, fontSize: 10 }}
              >
                {pendingDriverCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary count cards */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: "Active Drivers",   key: "Active"  as const, bg: "bg-green-50 border-green-200", text: "text-green-700" },
          { label: "Pending Approval", key: "Pending" as const, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
          { label: "Blocked Drivers",  key: "Blocked" as const, bg: "bg-rose-50  border-rose-200",  text: "text-rose-700"  },
        ]).map((c) => (
          <button
            key={c.label}
            onClick={() => setTab(c.key)}
            className={`border rounded-xl px-4 py-3 text-left hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all duration-150 ${c.bg} ${tab === c.key ? "ring-2 ring-current/30" : ""}`}
          >
            <p className={`text-2xl font-bold transition-all duration-300 ${c.text}`}>
              {drivers.filter((d) => d.status === c.key).length}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className={`${CARD} overflow-hidden`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  tab === t ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={tab === t ? { background: MAROON } : {}}
              >
                {t}
                {t === "Pending" && pendingDriverCount > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white inline-block transition-all duration-300"
                    style={{ background: GOLD }}
                  >
                    {pendingDriverCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver or plate…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring w-48 transition-shadow"
              />
            </div>
            <button className={BTN_OUTLINE_SM}>
              <Filter size={12} /> Filter <ChevronDown size={10} />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No drivers match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Driver", "Vehicle & Plate", "Route", "Rides", "Rating", "Status", "License", "Actions"].map((h) => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((d) => {
                  const flash     = recentChanges[d.id];
                  const isSelected = selected === d.id;
                  const isConfirming = !!confirming[d.id];
                  return (
                    <tr
                      key={d.id}
                      className={`transition-all duration-500 ${
                        flash        ? FLASH_BG[flash] :
                        isSelected   ? "bg-primary/[0.04]" :
                        isConfirming ? "bg-rose-50/60" :
                        "hover:bg-muted/30"
                      }`}
                    >
                      {/* Driver */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: d.bg }}
                          >
                            {d.photo}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{d.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.id}</p>
                          </div>
                        </div>
                      </td>
                      {/* Vehicle */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{d.vehicle}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.plate}</p>
                      </td>
                      {/* Route */}
                      <td className={TD}>{d.route}</td>
                      {/* Rides */}
                      <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{d.rides.toLocaleString()}</td>
                      {/* Rating */}
                      <td className="px-4 py-3">
                        {d.rating > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: GOLD }}>
                            <Star size={12} fill={GOLD} color={GOLD} /> {d.rating}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      {/* License */}
                      <td className="px-4 py-3">
                        <StatusBadge status={d.license} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-rose-600 mr-1">
                              {confirming[d.id] === "block" ? "Block?" : "Reject?"}
                            </span>
                            <button
                              onClick={() => confirmAction(d.id)}
                              className={`${BTN_ICON_SM} text-white bg-rose-500 border-rose-500 hover:bg-rose-600`}
                              title="Confirm"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => cancelConfirm(d.id)}
                              className={`${BTN_ICON_SM} hover:text-foreground`}
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelected(isSelected ? null : d.id)}
                              className={`${BTN_ICON_SM} ${isSelected ? "border-primary text-primary bg-primary/8" : "hover:text-primary hover:border-primary"}`}
                              title="View profile"
                            >
                              <Eye size={13} />
                            </button>
                            {d.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => approveDriver(d.id)}
                                  className={`${BTN_ICON_SM} text-green-600 border-green-200 bg-green-50 hover:bg-green-100`}
                                  title="Approve"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => requestConfirm(d.id, "reject")}
                                  className={`${BTN_ICON_SM} text-red-500 border-red-200 bg-red-50 hover:bg-red-100`}
                                  title="Reject application"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            )}
                            {d.status === "Active" && (
                              <button
                                onClick={() => requestConfirm(d.id, "block")}
                                className={`${BTN_ICON_SM} hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50`}
                                title="Block driver"
                              >
                                <ShieldOff size={13} />
                              </button>
                            )}
                            {d.status === "Blocked" && (
                              <button
                                onClick={() => reinstateDriver(d.id)}
                                className={`${BTN_ICON_SM} text-green-600 border-green-200 bg-green-50 hover:bg-green-100`}
                                title="Reinstate driver"
                              >
                                <CheckCircle size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver profile panel */}
      {selectedDriver && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <h3 className={SECTION_TITLE}>Driver Profile</h3>
              <span className="text-xs font-mono text-muted-foreground">{selectedDriver.id}</span>
              <StatusBadge status={selectedDriver.status} />
            </div>
            <button onClick={() => setSelected(null)} className={`${BTN_ICON_SM} hover:text-foreground`} title="Close">
              <X size={14} />
            </button>
          </div>

          <div className="p-5 flex gap-5">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: selectedDriver.bg }}
            >
              {selectedDriver.photo}
            </div>
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4">
              {[
                { label: "Full Name",      value: selectedDriver.name },
                { label: "Vehicle",        value: `${selectedDriver.vehicle} · ${selectedDriver.plate}` },
                { label: "Assigned Route", value: selectedDriver.route },
                { label: "Phone",          value: selectedDriver.phone },
                { label: "Member Since",   value: selectedDriver.joined },
                { label: "Total Rides",    value: selectedDriver.rides.toLocaleString() },
                { label: "Rating",         value: selectedDriver.rating > 0 ? `★ ${selectedDriver.rating}` : "No data yet" },
                { label: "License Status", value: selectedDriver.license },
                { label: "License Number", value: selectedDriver.licenseNumber || "N/A" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Section */}
          <div className="border-t border-border p-5 bg-muted/10">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Submitted Documents &amp; Photos</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: "Profile Photo", photo: selectedDriver.profilePhoto },
                { label: "Valid ID / License", photo: selectedDriver.validIdPhoto || selectedDriver.driverLicensePhoto },
                { label: "OR/CR Document", photo: selectedDriver.orCrPhoto },
                { label: "Barangay/NBI Clearance", photo: selectedDriver.clearancePhoto },
                { label: "Vehicle Photo", photo: selectedDriver.vehiclePhoto },
              ].map((doc) => (
                <div key={doc.label} className="border border-border rounded-xl p-2 bg-white flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-[10px] font-bold text-muted-foreground mb-2 block truncate w-full">{doc.label}</span>
                  {doc.photo ? (
                    <div 
                      onClick={() => setZoomImage({ url: doc.photo!, title: doc.label })}
                      className="relative group cursor-pointer w-full h-24 rounded-lg overflow-hidden border border-border bg-gray-50 flex items-center justify-center"
                    >
                      <img
                        src={doc.photo}
                        alt={doc.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[10px] text-white font-bold px-2 py-0.5 rounded bg-black/60">View</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                      Not Uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Profile action buttons */}
          <div className="px-5 pb-5 flex items-center gap-2 flex-wrap">
            {selectedDriver.status === "Pending" && (
              <>
                <button
                  onClick={() => { approveDriver(selectedDriver.id); setSelected(null); }}
                  className={BTN_PRIMARY}
                  style={{ background: "#15803d" }}
                >
                  <CheckCircle size={14} /> Approve Driver
                </button>
                <button
                  onClick={() => { requestConfirm(selectedDriver.id, "reject"); }}
                  className={BTN_DANGER}
                  style={{ background: "#dc2626" }}
                >
                  <XCircle size={14} /> Reject Application
                </button>
              </>
            )}
            {selectedDriver.status === "Active" && (
              <>
                <button
                  onClick={() => requestConfirm(selectedDriver.id, "block")}
                  className={BTN_SECONDARY}
                >
                  <ShieldOff size={14} /> Block Driver
                </button>
                <button onClick={() => navigate("map")} className={BTN_SECONDARY}>
                  <MapPin size={14} /> View on Map
                </button>
              </>
            )}
            {selectedDriver.status === "Blocked" && (
              <button
                onClick={() => { reinstateDriver(selectedDriver.id); setSelected(null); }}
                className={BTN_PRIMARY}
                style={{ background: "#15803d" }}
              >
                <CheckCircle size={14} /> Reinstate Driver
              </button>
            )}

            {/* Inline confirmation in profile panel */}
            {confirming[selectedDriver.id] && (
              <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg ml-2">
                <span className="text-xs font-semibold text-rose-700">
                  {confirming[selectedDriver.id] === "block" ? "Block this driver?" : "Reject application?"}
                </span>
                <button
                  onClick={() => confirmAction(selectedDriver.id)}
                  className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => cancelConfirm(selectedDriver.id)}
                  className="px-2.5 py-1 rounded-md border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full screen Zoom overlay */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-neutral-900 rounded-xl overflow-hidden p-2 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white px-2 pb-2">
              <span className="text-sm font-bold">{zoomImage.title}</span>
              <button onClick={() => setZoomImage(null)} className="text-white hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <img src={zoomImage.url} alt={zoomImage.title} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
