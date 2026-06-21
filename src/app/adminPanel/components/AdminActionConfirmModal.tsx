import { AlertTriangle, X } from "lucide-react";

type AdminActionConfirmModalProps = {
  open: boolean;
  title: string;
  actionLabel: string;
  description: string;
  target?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminActionConfirmModal({
  open,
  title,
  actionLabel,
  description,
  target,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: AdminActionConfirmModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-white shadow-2xl overflow-hidden"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-action-confirm-title"
        >
          <div className="flex items-start gap-3 border-b border-border px-5 py-4">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${destructive ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
              <AlertTriangle size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p id="admin-action-confirm-title" className="text-sm font-black text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              {target && (
                <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground">
                  {target}
                </p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Cancel confirmation"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 bg-muted/20 px-5 py-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white ${destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-[#6B0E1A] hover:bg-[#581018]"}`}
            >
              {confirmLabel || actionLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
