"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const FEEDBACK_CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "content", label: "Content issue" },
  { value: "feature", label: "Feature request" },
  { value: "data", label: "Missing data" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]["value"];

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme: "auto";
  size: "flexible" | "compact";
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: TurnstileRenderOptions,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function TurnstileWidget({
  siteKey,
  size,
  onTokenChange,
}: {
  siteKey: string;
  size: "flexible" | "compact";
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;

    let animationFrame = 0;
    let widgetId: string | null = null;
    const container = containerRef.current;

    animationFrame = window.requestAnimationFrame(() => {
      if (!window.turnstile || !container.isConnected) return;

      container.replaceChildren();
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: onTokenChange,
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
        theme: "auto",
        size,
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      container.replaceChildren();
      onTokenChange("");
    };
  }, [onTokenChange, siteKey, size]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[300px] min-[360px]:max-w-none"
    />
  );
}

export default function FeedbackButton() {
  const resetTimeoutRef = useRef<number | null>(null);
  const [turnstileSize, setTurnstileSize] = useState<"flexible" | "compact">(
    "flexible",
  );
  const [turnstileMountKey, setTurnstileMountKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const resetForm = () => {
    setCategory("bug");
    setMessage("");
    setContactEmail("");
    setTurnstileToken("");
    setError("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    setOpen(nextOpen);
    if (nextOpen) {
      setTurnstileToken("");
      setTurnstileMountKey((key) => key + 1);
    }
    if (!nextOpen) {
      resetTimeoutRef.current = window.setTimeout(() => {
        resetForm();
        resetTimeoutRef.current = null;
      }, 200);
    }
  };

  useEffect(() => {
    const updateTurnstileSize = () => {
      setTurnstileSize(window.innerWidth < 360 ? "compact" : "flexible");
    };

    updateTurnstileSize();
    window.addEventListener("resize", updateTurnstileSize);

    return () => {
      window.removeEventListener("resize", updateTurnstileSize);
    };
  }, []);

  useEffect(() => {
    if (turnstileSiteKey) return;

    let cancelled = false;
    fetch("/api/turnstile/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { siteKey?: string } | null) => {
        if (!cancelled && data?.siteKey) {
          setTurnstileSiteKey(data.siteKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTurnstileSiteKey("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (!turnstileSiteKey) {
      setSubmitting(false);
      setError("Verification is not configured.");
      return;
    }

    if (!turnstileToken) {
      setSubmitting(false);
      setError("Please complete the verification before sending feedback.");
      return;
    }

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          contact_email: contactEmail,
          page_url: window.location.href,
          turnstile_token: turnstileToken,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      setSubmitted(true);
      toast({ description: "Thanks, your feedback was sent." });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setTurnstileToken("");
      setTurnstileMountKey((key) => key + 1);
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setTurnstileLoaded(true)}
        onLoad={() => setTurnstileLoaded(true)}
      />
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="fixed right-4 bottom-4 z-40 h-12 w-12 rounded-full px-3 shadow-lg sm:right-5 sm:bottom-5 sm:w-auto"
        >
          <MessageSquarePlus className="size-4" />
          <span className="hidden sm:inline">Feedback</span>
          <span className="sr-only sm:hidden">Send feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Share bugs, missing data, ideas, or anything that would make
            All3Rounds better.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-9 w-9 text-green-400" />
            <div className="space-y-1">
              <h3 className="font-semibold">Feedback Sent</h3>
              <p className="text-muted-foreground text-sm">
                Thank you. We saved it for review.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-(--radius-control) border px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="feedback-category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as FeedbackCategory)
                }
              >
                <SelectTrigger id="feedback-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Feedback</Label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell us what happened or what you want to see."
                rows={5}
                maxLength={2000}
                required
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-email">Email (optional)</Label>
              <Input
                id="feedback-email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex min-h-[65px] justify-center sm:justify-start">
              {turnstileLoaded && turnstileSiteKey && (
                <TurnstileWidget
                  key={`${turnstileMountKey}-${turnstileSize}`}
                  siteKey={turnstileSiteKey}
                  size={turnstileSize}
                  onTokenChange={setTurnstileToken}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting || message.trim().length < 5 || !turnstileToken
                }
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Send
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
