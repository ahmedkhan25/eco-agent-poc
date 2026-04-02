"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, FileText, Database, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseImportedFile, type ImportResult } from "@/lib/systems-modeler/import-utils";
import { extractTextFromPDF, extractTextFromMarkdown, truncateContent, topicFromFilename, isContentFile, extractTextFromFiles } from "@/lib/systems-modeler/file-extraction";
import type { SystemModel } from "@/lib/systems-modeler/types";

interface ModelInputFormProps {
  onGenerate: (topic: string, useRag: boolean, content?: string) => void;
  onImport: (model: SystemModel) => void;
  onImportFallback: (topic: string, content: string) => void;
  isLoading: boolean;
}

export function ModelInputForm({ onGenerate, onImport, onImportFallback, isLoading }: ModelInputFormProps) {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [useRag, setUseRag] = useState(false);
  const [showContentArea, setShowContentArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = topic.trim().length > 0 && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onGenerate(topic.trim(), useRag, content.trim() || undefined);
  };

  const processFile = useCallback(
    async (file: File) => {
      if (isLoading || isExtracting) return;
      setImportError(null);

      const validExtensions = [".json", ".html", ".htm", ".pdf", ".md", ".markdown", ".txt"];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (!validExtensions.includes(ext)) {
        setImportError("Please upload a .json, .html, .pdf, .md, or .txt file");
        return;
      }

      try {
        // PDF and Markdown files: extract text and generate model from content
        if (ext === ".pdf") {
          setIsExtracting(true);
          setExtractionProgress("Extracting text from PDF...");
          const rawText = await extractTextFromPDF(file);
          const content = truncateContent(rawText);
          const fileTopic = topicFromFilename(file.name);
          if (!topic.trim()) setTopic(fileTopic);
          setIsExtracting(false);
          setExtractionProgress("");
          onImportFallback(topic.trim() || fileTopic, content);
          return;
        }

        if (ext === ".md" || ext === ".markdown" || ext === ".txt") {
          setIsExtracting(true);
          setExtractionProgress("Reading document...");
          const rawText = await extractTextFromMarkdown(file);
          const content = truncateContent(rawText);
          const fileTopic = topicFromFilename(file.name);
          if (!topic.trim()) setTopic(fileTopic);
          setIsExtracting(false);
          setExtractionProgress("");
          onImportFallback(topic.trim() || fileTopic, content);
          return;
        }

        // JSON and HTML files: try to import as existing model
        const text = await file.text();
        const result: ImportResult = parseImportedFile(text, file.name);

        if (result.ok) {
          onImport(result.model);
        } else {
          onImportFallback(result.fallbackTopic, result.fallbackContent);
        }
      } catch (err) {
        setIsExtracting(false);
        setExtractionProgress("");
        setImportError(err instanceof Error ? err.message : "Failed to read file. Please try again.");
      }
    },
    [isLoading, isExtracting, topic, onImport, onImportFallback]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      if (isLoading || isExtracting) return;
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Single JSON/HTML file → model import (existing behavior)
      if (fileArray.length === 1) {
        const ext = fileArray[0].name.substring(fileArray[0].name.lastIndexOf(".")).toLowerCase();
        if (ext === ".json" || ext === ".html" || ext === ".htm") {
          processFile(fileArray[0]);
          return;
        }
        // Single content file → also process immediately
        if (isContentFile(fileArray[0].name)) {
          processFile(fileArray[0]);
          return;
        }
      }

      // Multiple files → stage content files for review before processing
      const contentFiles = fileArray.filter((f) => isContentFile(f.name));
      if (contentFiles.length === 0) {
        if (fileArray.length === 1) {
          processFile(fileArray[0]);
          return;
        }
        setImportError("No supported content files found. Upload .pdf, .md, or .txt files.");
        return;
      }

      setImportError(null);
      setStagedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const newFiles = contentFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...newFiles];
      });
    },
    [isLoading, isExtracting, processFile]
  );

  const removeStagedFile = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const processStagedFiles = useCallback(async () => {
    if (stagedFiles.length === 0 || isLoading || isExtracting) return;
    setImportError(null);
    try {
      setIsExtracting(true);
      const combined = await extractTextFromFiles(stagedFiles, setExtractionProgress);
      const fileTopic = stagedFiles.length === 1
        ? topicFromFilename(stagedFiles[0].name)
        : `Analysis of ${stagedFiles.length} documents`;
      if (!topic.trim()) setTopic(fileTopic);
      setStagedFiles([]);
      setIsExtracting(false);
      setExtractionProgress("");
      onImportFallback(topic.trim() || fileTopic, combined);
    } catch (err) {
      setIsExtracting(false);
      setExtractionProgress("");
      setImportError(err instanceof Error ? err.message : "Failed to process files.");
    }
  }, [stagedFiles, isLoading, isExtracting, topic, onImportFallback]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <motion.div
      className="flex flex-col items-center px-4 gap-5 w-full"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Video above the form */}
      <div className="w-full max-w-xl relative">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full rounded-xl shadow-lg"
          ref={(el) => { if (el) el.playbackRate = 0.5; }}
        >
          <source src="/aha-images/ripples-pond-home1.mp4" type="video/mp4" />
        </video>
        {/* Title overlay */}
        <div className="absolute bottom-0 right-0 left-0 rounded-b-xl bg-gradient-to-t from-black/80 via-black/50 to-transparent px-5 pt-10 pb-4 text-right">
          <p className="text-white font-bold text-lg drop-shadow-lg">Systems Modeler</p>
          <p className="text-white/80 text-xs drop-shadow-md">Inspired by the work of systems thinker Gene Bellinger</p>
        </div>
        {/* Rotating subtitles */}
        <SubtitleLoop />
      </div>

      <div className="w-full max-w-xl">
        <motion.div
          className={cn(
            "rounded-2xl border shadow-xl overflow-hidden",
            "bg-white dark:bg-slate-800/90",
            "border-slate-200 dark:border-slate-700/80"
          )}
          initial={{ scale: 0.97 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Header gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500" />

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Title */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Systems Modeler
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Enter a topic to generate a causal loop diagram
              </p>
            </div>

            {/* Topic input */}
            <div className="space-y-1.5">
              <label
                htmlFor="topic"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Topic
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Climate migration in the Pacific Northwest"
                disabled={isLoading}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg text-sm",
                  "bg-slate-50 dark:bg-slate-900/60",
                  "border border-slate-200 dark:border-slate-600",
                  "text-slate-800 dark:text-slate-200",
                  "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
              />
            </div>

            {/* Toggle to show content paste area */}
            <button
              type="button"
              onClick={() => setShowContentArea(!showContentArea)}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-colors",
                "text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              {showContentArea ? "Hide" : "Paste"} additional content
              (optional)
            </button>

            {/* Content textarea */}
            {showContentArea && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label
                  htmlFor="content"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Additional Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste article text, research notes, or other content to inform the model..."
                  disabled={isLoading}
                  rows={5}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg text-sm resize-none",
                    "bg-slate-50 dark:bg-slate-900/60",
                    "border border-slate-200 dark:border-slate-600",
                    "text-slate-800 dark:text-slate-200",
                    "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                />
              </motion.div>
            )}

            {/* RAG toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Use Olympia RAG Documents
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useRag}
                onClick={() => setUseRag(!useRag)}
                disabled={isLoading}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  useRag
                    ? "bg-teal-500 dark:bg-teal-600"
                    : "bg-slate-300 dark:bg-slate-600"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    useRag ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Generate button */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold",
                "text-white shadow-md",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
                canSubmit
                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98]"
                  : "bg-slate-300 dark:bg-slate-600 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating model...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Model</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                or import
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Import drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                isLoading && "opacity-50 cursor-not-allowed",
                isDragging
                  ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                  : "border-slate-200 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500 bg-slate-50/50 dark:bg-slate-900/30"
              )}
            >
              <Upload
                className={cn(
                  "w-6 h-6 transition-colors",
                  isDragging
                    ? "text-teal-500"
                    : "text-slate-400 dark:text-slate-500"
                )}
              />
              <div className="text-center">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isDragging
                      ? "text-teal-600 dark:text-teal-400"
                      : "text-slate-600 dark:text-slate-300"
                  )}
                >
                  {isDragging
                    ? "Drop file here"
                    : "Import model or upload document"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Drop files (.pdf, .md, .txt) or a .json/.html model — supports multiple files
                </p>
              </div>
              {isExtracting && (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" />
                  <span className="text-xs text-teal-600 dark:text-teal-400">{extractionProgress}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.html,.htm,.pdf,.md,.markdown,.txt"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Staged files list */}
            {stagedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {stagedFiles.length} file{stagedFiles.length > 1 ? "s" : ""} ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedFiles([])}
                    className="text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {stagedFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs",
                        "bg-slate-50 dark:bg-slate-900/40",
                        "border border-slate-100 dark:border-slate-700/60"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                        <span className="truncate text-slate-700 dark:text-slate-300">{file.name}</span>
                        <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
                          {(file.size / 1024).toFixed(0)}KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStagedFile(i)}
                        className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={processStagedFiles}
                  disabled={isLoading || isExtracting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold",
                    "text-white shadow-md transition-all duration-200",
                    "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 hover:shadow-lg active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{extractionProgress || "Processing..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Model from {stagedFiles.length} File{stagedFiles.length > 1 ? "s" : ""}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Import error */}
            {importError && (
              <p className="text-xs text-red-500 dark:text-red-400 text-center">
                {importError}
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}

const SUBTITLES = [
  "Visualize cause and effect across any topic",
  "AI builds causal loop diagrams from your ideas",
  "Discover hidden feedback loops driving outcomes",
  "Challenge assumptions with the Aha! Paradox",
  "Transform system dynamics into human stories",
  "Collaborate with AI to refine your model",
];

function SubtitleLoop() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SUBTITLES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className={cn(
          "px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        <p className="text-white/90 text-xs font-medium text-center">{SUBTITLES[index]}</p>
      </div>
    </div>
  );
}
