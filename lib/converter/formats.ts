/**
 * Converter format detection — pure, unit-tested. Matches by MIME type first,
 * then file extension. See docs/AGENT_EXTRAS.md (section A).
 */

export type ConverterFormat = "pdf" | "docx" | "xlsx" | "csv" | "txt" | "md" | "html";

export const SUPPORTED_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "txt",
  "md",
  "markdown",
  "html",
  "htm",
] as const;

const MIME_MAP: Record<string, ConverterFormat> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/html": "html",
};

const EXT_MAP: Record<string, ConverterFormat> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  csv: "csv",
  txt: "txt",
  md: "md",
  markdown: "md",
  html: "html",
  htm: "html",
};

/** Resolve a file to a converter format, or null if unsupported. */
export function detectFormat(file: Pick<File, "name" | "type">): ConverterFormat | null {
  const mime = file.type.toLowerCase();
  if (MIME_MAP[mime]) return MIME_MAP[mime];
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  return EXT_MAP[ext] ?? null;
}

/** Human label for a format (used in UI copy). */
export function formatLabel(format: ConverterFormat): string {
  return format.toUpperCase();
}
