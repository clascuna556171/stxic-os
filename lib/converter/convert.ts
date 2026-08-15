/**
 * File→text conversion — client-side only. Parser libraries are dynamically
 * imported so they never enter the initial bundle. Pure dispatch is exported
 * for tests; the heavy parsers (pdf/docx/xlsx) stay behind `import()`.
 * See docs/AGENT_EXTRAS.md (section A).
 */

import { detectFormat, type ConverterFormat } from "./formats";

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface ConvertResult {
  text: string;
  format: ConverterFormat;
  /** True when no text was extracted (e.g. a scanned PDF with no text layer). */
  empty: boolean;
}

/** Return an error string when the file exceeds the size guard, else null. */
export function validateSize(file: Pick<File, "size">): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `File too large (max ${MAX_FILE_BYTES / (1024 * 1024)} MB).`;
  }
  return null;
}

export async function convertFile(file: File): Promise<ConvertResult> {
  const format = detectFormat(file);
  if (!format) throw new Error("Unsupported file type.");

  const tooBig = validateSize(file);
  if (tooBig) throw new Error(tooBig);

  const text = await convertByFormat(file, format);
  return { text, format, empty: text.trim().length === 0 };
}

async function convertByFormat(file: File, format: ConverterFormat): Promise<string> {
  switch (format) {
    case "txt":
    case "md":
      return await file.text();
    case "html":
      return parseHtml(await file.text());
    case "csv":
      return parseCsv(await file.text());
    case "docx":
      return parseDocx(file);
    case "xlsx":
      return parseXlsx(file);
    case "pdf":
      return parsePdf(file);
  }
}

function parseHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body?.textContent ?? "").replace(/[ \t]+\n/g, "\n").trim();
}

/** CSV → tab-separated text for a clean preview. */
async function parseCsv(text: string): Promise<string> {
  const Papa = await import("papaparse");
  const result = Papa.default.parse<string[]>(text, { skipEmptyLines: true });
  return result.data
    .map((row) => row.join("\t"))
    .join("\n")
    .trim();
}

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value.trim();
}

async function parseXlsx(file: File): Promise<string> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const lines: string[] = [];
  workbook.eachSheet((sheet) => {
    lines.push(`## ${sheet.name}`);
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(cell.text ?? "");
      });
      lines.push(cells.join("\t"));
    });
  });
  return lines.join("\n").trim();
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
  }
  return pages.join("\n\n").trim();
}
