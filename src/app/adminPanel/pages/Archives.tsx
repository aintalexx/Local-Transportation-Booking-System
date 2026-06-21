import { useEffect, useState } from "react";
import {
  Search, RotateCcw, X, Archive, User, Car,
  IdCard, Phone as PhoneIcon, Calendar, Hash, Eye,
  FileText, ClipboardList,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";
import {
  CARD, PAGE_TITLE, PAGE_SUBTITLE, BTN_OUTLINE_SM,
} from "../lib/ui";
import type { Driver } from "../context/AppStateContext";
import { supabase } from "../../lib/supabase";
import { getAllUsersIncludingDeleted, restoreUser } from "../../utils/userDatabase";
import { isSoftDeletedRecord, restoreSupabaseRecord, type SoftDeleteTable } from "../../utils/softDelete";

type DeletedRecordKind = "Passenger" | "Booking" | "Rating" | "Admin";
type DeletedRecord = {
  id: string;
  type: DeletedRecordKind;
  label: string;
  detail: string;
  source: "local" | "supabase";
  table?: SoftDeleteTable;
};

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
              style={{ background: driver.bg || "#6B0E1A" }}
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
  const [deletedRecords, setDeletedRecords] = useState<DeletedRecord[]>([]);
  const [restoringRecord, setRestoringRecord] = useState<string | null>(null);

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

  async function loadDeletedRecords() {
    const localDeleted: DeletedRecord[] = getAllUsersIncludingDeleted()
      .filter(user => user.role !== "driver" && isSoftDeletedRecord(user))
      .map(user => ({
        id: user.username,
        type: user.role === "admin" ? "Admin" : "Passenger",
        label: `${user.firstName || ""} ${user.surname || ""}`.trim() || user.username,
        detail: user.email || user.phoneNumber || user.username,
        source: "local" as const,
      }));

    const supabaseDeleted: DeletedRecord[] = [];
    if (supabase) {
      const [profilesResult, bookingsResult, ratingsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, role, full_name, email, phone, deleted_at")
          .eq("is_deleted", true)
          .in("role", ["passenger", "admin"]),
        supabase
          .from("bookings")
          .select("id, passenger_name, pickup_address, destination_address, deleted_at")
          .eq("is_deleted", true),
        supabase
          .from("ratings")
          .select("id, booking_id, rating, feedback, deleted_at")
          .eq("is_deleted", true),
      ]);

      ((profilesResult.data || []) as any[]).forEach((row) => {
        supabaseDeleted.push({
          id: row.id,
          type: row.role === "admin" ? "Admin" : "Passenger",
          label: row.full_name || row.email || row.phone || row.id,
          detail: row.email || row.phone || "Profile record",
          source: "supabase",
          table: "profiles",
        });
      });

      ((bookingsResult.data || []) as any[]).forEach((row) => {
        supabaseDeleted.push({
          id: row.id,
          type: "Booking",
          label: row.passenger_name || row.id,
          detail: `${row.pickup_address || "Pickup"} to ${row.destination_address || "Destination"}`,
          source: "supabase",
          table: "bookings",
        });
      });

      ((ratingsResult.data || []) as any[]).forEach((row) => {
        supabaseDeleted.push({
          id: row.id,
          type: "Rating",
          label: `Rating ${row.rating || ""}`.trim(),
          detail: row.feedback || `Booking ${row.booking_id || row.id}`,
          source: "supabase",
          table: "ratings",
        });
      });
    }

    setDeletedRecords([...supabaseDeleted, ...localDeleted]);
  }

  useEffect(() => {
    void loadDeletedRecords();
  }, []);

  function handleRestore(id: string) {
    restoreDriver(id);
    if (detailId === id) setDetailId(null);
  }

  async function handleRestoreRecord(record: DeletedRecord) {
    setRestoringRecord(record.id);
    try {
      if (record.source === "local") {
        restoreUser(record.id);
      } else if (record.table) {
        const result = await restoreSupabaseRecord(record.table, record.id, {
          ...(record.table === "profiles" ? { account_status: "Active" } : {}),
        });
        if (!result.success) throw new Error(result.error);
      }
      await loadDeletedRecords();
    } catch (error) {
      console.error("Failed to restore soft-deleted record:", error);
    } finally {
      setRestoringRecord(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={PAGE_TITLE}>Archives</h1>
          <p className={PAGE_SUBTITLE}>
            {archivedDrivers.length} soft-deleted driver account{archivedDrivers.length !== 1 ? "s" : ""} ready for recovery
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
            You can restore them at any time to make them active again.
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
                          style={{ background: d.bg || "#6B0E1A" }}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div>
            <p className="text-sm font-black text-foreground">Other Deleted Records</p>
            <p className="text-xs text-muted-foreground mt-0.5">Passengers, bookings, ratings, and admin profiles marked for recovery.</p>
          </div>
          <span className="text-xs text-muted-foreground">{deletedRecords.length} record{deletedRecords.length !== 1 ? "s" : ""}</span>
        </div>

        {deletedRecords.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No other soft-deleted records.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Type", "Record", "Details", "Source", "Action"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deletedRecords.map(record => (
                  <tr key={`${record.source}-${record.type}-${record.id}`} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-700">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{record.label}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{record.id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-sm truncate">{record.detail}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground capitalize">{record.source}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handleRestoreRecord(record)}
                        disabled={restoringRecord === record.id}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-60 transition-colors"
                      >
                        <RotateCcw size={12} /> {restoringRecord === record.id ? "Restoring" : "Restore"}
                      </button>
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
