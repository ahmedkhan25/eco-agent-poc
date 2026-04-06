/**
 * Utilities for extracting text from uploaded PDF and Markdown files
 * for injection into the systems modeler generation pipeline.
 */

import * as pdfjsLib from "pdfjs-dist";

// Use CDN worker to avoid Next.js bundling issues
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extract all text content from a PDF file.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) {
      pages.push(pageText.trim());
    }
  }

  const fullText = pages.join("\n\n");
  if (fullText.trim().length < 50 && pdf.numPages > 1) {
    throw new Error(
      "This PDF appears to contain scanned images rather than text. Please use a text-based PDF or paste the content manually."
    );
  }

  return fullText;
}

/**
 * Extract text from a Markdown or plain text file.
 * Strips YAML frontmatter if present.
 */
export async function extractTextFromMarkdown(file: File): Promise<string> {
  const text = await file.text();
  // Strip YAML frontmatter (between --- delimiters at start of file)
  const stripped = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  return stripped.trim();
}

/**
 * Truncate content to fit within prompt token limits.
 * Keeps first 70% and last 30% to preserve beginning context and conclusions.
 */
export function truncateContent(
  text: string,
  maxChars: number = 24000
): string {
  if (text.length <= maxChars) return text;

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = maxChars - headSize - 50; // 50 chars for truncation marker
  const head = text.slice(0, headSize);
  const tail = text.slice(-tailSize);

  return `${head}\n\n[... content truncated for length ...]\n\n${tail}`;
}

const CONTENT_EXTENSIONS = [".pdf", ".md", ".markdown", ".txt"];
const MAX_FILES = 10;

/**
 * Check if a file extension is a content file (not a model import).
 */
export function isContentFile(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return CONTENT_EXTENSIONS.includes(ext);
}

/**
 * Extract and combine text from multiple uploaded files.
 * Processes files in parallel, concatenates with filename headers.
 */
export async function extractTextFromFiles(
  files: File[],
  onProgress?: (msg: string) => void
): Promise<string> {
  if (files.length > MAX_FILES) {
    throw new Error(`Too many files (${files.length}). Please upload up to ${MAX_FILES} files at a time.`);
  }

  onProgress?.(`Extracting text from ${files.length} file${files.length > 1 ? "s" : ""}...`);

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      let text: string;
      if (ext === ".pdf") {
        text = await extractTextFromPDF(file);
      } else {
        text = await extractTextFromMarkdown(file);
      }
      return { name: file.name, text };
    })
  );

  // Concatenate with filename headers
  const combined = results
    .map((r) => `--- ${r.name} ---\n\n${r.text}`)
    .join("\n\n");

  return truncateContent(combined, 40000);
}

/**
 * Derive a human-readable topic from a filename.
 */
export function topicFromFilename(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, ""); // remove extension
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase split
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    .trim();
}
