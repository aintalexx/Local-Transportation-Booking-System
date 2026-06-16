import { STATUS_CONFIG, type StatusKey } from "../../lib/ui";

export type { StatusKey };

export function StatusBadge({ status }: { status: StatusKey }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}${c.pulse ? " animate-pulse" : ""}`}
      />
      {status}
    </span>
  );
}
