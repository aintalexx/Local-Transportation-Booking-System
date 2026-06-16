// ─── Canonical status keys ──────────────────────────────────────────────────
export type StatusKey =
  | "Active"
  | "Approved"
  | "Pending"
  | "Ongoing"
  | "Completed"
  | "Cancelled"
  | "Blocked";

// ─── Status badge config ─────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  StatusKey,
  { bg: string; border: string; text: string; dot: string; pulse: boolean }
> = {
  Active:    { bg: "bg-green-50",   border: "border-green-200",   text: "text-green-700",   dot: "bg-green-500",   pulse: false },
  Approved:  { bg: "bg-teal-50",    border: "border-teal-200",    text: "text-teal-700",    dot: "bg-teal-500",    pulse: false },
  Pending:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-500",   pulse: true  },
  Ongoing:   { bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    dot: "bg-blue-500",    pulse: true  },
  Completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", pulse: false },
  Cancelled: { bg: "bg-red-50",     border: "border-red-200",     text: "text-red-600",     dot: "bg-red-400",     pulse: false },
  Blocked:   { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-700",    dot: "bg-rose-500",    pulse: false },
};

// ─── Button variants ─────────────────────────────────────────────────────────
export const BTN_BASE = "inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-150 active:scale-95";

export const BTN_PRIMARY   = `${BTN_BASE} px-4 py-2 text-sm text-white shadow-sm hover:opacity-90`;
export const BTN_SECONDARY = `${BTN_BASE} px-4 py-2 text-sm border border-border text-muted-foreground hover:bg-muted hover:text-foreground`;
export const BTN_DANGER    = `${BTN_BASE} px-4 py-2 text-sm text-white shadow-sm hover:opacity-90`;
export const BTN_OUTLINE_SM = `${BTN_BASE} px-3 py-1.5 text-xs border border-border text-muted-foreground hover:bg-muted hover:text-foreground`;
export const BTN_GHOST_LINK = "inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-colors";

// Icon buttons
export const BTN_ICON    = "w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors";
export const BTN_ICON_SM = "w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground transition-colors";

// ─── Card primitives ─────────────────────────────────────────────────────────
export const CARD        = "bg-card border border-border rounded-xl shadow-sm";
export const CARD_HEADER = "px-5 py-4 border-b border-border flex items-center justify-between";

// ─── Table primitives ────────────────────────────────────────────────────────
export const TH = "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap";
export const TD = "px-4 py-3 text-sm text-foreground";

// ─── Typography ──────────────────────────────────────────────────────────────
export const PAGE_TITLE    = "text-xl font-bold text-foreground";
export const PAGE_SUBTITLE = "text-xs text-muted-foreground mt-0.5";
export const SECTION_TITLE = "text-sm font-bold text-foreground";
export const LABEL_TEXT    = "text-xs text-muted-foreground font-medium";
