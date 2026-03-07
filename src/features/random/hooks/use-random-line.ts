"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

export function useRandomLine(canEdit: boolean) {
  const [line, setLine] = useState<SearchResult | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const saveInProgress = useRef(false);
  const contentRef = useRef(content);
  const lineRef = useRef(line);
  const loadRandomLineRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);

  const performAutoSave = useCallback(
    async (shouldNext = false) => {
      if (!lineRef.current || !canEdit || saveInProgress.current) return;

      const currentContent = contentRef.current;
      const originalLine = lineRef.current;

      const contentChanged = currentContent !== originalLine.content;
      if (!contentChanged) return;

      saveInProgress.current = true;
      setSaving(true);
      setSaved(false);
      setError("");

      try {
        const res = await fetch("/api/lines", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lineId: originalLine.id,
            field: "content",
            value: currentContent,
          }),
        });
        if (!res.ok) throw new Error("Failed to save content");

        setSaved(true);
        setLine((prev) => (prev ? { ...prev, content: currentContent } : null));

        if (shouldNext) {
          setTimeout(() => {
            setSaved(false);
            loadRandomLineRef.current();
          }, 2000);
        } else {
          setTimeout(() => setSaved(false), 2000);
        }
      } catch {
        setError("Auto-save failed");
      } finally {
        setSaving(false);
        saveInProgress.current = false;
      }
    },
    [canEdit],
  );

  const loadRandomLine = useCallback(async () => {
    if (lineRef.current && contentRef.current !== lineRef.current.content) {
      await performAutoSave(false);
    }

    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/lines/random");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLine(data.line);
      setContent(data.line.content);
    } catch {
      setError("Failed to fetch random line. Try again.");
    } finally {
      setLoading(false);
    }
  }, [performAutoSave]);

  useEffect(() => {
    loadRandomLineRef.current = loadRandomLine;
  }, [loadRandomLine]);

  useEffect(() => {
    loadRandomLine();
  }, [loadRandomLine]);

  const submitSuggestion = useCallback(async () => {
    if (
      !line ||
      content === line.content ||
      saveInProgress.current ||
      saved ||
      loading
    )
      return;

    saveInProgress.current = true;
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_id: line.id,
          suggested_content: content,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit.");
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        loadRandomLine();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  }, [line, content, loadRandomLine, saved, loading]);

  return {
    line,
    content,
    setContent,
    loading,
    saving,
    saved,
    error,
    loadRandomLine,
    performAutoSave,
    submitSuggestion,
  };
}
