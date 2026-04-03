"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";

import { useToast } from "@/hooks/use-toast";

const RANDOM_PREFETCH_SIZE = 6;
const RANDOM_PREFETCH_THRESHOLD = 2;

function getRandomLinesFromPayload(payload: unknown): SearchResult[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const lines = (payload as { lines?: SearchResult[]; line?: SearchResult | null })
    .lines;
  if (Array.isArray(lines)) {
    return lines;
  }

  const line = (payload as { line?: SearchResult | null }).line;
  return line ? [line] : [];
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("signal is aborted"))
  );
}

export function useRandomLine(canEdit: boolean) {
  const { toast } = useToast();
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
  const queuedLinesRef = useRef<SearchResult[]>([]);
  const batchRequestRef = useRef<Promise<SearchResult[]> | null>(null);
  const batchAbortRef = useRef<AbortController | null>(null);
  const activeLoadIdRef = useRef(0);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    lineRef.current = line;
  }, [line]);

  useEffect(() => {
    return () => {
      batchAbortRef.current?.abort();
      batchAbortRef.current = null;
      batchRequestRef.current = null;
    };
  }, []);

  const mergeIntoQueue = useCallback((incomingLines: SearchResult[]) => {
    if (incomingLines.length === 0) {
      return;
    }

    const currentLineId = lineRef.current?.id;
    const existingIds = new Set([
      ...queuedLinesRef.current.map((queuedLine) => queuedLine.id),
      ...(currentLineId ? [currentLineId] : []),
    ]);

    for (const incomingLine of incomingLines) {
      if (existingIds.has(incomingLine.id)) {
        continue;
      }

      queuedLinesRef.current.push(incomingLine);
      existingIds.add(incomingLine.id);
    }
  }, []);

  const fetchRandomBatch = useCallback(async (count = RANDOM_PREFETCH_SIZE) => {
    if (batchAbortRef.current?.signal.aborted) {
      batchAbortRef.current = null;
      batchRequestRef.current = null;
    }

    if (batchRequestRef.current) {
      return batchRequestRef.current;
    }

    const controller = new AbortController();
    batchAbortRef.current = controller;

    const request = fetch(`/api/lines/random?limit=${count}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Failed to fetch random lines.";
          throw new Error(message);
        }

        return getRandomLinesFromPayload(payload);
      })
      .finally(() => {
        if (batchRequestRef.current === request) {
          batchRequestRef.current = null;
        }
        if (batchAbortRef.current === controller) {
          batchAbortRef.current = null;
        }
      });

    batchRequestRef.current = request;
    return request;
  }, []);

  const refillQueue = useCallback(async () => {
    if (queuedLinesRef.current.length >= RANDOM_PREFETCH_THRESHOLD) {
      return;
    }

    try {
      const lines = await fetchRandomBatch();
      mergeIntoQueue(lines);
    } catch {
      // Keep the current line visible; the next foreground request can retry.
    }
  }, [fetchRandomBatch, mergeIntoQueue]);

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
        toast({
          title: "Error",
          description: "Auto-save failed. Your changes might not be saved.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
        saveInProgress.current = false;
      }
    },
    [canEdit, toast],
  );

  const loadRandomLine = useCallback(async () => {
    const loadId = ++activeLoadIdRef.current;

    if (lineRef.current && contentRef.current !== lineRef.current.content) {
      await performAutoSave(false);
    }

    if (loadId === activeLoadIdRef.current) {
      setError("");
      setSaved(false);
    }

    const queuedLine = queuedLinesRef.current.shift();
    if (queuedLine) {
      if (loadId === activeLoadIdRef.current) {
        setLine(queuedLine);
        setContent(queuedLine.content);
      }
      void refillQueue();
      return;
    }

    if (loadId === activeLoadIdRef.current) {
      setLoading(true);
    }
    try {
      const freshLines = await fetchRandomBatch();
      const currentLineId = lineRef.current?.id;
      const nextLines = freshLines.filter(
        (freshLine) => freshLine.id !== currentLineId,
      );
      const [nextLine, ...prefetchedLines] = nextLines;

      if (!nextLine) {
        throw new Error("No eligible random lines available.");
      }

      queuedLinesRef.current = [];
      mergeIntoQueue(prefetchedLines);

      if (loadId === activeLoadIdRef.current) {
        setLine(nextLine);
        setContent(nextLine.content);
      }
      void refillQueue();
    } catch (err) {
      if (loadId !== activeLoadIdRef.current || isAbortError(err)) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch random line. Try again.";
      setError(message);
      if (lineRef.current) {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      if (loadId === activeLoadIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetchRandomBatch, mergeIntoQueue, performAutoSave, refillQueue, toast]);

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
      const errMsg = err instanceof Error ? err.message : "An error occurred.";
      setError(errMsg);
      toast({
        title: "Error",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      saveInProgress.current = false;
    }
  }, [line, content, loadRandomLine, saved, loading, toast]);

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
