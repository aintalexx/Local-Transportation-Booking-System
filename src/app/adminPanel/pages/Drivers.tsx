import { useState } from "react";
import {
  Search, Filter, Eye, Check, X, ChevronDown,
  UserCheck, Star,
  CheckCircle, XCircle, ShieldOff, MapPin,
  User, FileText, Car, Phone as PhoneIcon, Calendar,
  Hash, IdCard, ClipboardList, Archive,
} from "lucide-react";
import { useNavigate } from "../context/NavigationContext";
import { useAppState } from "../context/AppStateContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, BTN_OUTLINE_SM,
  BTN_ICON_SM, CARD,
  PAGE_TITLE, PAGE_SUBTITLE, TH, TD,
} from "../lib/ui";
import { toast } from "sonner";
import type { Driver } from "../context/AppStateContext";

const MAROON = "#6B0E1A";
const GOLD   = "#C49A1A";

const FLASH_BG: Record<string, string> = {
  success: "bg-green-50  ring-1 ring-green-300",
  warning: "bg-amber-50  ring-1 ring-amber-300",
  error:   "bg-rose-50   ring-1 ring-rose-300",
};

const TABS = ["All", "Active", "Pending", "Blocked"] as const;
type TabKey = typeof TABS[number];
type DetailTab = "overview" | "documents";

// ─── Driver Detail Modal ───────────────────────────────────────────────────────
function DriverDetailModal({
  driver,
  onClose,
  onApprove,
  onReject,
  onBlock,
  onReinstate,
  onNavigateMap,
  onArchive,
}: {
  driver: Driver;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onBlock: () => void;
  onReinstate: () => void;
  onNavigateMap: () => void;
  onArchive: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [zoomDoc, setZoomDoc] = useState<{ url: string; title: string } | null>(null);
  const [confirming, setConfirming] = useState<"block" | "reject" | "archive" | null>(null);

  const docs = [
    { label: "Profile Photo",           photo: driver.profilePhoto,                                    icon: <User size={16} /> },
    { label: "OR/CR Document",           photo: driver.orCrPhoto,                                       icon: <FileText size={16} /> },
    { label: "Barangay/NBI Clearance",   photo: driver.clearancePhoto,                                  icon: <ClipboardList size={16} /> },
    { label: "Vehicle / Tricycle Photo", photo: driver.vehiclePhoto,                                    icon: <Car size={16} /> },
  ];

  const uploadedCount = docs.filter(d => d.photo).length;

  const infoFields = [
    { label: "Full Name",       value: driver.name,                              icon: <User size={13} /> },
    { label: "Phone",           value: driver.phone || "—",                      icon: <PhoneIcon size={13} /> },
    { label: "Member Since",    value: driver.joined,                            icon: <Calendar size={13} /> },
    { label: "Vehicle Type",    value: driver.vehicle,                           icon: <Car size={13} /> },
    { label: "Plate Number",    value: driver.plate,                             icon: <Hash size={13} /> },
    { label: "Assigned Route",  value: driver.route,                             icon: <MapPin size={13} /> },
    { label: "Total Rides",     value: driver.rides.toLocaleString(),            icon: <Star size={13} /> },
    { label: "Rating",          value: driver.rating > 0 ? `★ ${driver.rating.toFixed(2)} (${driver.ratingCount || 0} ${driver.ratingCount === 1 ? 'rating' : 'ratings'})` : "No rating yet", icon: <Star size={13} /> },
    { label: "License Number",  value: driver.licenseNumber || "Not provided",   icon: <IdCard size={13} /> },
    { label: "License Status",  value: driver.license,                           icon: <CheckCircle size={13} /> },
    { label: "Account Status",  value: driver.status,                            icon: <ShieldOff size={13} /> },
    { label: "Driver ID",       value: driver.id,                                icon: <Hash size={13} /> },
  ];

  function handleAction(action: "block" | "reject" | "archive") {
    if (confirming === action) {
      if (action === "block")   onBlock();
      if (action === "reject")  onReject();
      if (action === "archive") { onArchive(); onClose(); }
      setConfirming(null);
    } else {
      setConfirming(action);
      setTimeout(() => setConfirming(null), 4000);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Modal Header ── */}
          <div
            className="flex items-center gap-4 px-6 py-4 border-b border-border"
            style={{ background: "linear-gradient(135deg, #6B0E1A 0%, #9f1239 100%)" }}
          >
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg border-2 border-white/30"
              style={{ background: driver.bg || MAROON }}
            >
              {driver.profilePhoto ? (
                <img src={driver.profilePhoto} alt={driver.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                driver.photo
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-white leading-tight truncate">{driver.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-mono text-white/70">{driver.id}</span>
                <span className="text-white/40">·</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    driver.status === "Active"  ? "bg-green-400/20 text-green-200" :
                    driver.status === "Pending" ? "bg-amber-400/20 text-amber-200" :
                                                  "bg-rose-400/20 text-rose-200"
                  }`}
                >
                  {driver.status}
                </span>
                <span className="text-[11px] font-semibold text-white/60">
                  {uploadedCount}/5 docs uploaded
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex border-b border-border bg-muted/30 px-6">
            {(["overview", "documents"] as DetailTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px capitalize transition-colors ${
                  activeTab === tab
                    ? "border-[#6B0E1A] text-[#6B0E1A]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "overview" ? "👤 Overview" : `📄 Documents (${uploadedCount}/5)`}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="p-6 space-y-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Driver Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {infoFields.map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border"
                    >
                      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick doc preview strip */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Document Preview
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {docs.map(doc => (
                      <div key={doc.label} className="shrink-0 flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (doc.photo) {
                              setZoomDoc({ url: doc.photo, title: doc.label });
                            } else {
                              setActiveTab("documents");
                            }
                          }}
                          className={`w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                            doc.photo
                              ? "border-green-300 hover:border-green-500 cursor-pointer"
                              : "border-dashed border-gray-300 cursor-default"
                          } flex items-center justify-center`}
                        >
                          {doc.photo ? (
                            <img src={doc.photo} alt={doc.label} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-300">{doc.icon}</span>
                          )}
                        </button>
                        <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight max-w-[5rem]">
                          {doc.photo ? "✓" : "✗"} {doc.label.split("/")[0].trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className="mt-3 text-xs font-semibold text-[#6B0E1A] hover:underline"
                  >
                    View full documents →
                  </button>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="p-6 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Submitted Documents & Photos
                </p>

                {uploadedCount === 0 && (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center">
                    <p className="text-sm font-semibold text-amber-700">No documents uploaded yet</p>
                    <p className="text-xs text-amber-600 mt-1">The driver has not submitted any documents. You can still approve or request re-submission.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {docs.map(doc => (
                    <div
                      key={doc.label}
                      className="rounded-xl border border-border bg-white shadow-sm overflow-hidden flex flex-col"
                    >
                      {/* Doc header */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border">
                        <span className="text-muted-foreground">{doc.icon}</span>
                        <span className="text-xs font-bold text-foreground">{doc.label}</span>
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          doc.photo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {doc.photo ? "Uploaded" : "Missing"}
                        </span>
                      </div>

                      {/* Doc image */}
                      {doc.photo ? (
                        <button
                          onClick={() => setZoomDoc({ url: doc.photo!, title: doc.label })}
                          className="relative group w-full h-44 overflow-hidden bg-gray-50"
                        >
                          <img
                            src={doc.photo}
                            alt={doc.label}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                            <span className="flex items-center gap-1.5 bg-white/95 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                              <Eye size={12} /> Click to zoom
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="w-full h-44 flex flex-col items-center justify-center bg-gray-50 text-gray-300">
                          <span className="mb-2 opacity-30 scale-150">{doc.icon}</span>
                          <p className="text-xs text-gray-400 font-medium">No document uploaded</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Modal Footer: Actions ── */}
          <div className="border-t border-border px-6 py-4 bg-muted/20 flex items-center gap-2 flex-wrap">
            {driver.status === "Pending" && (
              <>
                <button
                  onClick={onApprove}
                  className={`${BTN_PRIMARY} gap-2`}
                  style={{ background: "#15803d" }}
                >
                  <CheckCircle size={14} /> Approve Driver
                </button>

                {confirming === "reject" ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-xs font-semibold text-rose-700">Reject this application?</span>
                    <button onClick={() => handleAction("reject")} className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Confirm</button>
                    <button onClick={() => setConfirming(null)} className="px-2.5 py-1 rounded-md border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAction("reject")}
                    className={`${BTN_DANGER} gap-2`}
                    style={{ background: "#dc2626" }}
                  >
                    <XCircle size={14} /> Reject Application
                  </button>
                )}
              </>
            )}

            {driver.status === "Active" && (
              <>
                {confirming === "block" ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-xs font-semibold text-rose-700">Block this driver?</span>
                    <button onClick={() => handleAction("block")} className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-bold hover:bg-rose-700">Confirm</button>
                    <button onClick={() => setConfirming(null)} className="px-2.5 py-1 rounded-md border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => handleAction("block")} className={`${BTN_SECONDARY} gap-2`}>
                    <ShieldOff size={14} /> Block Driver
                  </button>
                )}
                <button onClick={onNavigateMap} className={`${BTN_SECONDARY} gap-2`}>
                  <MapPin size={14} /> View on Map
                </button>
              </>
            )}

            {driver.status === "Blocked" && (
              <button
                onClick={onReinstate}
                className={`${BTN_PRIMARY} gap-2`}
                style={{ background: "#15803d" }}
              >
                <CheckCircle size={14} /> Reinstate Driver
              </button>
            )}

            {/* Archive — available for all statuses */}
            {confirming === "archive" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                <span className="text-xs font-semibold text-gray-700">Move to Archives?</span>
                <button onClick={() => handleAction("archive")} className="px-2.5 py-1 rounded-md bg-gray-700 text-white text-xs font-bold hover:bg-gray-800">Confirm</button>
                <button onClick={() => setConfirming(null)} className="px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => handleAction("archive")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Archive size={13} /> Archive Driver
              </button>
            )}

            <button onClick={onClose} className={`${BTN_OUTLINE_SM} ml-auto gap-1`}>
              <X size={12} /> Close
            </button>
          </div>
        </div>
      </div>

      {/* Document zoom overlay */}
      {zoomDoc && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomDoc(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[85vh] bg-neutral-900 rounded-xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center text-white px-4 py-3 border-b border-white/10">
              <span className="text-sm font-bold">{zoomDoc.title}</span>
              <button onClick={() => setZoomDoc(null)} className="text-white hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <img
              src={zoomDoc.url}
              alt={zoomDoc.title}
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Drivers Page ─────────────────────────────────────────────────────────
export function Drivers() {
  const { navigate } = useNavigate();
  const {
    drivers, recentChanges,
    approveDriver, rejectDriver, blockDriver, reinstateDriver, approveBatch,
    archiveDriver,
    pendingDriverCount,
  } = useAppState();

  const [search,         setSearch]         = useState("");
  const [tab,            setTab]            = useState<TabKey>("All");
  const [modalDriverId,  setModalDriverId]  = useState<string | null>(null);
  const [confirming,     setConfirming]     = useState<Record<string, "block" | "reject">>({});

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

  const modalDriver = drivers.find(d => d.id === modalDriverId) ?? null;

  function requestConfirm(id: string, action: "block" | "reject") {
    setConfirming(prev => ({ ...prev, [id]: action }));
    setTimeout(() => setConfirming(prev => {
      const next = { ...prev }; delete next[id]; return next;
    }), 4000);
  }
  function cancelConfirm(id: string) {
    setConfirming(prev => { const next = { ...prev }; delete next[id]; return next; });
  }
  function confirmAction(id: string) {
    const action = confirming[id];
    cancelConfirm(id);
    if (action === "block")  blockDriver(id);
    if (action === "reject") rejectDriver(id);
  }

  function openModal(id: string) { setModalDriverId(id); }
  function closeModal()          { setModalDriverId(null); }

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
            onClick={approveBatch}
            className={`${BTN_PRIMARY} relative`}
            style={{ background: MAROON }}
          >
            <UserCheck size={14} />
            Approve All Pending
            {pendingDriverCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center text-white font-bold rounded-full"
                style={{ background: GOLD, width: 18, height: 18, fontSize: 10 }}
              >
                {pendingDriverCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: "Active Drivers",   key: "Active"  as const, bg: "bg-green-50 border-green-200", text: "text-green-700" },
          { label: "Pending Approval", key: "Pending" as const, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
          { label: "Blocked Drivers",  key: "Blocked" as const, bg: "bg-rose-50  border-rose-200",  text: "text-rose-700"  },
        ]).map(c => (
          <button
            key={c.label}
            onClick={() => setTab(c.key)}
            className={`border rounded-xl px-4 py-3 text-left hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] transition-all duration-150 ${c.bg} ${tab === c.key ? "ring-2 ring-current/30" : ""}`}
          >
            <p className={`text-2xl font-bold transition-all duration-300 ${c.text}`}>
              {drivers.filter(d => d.status === c.key).length}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={`${CARD} overflow-hidden`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
          <div className="flex gap-1">
            {TABS.map(t => (
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
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white inline-block"
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
                onChange={e => setSearch(e.target.value)}
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
                  {["Driver", "Vehicle & Plate", "Route", "Rides", "Rating", "Status", "License", "Actions"].map(h => (
                    <th key={h} className={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(d => {
                  const flash        = recentChanges[d.id];
                  const isConfirming = !!confirming[d.id];
                  return (
                    <tr
                      key={d.id}
                      className={`transition-all duration-500 ${
                        flash        ? FLASH_BG[flash] :
                        isConfirming ? "bg-rose-50/60" :
                        "hover:bg-muted/30"
                      }`}
                    >
                      {/* Driver */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                            style={{ background: d.bg || MAROON }}
                          >
                            {d.profilePhoto
                              ? <img src={d.profilePhoto} alt={d.name} className="w-full h-full object-cover" />
                              : d.photo
                            }
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
                            <Star size={12} fill={GOLD} color={GOLD} /> {d.rating.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">({d.ratingCount || 0})</span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      {/* License */}
                      <td className="px-4 py-3"><StatusBadge status={d.license} /></td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        {isConfirming ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-rose-600 mr-1">
                              {confirming[d.id] === "block" ? "Block?" : "Reject?"}
                            </span>
                            <button onClick={() => confirmAction(d.id)} className={`${BTN_ICON_SM} text-white bg-rose-500 border-rose-500 hover:bg-rose-600`} title="Confirm">
                              <Check size={13} />
                            </button>
                            <button onClick={() => cancelConfirm(d.id)} className={`${BTN_ICON_SM} hover:text-foreground`} title="Cancel">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {/* ── View Details button ── */}
                            <button
                              onClick={() => openModal(d.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 border-[#6B0E1A]/30 text-[#6B0E1A] bg-[#6B0E1A]/5 hover:bg-[#6B0E1A]/10 hover:border-[#6B0E1A]/50"
                              title="View full driver profile and documents"
                            >
                              <Eye size={12} /> View Details
                            </button>

                            {d.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => approveDriver(d.id)}
                                  className={`${BTN_ICON_SM} text-green-600 border-green-200 bg-green-50 hover:bg-green-100`}
                                  title="Quick approve"
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

      {/* Driver Detail Modal */}
      {modalDriver && (
        <DriverDetailModal
          driver={modalDriver}
          onClose={closeModal}
          onApprove={() => { approveDriver(modalDriver.id); closeModal(); }}
          onReject={() => { rejectDriver(modalDriver.id); closeModal(); }}
          onBlock={() => { blockDriver(modalDriver.id); closeModal(); }}
          onReinstate={() => { reinstateDriver(modalDriver.id); closeModal(); }}
          onNavigateMap={() => {
            navigate("map", {
              mapDriverTarget: {
                id: modalDriver.id,
                name: modalDriver.name,
                phone: modalDriver.phone,
              },
            });
            closeModal();
          }}
          onArchive={() => { archiveDriver(modalDriver.id); closeModal(); }}
        />
      )}
    </div>
  );
}
