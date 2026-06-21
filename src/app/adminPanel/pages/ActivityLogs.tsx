import { useEffect, useState } from "react";
import { FileClock, RefreshCw } from "lucide-react";
import { useUser } from "../../context/UserContext";
import {
  getAdminActivityLogs,
  isSuperAdmin,
  type AdminActivityLog,
} from "../../utils/adminActivityLogs";
import {
  BTN_OUTLINE_SM, CARD, PAGE_SUBTITLE, PAGE_TITLE, TD, TH,
} from "../lib/ui";

function formatLogTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeBadge(type: AdminActivityLog["actionType"]): string {
  const config: Record<AdminActivityLog["actionType"], string> = {
    admin: "bg-red-50 text-red-700 border-red-200",
    driver: "bg-amber-50 text-amber-700 border-amber-200",
    user: "bg-blue-50 text-blue-700 border-blue-200",
    system: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return config[type] || config.system;
}

export function ActivityLogs() {
  const { user } = useUser();
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    try {
      setLogs(await getAdminActivityLogs(user));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, [user]);

  const canViewAll = isSuperAdmin(user);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className={PAGE_TITLE}>Activity Logs</h1>
          <p className={PAGE_SUBTITLE}>
            {canViewAll ? "Showing all administrative activity." : "Showing your administrative activity only."}
          </p>
        </div>
        <button onClick={() => void loadLogs()} className={BTN_OUTLINE_SM} disabled={loading}>
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FileClock size={15} className="text-muted-foreground" />
            <p className="text-sm font-black text-foreground">Administrative Activity</p>
          </div>
          <span className="text-xs text-muted-foreground">
            {logs.length} log{logs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Loading activity logs...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <FileClock size={36} className="text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No activity logs yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Critical admin actions will appear here after they are performed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Action", "Type", "Target Record", "Admin", "Timestamp", "Details"].map((header) => (
                    <th key={header} className={TH}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className={TD}>
                      <p className="font-semibold">{log.action}</p>
                    </td>
                    <td className={TD}>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${typeBadge(log.actionType)}`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className={`${TD} max-w-xs`}>
                      <p className="truncate">{log.target}</p>
                    </td>
                    <td className={`${TD} max-w-xs`}>
                      <p className="truncate">{log.adminLabel}</p>
                      {log.adminId && <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{log.adminId}</p>}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-muted-foreground`}>{formatLogTime(log.timestamp)}</td>
                    <td className={`${TD} max-w-sm text-muted-foreground`}>
                      <p className="truncate">{log.details || "-"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
