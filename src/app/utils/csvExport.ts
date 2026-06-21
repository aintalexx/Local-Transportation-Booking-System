type CsvCell = string | number | boolean | null | undefined;

export type CsvRow = Record<string, CsvCell>;

function escapeCsvCell(value: CsvCell): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ];

  return lines.join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvRow[], titleLines: string[] = []): boolean {
  if (rows.length === 0) return false;

  const csv = [...titleLines, buildCsv(rows)].filter(Boolean).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}

export function createCsvFilename(prefix: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}_${timestamp}.csv`;
}

export function formatExportTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = pad(date.getMinutes());
  const suffix = hours24 >= 12 ? "PM" : "AM";
  return `${year}-${month}-${day} ${pad(hours12)}:${minutes} ${suffix}`;
}
