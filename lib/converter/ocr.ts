/**
 * Client-side OCR support — render scanned PDF pages to JPEG data URLs that
 * the `/api/ocr` route feeds to Groq vision. Data stays in memory; nothing is
 * uploaded beyond the page images needed for recognition.
 */

export const MAX_OCR_PAGES = 20;
const TARGET_MAX_DIM = 1600;

/** Render up to MAX_OCR_PAGES pages of a PDF as downscaled JPEG data URLs. */
export async function pdfPagesToDataUrls(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const count = Math.min(doc.numPages, MAX_OCR_PAGES);
  const urls: string[] = [];

  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1, TARGET_MAX_DIM / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/jpeg", 0.75));
  }
  return urls;
}
