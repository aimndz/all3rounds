"use client";

import { SearchResult } from "@/lib/types";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function SuggestCorrectionModal({
  result,
  onClose,
}: {
  result: SearchResult;
  onClose: () => void;
}) {
  const [suggestion, setSuggestion] = useState(result.content);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!suggestion || suggestion === result.content) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_id: result.id,
          suggested_content: suggestion,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggest Correction</DialogTitle>
          <DialogDescription>
            Help improve the transcript. Your suggestion will be reviewed by our
            team.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-10 text-center">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-foreground font-semibold">
                Suggestion Submitted
              </h3>
              <p className="text-muted-foreground text-sm">
                Thank you! Your correction has been sent for review.
              </p>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Original Line
                </Label>
                <div className="bg-muted/30 text-muted-foreground rounded-md border px-3 py-2 text-sm italic">
                  &ldquo;{result.content}&rdquo;
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="suggestion"
                  className="text-muted-foreground text-xs font-bold tracking-wider uppercase"
                >
                  Suggested Correction
                </Label>
                <Textarea
                  id="suggestion"
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Type the corrected line here..."
                  rows={4}
                  autoFocus
                  className="focus-visible:ring-primary resize-none"
                />
              </div>

              <div className="text-muted-foreground bg-muted/20 flex items-start gap-1.5 rounded border border-dashed p-2 text-[11px]">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                <span>
                  Only suggest changes if you&apos;re sure about the lyrics or
                  labels. Minor formatting is fine.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting || !suggestion || suggestion === result.content
                }
                className="gap-2"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Suggestion"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
