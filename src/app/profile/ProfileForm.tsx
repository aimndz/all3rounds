"use client";

import { FormEvent, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Zap, Calendar, MessageSquare, Triangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AuthUser } from "@/lib/auth";
import { normalizeUsername, isValidUsername } from "@/lib/user-profile";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ProfileAnnotation = {
  id: string;
  battle_id: string;
  author_id: string;
  body_json: Record<string, unknown> | unknown[];
  body_text: string;
  status: string;
  score: number;
  quality_state: string;
  created_at: string | number;
  updated_at: string | number;
  deleted_at: string | number | null;
  current_user_voted: boolean;
  current_user_vote_value: number;
  can_edit: boolean;
  battle_title?: string;
  author: {
    id: string;
    display_name: string;
    username: string | null;
    image_url: string | null;
    role: string;
    trust_level: string;
    points: number;
  };
  range: {
    start_line_id: number | null;
    end_line_id: number | null;
    start_line_sort: number;
    end_line_sort: number;
    start_text_offset: number | null;
    end_text_offset: number | null;
    selected_text: string | null;
    line_snapshot: { id: number; content: string }[];
  } | null;
  references: {
    id: string;
    line_id: number | null;
    line_sort: number;
    label: string;
  }[];
};

type VoteOverride = {
  scoreDelta: number;
  voteValue: number;
  voted: boolean;
};

function parseDateSafe(value: string | number) {
  if (typeof value === "number") return new Date(value);
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return new Date(Number(str));
  let formatted = str;
  if (str.length >= 10 && !str.includes("T")) {
    formatted = str.replace(" ", "T");
    if (!formatted.includes("+") && !formatted.endsWith("Z")) {
      formatted += "Z";
    }
  }
  const date = new Date(formatted);
  if (!Number.isNaN(date.getTime())) return date;
  return new Date(value);
}

function formatAnnotationAge(value: string | number) {
  const date = parseDateSafe(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";

  const units = [
    { label: "yr", seconds: 60 * 60 * 24 * 365 },
    { label: "mo", seconds: 60 * 60 * 24 * 30 },
    { label: "d", seconds: 60 * 60 * 24 },
    { label: "h", seconds: 60 * 60 },
    { label: "m", seconds: 60 },
  ];
  const unit = units.find((item) => seconds >= item.seconds);
  if (!unit) return "now";
  return `${Math.floor(seconds / unit.seconds)}${unit.label}`;
}

function formatScore(score: number): string {
  if (Math.abs(score) >= 1000) {
    const kValue = score / 1000;
    const formatted = kValue.toFixed(1).replace(/\.0$/, "");
    return `${formatted}k`;
  }
  return String(score);
}

type ProfileFormProps = {
  user: AuthUser;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const storeUser = useAuthStore((state) => state.user);
  const currentUser = storeUser || user;

  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username ?? "");
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [isEditing, setIsEditing] = useState(false);

  const [voteOverrides, setVoteOverrides] = useState<Map<string, VoteOverride>>(
    new Map(),
  );

  const sourceAnnotations = useMemo(
    () => (currentUser.annotations ?? []) as ProfileAnnotation[],
    [currentUser.annotations],
  );

  const annotationsList = useMemo<ProfileAnnotation[]>(() => {
    if (voteOverrides.size === 0) return sourceAnnotations;
    return sourceAnnotations.map((a) => {
      const override = voteOverrides.get(a.id);
      if (!override) return a;
      return {
        ...a,
        score: a.score + override.scoreDelta,
        current_user_vote_value: override.voteValue,
        current_user_voted: override.voted,
      };
    });
  }, [sourceAnnotations, voteOverrides]);

  const handleVote = useCallback(
    async (annotationId: string, direction: 1 | -1) => {
      const annotation = annotationsList.find((a) => a.id === annotationId);
      if (!annotation) return;

      const currentValue =
        annotation.current_user_vote_value ??
        (annotation.current_user_voted ? 1 : 0);
      const targetValue = currentValue === direction ? 0 : direction;
      const scoreDelta = targetValue - currentValue;

      setVoteOverrides((prev) => {
        const next = new Map(prev);
        const existingDelta = prev.get(annotationId)?.scoreDelta ?? 0;
        next.set(annotationId, {
          scoreDelta: existingDelta + scoreDelta,
          voteValue: targetValue,
          voted: targetValue === 1,
        });
        return next;
      });

      try {
        let res: Response;
        if (targetValue === 0) {
          res = await fetch(`/api/annotations/${annotationId}/vote`, {
            method: "DELETE",
          });
        } else {
          res = await fetch(`/api/annotations/${annotationId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: targetValue }),
          });
        }
        if (!res.ok) {
          throw new Error();
        }
      } catch {
        setVoteOverrides((prev) => {
          const next = new Map(prev);
          const source = sourceAnnotations.find((a) => a.id === annotationId);
          const baseVoteValue = source?.current_user_vote_value ?? 0;

          if (currentValue === baseVoteValue) {
            next.delete(annotationId);
          } else {
            next.set(annotationId, {
              scoreDelta: currentValue - baseVoteValue,
              voteValue: currentValue,
              voted: currentValue === 1,
            });
          }
          return next;
        });
        toast({
          variant: "destructive",
          description: "Failed to update vote.",
        });
      }
    },
    [annotationsList, sourceAnnotations, toast],
  );
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  const validateUsername = (val: string) => {
    if (!val) {
      return "Username cannot be empty.";
    }
    if (!isValidUsername(val)) {
      return "Username must be 3-24 characters and use lowercase letters, numbers, or underscores.";
    }
    return null;
  };

  const validateDisplayName = (val: string) => {
    if (!val.trim()) {
      return "Display name cannot be empty.";
    }
    if (val.length > 50) {
      return "Display name must be 50 characters or less.";
    }
    return null;
  };

  const validateBio = (val: string) => {
    if (val && val.length > 160) {
      return "Bio must be 160 characters or less.";
    }
    return null;
  };

  const handleDisplayNameChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = event.target.value;
    setDisplayName(val);
    setDisplayNameError(validateDisplayName(val));
  };

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    setUsername(val);
    setUsernameError(validateUsername(val));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const uErr = validateUsername(username);
    const dErr = validateDisplayName(displayName);
    const bErr = validateBio(bio);

    if (uErr || dErr || bErr) {
      setUsernameError(uErr);
      setDisplayNameError(dErr);
      return;
    }

    setSaving(true);
    setStatus({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizeUsername(username),
          displayName: displayName.trim(),
          bio: bio.trim(),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: body.error || "Could not update your profile.",
        });
        return;
      }

      setUsername(body.user.username);
      setDisplayName(body.user.displayName);
      setBio(body.user.bio ?? "");
      await fetchUser();
      toast({
        description: "Profile updated successfully.",
      });
      setStatus({ kind: "idle", message: "" });
      setIsEditing(false);
    } catch {
      setStatus({
        kind: "error",
        message: "Could not update your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  const profileName = currentUser.displayName || currentUser.username || "";
  const initials = (
    profileName.substring(0, 2) ||
    currentUser.email.substring(0, 2) ||
    "??"
  ).toUpperCase();

  const dateJoined = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const hasErrors =
    !!validateUsername(username) ||
    !!validateDisplayName(displayName) ||
    !!validateBio(bio);

  return (
    <form
      className="flex w-full max-w-3xl flex-col items-stretch md:max-w-3xl"
      onSubmit={handleSubmit}
    >
      <div className="mb-6 flex flex-row items-center gap-4 text-left">
        <Avatar className="border-primary/30 relative size-28 shrink-0 border-2 shadow-lg md:size-36">
          <AvatarImage src={currentUser.image ?? undefined} alt={profileName} />
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col items-start">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground max-w-[200px] truncate text-xl font-bold tracking-tight md:max-w-[350px] md:text-2xl">
              {isEditing ? displayName : currentUser.displayName}
            </h2>
            {!isEditing && (
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsEditing(true);
                  setDisplayName(currentUser.displayName);
                  setUsername(currentUser.username ?? "");
                  setBio(currentUser.bio ?? "");
                  setDisplayNameError(null);
                  setUsernameError(null);
                  setStatus({ kind: "idle", message: "" });
                }}
                className="text-muted-foreground hover:text-foreground h-auto cursor-pointer p-0 text-xs font-semibold hover:no-underline md:text-sm"
              >
                Edit
              </Button>
            )}
          </div>

          <p className="text-foreground/70 mt-0.5 text-sm md:text-base">
            {currentUser.username
              ? `@${currentUser.username}`
              : "No username set"}
          </p>

          <div className="mt-2.5">
            <Badge
              variant={
                currentUser.role === "superadmin" ||
                currentUser.role === "admin"
                  ? "default"
                  : "secondary"
              }
              className="px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase md:text-[10px]"
            >
              {currentUser.role}
            </Badge>
          </div>
          {!isEditing &&
            currentUser.bio != null &&
            currentUser.bio.trim() !== "" && (
              <p className="text-muted-foreground mt-2.5">{currentUser.bio}</p>
            )}
        </div>
      </div>

      <div className="border-border mb-6 grid w-full grid-cols-3 gap-2 border-t border-b py-4 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="text-foreground flex items-center gap-1 text-base font-semibold md:text-lg">
            <Zap className="text-muted-foreground size-4 md:size-5" />
            {Math.max(-100, currentUser.rep ?? 0)}
          </div>
          <span className="text-muted-foreground mt-1 text-[9px] font-semibold tracking-widest uppercase md:text-[10px]">
            Reputation
          </span>
        </div>

        <div className="border-border flex flex-col items-center justify-center border-l">
          <div className="text-foreground flex items-center gap-1 text-base font-semibold md:text-lg">
            <MessageSquare className="text-muted-foreground size-4 md:size-5" />
            {currentUser.annotationCount ?? 0}
          </div>
          <span className="text-muted-foreground mt-1 text-[9px] font-semibold tracking-widest uppercase md:text-[10px]">
            Annotations
          </span>
        </div>

        <div className="border-border flex flex-col items-center justify-center border-l">
          <div className="text-foreground flex items-center gap-1 text-base font-semibold md:text-lg">
            <Calendar className="text-muted-foreground size-4 md:size-5" />
            <span className="truncate">{dateJoined}</span>
          </div>
          <span className="text-muted-foreground mt-1 text-[9px] font-semibold tracking-widest uppercase md:text-[10px]">
            Joined
          </span>
        </div>
      </div>

      {isEditing && (
        <div className="border-border mt-2 space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm"
            >
              Display Name
            </Label>
            <Input
              id="displayName"
              name="displayName"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Display Name"
              maxLength={50}
              className="bg-background/50 border-border/60 focus:border-primary focus:ring-primary/20 text-sm md:text-base"
            />
            {displayNameError && (
              <p
                className="text-destructive mt-1.5 text-xs md:text-sm"
                role="alert"
              >
                {displayNameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm"
            >
              Username
            </Label>
            <div className="relative flex items-center">
              <span className="text-muted-foreground absolute left-3 text-sm font-medium select-none md:text-base">
                @
              </span>
              <Input
                id="username"
                name="username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="username"
                maxLength={24}
                className="bg-background/50 border-border/60 focus:border-primary focus:ring-primary/20 pl-7 text-sm md:text-base"
              />
            </div>
            {usernameError && (
              <p
                className="text-destructive mt-1.5 text-xs md:text-sm"
                role="alert"
              >
                {usernameError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="bio"
              className="text-muted-foreground text-xs font-semibold tracking-wider uppercase md:text-sm"
            >
              Bio
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={160}
              size="compact"
              className="bg-background/50 border-border/60 focus:border-primary focus:ring-primary/20 resize-none text-sm md:text-base"
            />
            <p className="text-muted-foreground mt-1 text-right text-[10px] md:text-xs">
              {bio.length}/160 characters
            </p>
          </div>
        </div>
      )}

      {(isEditing || status.message) && (
        <div className="border-border mt-6 flex w-full flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
          <div className="flex min-h-6 items-center">
            {status.message && (
              <p
                className={`text-xs font-medium ${
                  status.kind === "error" ? "text-destructive" : "text-primary"
                } text-center sm:text-left`}
                role={status.kind === "error" ? "alert" : "status"}
              >
                {status.message}
              </p>
            )}
          </div>
          {isEditing && (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setDisplayName(currentUser.displayName);
                  setUsername(currentUser.username ?? "");
                  setBio(currentUser.bio ?? "");
                  setDisplayNameError(null);
                  setUsernameError(null);
                  setStatus({ kind: "idle", message: "" });
                }}
                className="text-muted-foreground h-9 w-full cursor-pointer px-4 text-xs font-semibold sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || hasErrors}
                className="h-9 w-full cursor-pointer px-6 text-xs font-semibold sm:w-auto"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="mt-2 w-full">
          <Tabs defaultValue="annotations" className="w-full">
            <TabsList className="bg-muted/40 border-border/60 grid w-full grid-cols-2 border">
              <TabsTrigger
                value="annotations"
                className="text-xs font-semibold tracking-wider uppercase md:text-sm"
              >
                Annotated ({currentUser.annotationCount ?? 0})
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="text-xs font-semibold tracking-wider uppercase md:text-sm"
              >
                Favorite
              </TabsTrigger>
            </TabsList>

            <TabsContent value="annotations" className="mt-4">
              {!currentUser.annotations ||
              currentUser.annotations.length === 0 ? (
                <div className="border-border bg-card/10 rounded-lg border border-dashed px-4 py-6 text-center">
                  <p className="text-foreground text-sm font-semibold md:text-base">
                    No annotations yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                    Lines you annotate will appear here.
                  </p>
                </div>
              ) : (
                annotationsList.map((annotation) => {
                  const lineText =
                    annotation.range?.selected_text ||
                    (annotation.range?.line_snapshot &&
                    Array.isArray(annotation.range.line_snapshot)
                      ? annotation.range.line_snapshot
                          .map((l) => l.content)
                          .join(" ")
                      : "");
                  return (
                    <div
                      key={annotation.id}
                      className="border-border/40 space-y-2.5 border-b py-5 first:pt-0 last:border-b-0 last:pb-0"
                    >
                      {lineText && (
                        <p className="text-foreground line-clamp-2 text-xs md:text-sm">
                          &quot;{lineText}&quot;
                        </p>
                      )}
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="text-foreground/70 truncate text-[10px] tracking-wider uppercase md:text-xs">
                            {annotation.battle_title || "Unknown Battle"}
                          </span>
                          <span className="text-muted-foreground shrink-0 text-[10px] md:text-xs">
                            • {formatAnnotationAge(annotation.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-foreground border-l-border border-l p-2 text-xs md:text-sm">
                        {annotation.body_text}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="bg-muted/40 flex items-center gap-0.5 rounded-md p-0.5">
                          <Button
                            type="button"
                            variant={
                              annotation.current_user_vote_value === 1 ||
                              (annotation.current_user_vote_value ===
                                undefined &&
                                annotation.current_user_voted)
                                ? "secondary"
                                : "ghost"
                            }
                            size="xs"
                            onClick={() => handleVote(annotation.id, 1)}
                            title="Upvote annotation"
                            className="h-6 w-6 cursor-pointer p-0"
                          >
                            <Triangle
                              className={cn(
                                "h-2.5 w-2.5",
                                (annotation.current_user_vote_value === 1 ||
                                  (annotation.current_user_vote_value ===
                                    undefined &&
                                    annotation.current_user_voted)) &&
                                  "fill-current",
                              )}
                            />
                          </Button>
                          <span className="text-foreground min-w-5 text-center text-[10px] font-normal md:text-xs">
                            {formatScore(annotation.score)}
                          </span>
                          <Button
                            type="button"
                            variant={
                              annotation.current_user_vote_value === -1
                                ? "secondary"
                                : "ghost"
                            }
                            size="xs"
                            onClick={() => handleVote(annotation.id, -1)}
                            title="Downvote annotation"
                            className="h-6 w-6 cursor-pointer p-0"
                          >
                            <Triangle
                              className={cn(
                                "h-2.5 w-2.5 rotate-180",
                                annotation.current_user_vote_value === -1 &&
                                  "fill-current",
                              )}
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-4 space-y-3">
              <div className="border-border bg-card/10 rounded-lg border border-dashed px-4 py-6 text-center">
                <p className="text-foreground text-sm font-semibold md:text-base">
                  Favorite Lines
                </p>
                <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                  This is a preview placeholder of your saved favorites.
                </p>
              </div>

              <div className="border-border/50 bg-card/20 hover:border-primary/10 space-y-1 rounded-(--radius-control-sm) border p-4 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-primary text-[10px] font-bold tracking-wider uppercase md:text-xs">
                    Tipsy D vs Sinio
                  </span>
                  <span className="text-muted-foreground text-[10px] md:text-xs">
                    Tipsy D
                  </span>
                </div>
                <p className="text-foreground text-sm font-semibold italic md:text-base">
                  &quot;Wordplay na malupit, tugmaang umaapoy.&quot;
                </p>
              </div>

              <div className="border-border/50 bg-card/20 hover:border-primary/10 space-y-1 rounded-(--radius-control-sm) border p-4 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-primary text-[10px] font-bold tracking-wider uppercase md:text-xs">
                    Batas vs Goriong Talas
                  </span>
                  <span className="text-muted-foreground text-[10px] md:text-xs">
                    Batas
                  </span>
                </div>
                <p className="text-foreground text-sm font-semibold italic md:text-base">
                  &quot;Ako ang batas sa larangang ito.&quot;
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </form>
  );
}
