type NameParts = {
  displayName?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  suffix?: string | null;
};

const EMPTY_SUFFIX_VALUES = new Set(["none", "n/a", "na", "no suffix", "null", "undefined", "-"]);

export function normalizeOptionalSuffix(value?: string | null): string {
  const suffix = (value || "").trim();
  if (!suffix || EMPTY_SUFFIX_VALUES.has(suffix.toLowerCase())) return "";
  return suffix;
}

export function normalizeDisplayName(value?: string | null): string {
  const name = value === null || value === undefined ? "" : String(value);
  return name.replace(/\s+/g, " ").trim();
}

export function formatPersonName(parts?: NameParts | null, fallback = "Guest"): string {
  if (!parts) return fallback;

  const preferredName = normalizeDisplayName(parts.displayName || parts.fullName);
  if (preferredName) return preferredName;

  const name = [
    parts.firstName,
    parts.middleName,
    parts.surname,
    normalizeOptionalSuffix(parts.suffix),
  ]
    .map(part => (part || "").trim())
    .filter(Boolean)
    .join(" ");

  return name || fallback;
}
