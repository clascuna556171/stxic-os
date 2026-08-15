"use client";

import { useRef, useState } from "react";
import { Copy, Download, FileText, FileUp, Save, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { convertFile, validateSize, type ConvertResult } from "@/lib/converter/convert";
import { detectFormat, SUPPORTED_EXTENSIONS } from "@/lib/converter/formats";
import { pdfPagesToDataUrls } from "@/lib/converter/ocr";
import { textToNote } from "@/lib/converter/note";
import { saveNote } from "@/lib/hydrate";
import { isEnabled } from "@/lib/config/features";
import { cn } from "@/lib/utils/cn";

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(f: File) {
    const tooBig = validateSize(f);
    if (tooBig) {
      toast({ title: "File too large", description: tooBig, variant: "danger" });
      return;
    }
    if (!detectFormat(f)) {
      toast({
        title: "Unsupported file",
        description: `Supported: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
        variant: "danger",
      });
      return;
    }
    setFile(f);
    setResult(null);
    setProcessing(true);
    try {
      const res = await convertFile(f);
      setResult(res);
      if (res.empty) {
        toast({
          title: "No text found",
          description:
            res.format === "pdf" && isEnabled("ocr")
              ? "This looks like a scanned PDF — use Run OCR to extract the text."
              : "This file has no extractable text (a scanned PDF?).",
        });
      }
    } catch (e) {
      setFile(null);
      toast({ title: "Conversion failed", description: (e as Error).message, variant: "danger" });
    } finally {
      setProcessing(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void processFile(f);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void processFile(f);
    e.target.value = "";
  }

  async function onSave() {
    if (!file || !result) return;
    const note = textToNote(file.name, result.text, result.format);
    const res = await saveNote(note);
    if (res.ok) toast({ title: "Saved to notes", variant: "success" });
    else toast({ title: "Save failed", description: res.error, variant: "danger" });
  }

  async function onCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable.", variant: "danger" });
    }
  }

  function onDownload(ext: "txt" | "md") {
    if (!file || !result) return;
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runOcr() {
    if (!file) return;
    setOcrBusy(true);
    setOcrProgress(0);
    try {
      const pages = await pdfPagesToDataUrls(file);
      if (pages.length === 0) throw new Error("Couldn't render any pages.");
      let text = "";
      for (let i = 0; i < pages.length; i++) {
        setOcrProgress(i + 1);
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: pages[i] }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          data?: { text?: string };
          error?: string;
        } | null;
        if (!json?.ok) throw new Error(json?.error || `Page ${i + 1} failed`);
        text += `${json.data?.text ?? ""}\n\n`;
      }
      setOcrProgress(0);
      setResult((r) => (r ? { ...r, text: text.trim(), empty: text.trim().length === 0 } : r));
      toast({
        title: "OCR complete",
        description: `${pages.length} page${pages.length === 1 ? "" : "s"} extracted.`,
        variant: "success",
      });
    } catch (err) {
      toast({ title: "OCR failed", description: (err as Error).message, variant: "danger" });
    } finally {
      setOcrBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">Convert</h2>
        <p className="text-muted text-sm">Turn PDF, DOCX, XLSX, CSV, TXT, MD, or HTML into text.</p>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",")}
        className="hidden"
        onChange={onPick}
      />

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "border-border flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center transition-colors",
            dragOver && "border-accent bg-accent/5",
          )}
        >
          <div className="bg-surface-2 text-accent flex size-12 items-center justify-center rounded-full">
            <FileUp className="size-6" />
          </div>
          <p className="text-foreground text-sm font-medium">Drop a file, or browse</p>
          <p className="text-muted text-sm">
            PDF · DOCX · XLSX · CSV · TXT · MD · HTML — up to 25 MB, processed locally.
          </p>
          <Button variant="primary" onClick={() => inputRef.current?.click()}>
            <FileUp />
            Choose file
          </Button>
        </div>
      ) : processing ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-sm font-medium">{file.name}</p>
              <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => setFile(null)}>
                <X />
              </Button>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ) : result ? (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="truncate">{file.name}</CardTitle>
                <CardDescription>{result.text.length.toLocaleString()} characters</CardDescription>
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setFile(null)}>
                <X />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {isEnabled("ocr") && result.empty && result.format === "pdf" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void runOcr()}
                  disabled={ocrBusy}
                >
                  <ScanText />
                  {ocrBusy
                    ? ocrProgress > 0
                      ? `OCR page ${ocrProgress}…`
                      : "Preparing…"
                    : "Run OCR (scanned PDF)"}
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                onClick={() => void onSave()}
                disabled={!result.text}
              >
                <Save />
                Save as note
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void onCopy()}
                disabled={!result.text}
              >
                <Copy />
                Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onDownload("md")}>
                <Download />
                .md
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onDownload("txt")}>
                <Download />
                .txt
              </Button>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                <FileUp />
                Convert another
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <pre className="text-foreground max-h-[60dvh] overflow-auto text-sm whitespace-pre-wrap">
                {result.text || "No text was extracted from this file."}
              </pre>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <FileText className="text-muted size-5" />
            <p className="text-muted text-sm">Choose a file to extract its text.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
