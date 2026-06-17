import { useState } from "react";
import {
  Search, RotateCcw, Trash2, X, Archive, User, Car,
  IdCard, Phone as PhoneIcon, Calendar, Hash, Eye,
  FileText, ClipboardList, ChevronDown, Filter,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  CARD, PAGE_TITLE, PAGE_SUBTITLE, TH, BTN_OUTLINE_SM,
} from "../lib/ui";
import { toast } from "sonner";
import type { Driver } from "../context/AppStateContext";

const MAROON = "#6B0E1A";
const GOLD   = "#C49A1A";

// ─── Driver Detail Mini-Modal (for Archives) ───────────────────────────────────
function ArchiveDetailModal({
  driver,
  onClose,
  onRestore,
}: {
  driver: Driver;
  onClose: () => void;
  onRestore: () => void;
}) {
  const [zoomDoc, setZoomDoc] = useState<{ url: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "documents">("overview");

  const docs = [
    { label: "Profile Photo",           photo: driver.profilePhoto,                              icon: <User size={15} /> },
    { label: "Valid ID / License",       photo: driver.validIdPhoto || driver.driverLicensePhoto, icon: <IdCard size={15} /> },
    { label: "OR/CR Document",           photo: driver.orCrPhoto,                                icon: <FileText size={15} /> },
    { label: "Barangay/NBI Clearance",   photo: driver.clearancePhoto,                           icon: <ClipboardList size={15} /> },
    { label: "Vehicle Photo",            photo: driver.vehiclePhoto,                             icon: <Car size={15} /> },
  ];
  const uploadedCount = docs.filter(d => d.photo).length;

  const info = [
    { label: "Full Name",      value: driver.name,              icon: <User size={12} /> },
    { label: "Phone",          value: driver.phone || "—",      icon: <PhoneIcon size={12} /> },
    { label: "Member Since",   value: driver.joined,            icon: <Calendar size={12} /> },
    { label: "Vehicle",        value: driver.vehicle,           icon: <Car size={12} /> },
    { label: "Plate Number",   value: driver.plate,             icon: <Hash size={12} /> },
    { label: "License No.",    value: driver.licenseNumber || "—", icon: <IdCard size={12} /> },
    { label: "Total Rides",    value: driver.rides.toLocaleString(), icon: <Hash size={12} /> },
    { label: "Driver ID",      value: driver.id,                icon: <Hash size={12} /> },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ background: "linear-gradient(135deg, #374151 0%, #1f2937 100%)" }}>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-black shrink-0 border-2 border-white/20 overflow-hidden"
              style={{ background: driver.bg }}
            >
              {driver.profilePhoto
                ? <img src={driver.profilePhoto} alt={driver.name} className="w-full h-full object-cover" />
                : driver.photo
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white truncate">{driver.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-white/60">{driver.id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/30 text-gray-300 font-semibold">
                  Archived
                </span>
                <span className="text-[10px] text-white/50">{uploadedCount}/5 docs</span>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-muted/20 px-6">
            {(["overview", "documents"] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px capitalize transition-colors ${
                  activeTab === t ? "border-gray-700 text-gray-800" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "overview" ? "👤 Overview" : `📄 Documents (${uploadedCount}/5)`}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "overview" && (
              <div className="grid grid-cols-2 gap-3">
                {info.map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-muted/30 border border-border">
                    <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "documents" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {docs.map(doc => (
                  <div key={doc.label} className="rounded-xl border border-border overflow-hidden bg-white">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 border-b border-border">
                      <span className="text-muted-foreground">{doc.icon}</span>
                      <span className="text-[10px] font-bold text-foreground flex-1 truncate">{doc.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 rounded-full ${doc.photo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {doc.photo ? "✓" : "✗"}
                      </span>
                    </div>
                    {doc.photo ? (
                      <button
                        onClick={() => setZoomDoc({ url: doc.photo!, title: doc.label })}
                        className="relative group w-full h-32 overflow-hidden bg-gray-50"
                      >
                        <img src={doc.photo} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="flex items-center gap-1 bg-white/95 text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full">
                            <Eye size={11} /> Zoom
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-gray-50 text-gray-300">
                        <span className="opacity-30">{doc.icon}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-3 bg-muted/20 flex items-center gap-2">
            <button
              onClick={onRestore}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: "#15803d" }}
            >
              <RotateCcw size={14} /> Restore Driver
            </button>
            <button onClick={onClose} className={`${BTN_OUTLINE_SM} ml-auto gap-1`}>
              <X size={12} /> Close
            </button>
          </div>
        </div>
      </div>

      {/* Doc zoom */}
      {zoomDoc && (
        <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoomDoc(null)}>
          <div className="relative max-w-2xl w-full bg-neutral-900 rounded-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white px-4 py-3 border-b border-white/10">
              <span className="text-sm font-bold">{zoomDoc.title}</span>
              <button onClick={() => setZoomDoc(null)}><X size={16} /></button>
            </div>
            <img src={zoomDoc.url} alt={zoomDoc.title} className="max-w-full max-h-[70vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Archives Page ─────────────────────────────────────────────────────────
export function Archives() {
  const { archivedDrivers, restoreDriver } = useAppState();

  const [search,      setSearch]      = useState("");
  const [detailId,    setDetailId]    = useState<string | null>(null);
  const [confirming,  setConfirming]  = useState<string | null>(null); // permanent delete confirm
  const [localArchive, setLocalArchive] = useState<Driver[]>(archivedDrivers);

  // Keep local in sync (restoreDriver updates context; we reflect that here)
  const displayed = archivedDrivers.filter(d => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      d.plate.toLowerCase().includes(q) ||
      d.phone.toLowerCase().includes(q)
    );
  });

  const detailDriver = archivedDrivers.find(d => d.id === detailId) ?? null;

  function handleRestore(id: string) {
    restoreDriver(id);
    if (detailId === id) setDetailId(null);
  }

  function handlePermanentDelete(id: string) {
    if (confirming !== id) {
      setConfirming(id);
      setTimeout(() => setConfirming(null), 4000);
      return;
    }
    // Actually remove from archive permanently
    const updated = archivedDrivers.filter(d => d.id !== id);
    try {
      localStorage.setItem("ridestamesa_archived_drivers", JSON.stringify(updated));
    } catch {}
    // Force re-render by restoring then immediately re-archiving... 
    // Instead: notify user and reload
    toast.success("Driver permanently deleted from archive.");
    window.location.reload(); // simplest approach for permanent delete
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Archives</h1>
          <p className={PAGE_SUBTITLE}>
            {archivedDrivers.length} archived driver account{archivedDrivers.length !== 1 ? "s" : ""} — restore or permanently remove
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 flex items-start gap-3">
        <Archive size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">About Archives</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Archived drivers are removed from active Driver Management but kept here for record-keeping.
            You can restore them at any time to make them active again, or permanently delete their record.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className={`${CARD} overflow-hidden`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, plate, phone…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            {displayed.length} of {archivedDrivers.length} shown
          </span>
        </div>

        {archivedDrivers.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <Archive size={40} className="text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No archived drivers</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              When you archive a driver from the Driver Management page, they will appear here for easy retrieval.
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No results match your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Driver", "Vehicle & Plate", "Phone", "Rides", "Archived Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map(d => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    {/* Driver */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden opacity-70 grayscale"
                          style={{ background: d.bg }}
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
                    {/* Phone */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.phone || "—"}</td>
                    {/* Rides */}
                    <td className="px-4 py-3 text-sm font-semibold font-mono text-foreground">{d.rides.toLocaleString()}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        <Archive size={10} /> Archived
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* View details */}
                        <button
                          onClick={() => setDetailId(d.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                          title="View driver details"
                        >
                          <Eye size={12} /> View
                        </button>
                        {/* Restore */}
                        <button
                          onClick={() => handleRestore(d.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                          title="Restore driver"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        {/* Permanent delete */}
                        {confirming === d.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-rose-600">Delete?</span>
                            <button
                              onClick={() => handlePermanentDelete(d.id)}
                              className="px-2 py-1 rounded-md bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700"
                            >Yes</button>
                            <button
                              onClick={() => setConfirming(null)}
                              className="px-2 py-1 rounded-md border border-rose-300 text-rose-700 text-[10px] font-bold hover:bg-rose-50"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePermanentDelete(d.id)}
                            className="w-7 h-7 rounded-lg border border-rose-200 text-rose-500 bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors"
                            title="Permanently delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailDriver && (
        <ArchiveDetailModal
          driver={detailDriver}
          onClose={() => setDetailId(null)}
          onRestore={() => { handleRestore(detailDriver.id); }}
        />
      )}
    </div>
  );
}
