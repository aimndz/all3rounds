"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/lib/auth";
import { normalizeUsername } from "@/lib/user-profile";
import { useAuthStore } from "@/stores/auth-store";

type ProfileFormProps = {
  user: AuthUser;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const [username, setUsername] = useState(user.username ?? "");
  const [status, setStatus] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalizeUsername(username) }),
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
      await fetchUser();
      setStatus({ kind: "success", message: "Username updated." });
    } catch {
      setStatus({
        kind: "error",
        message: "Could not update your profile.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="surface-card max-w-xl space-y-6 p-5"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="your_username"
          maxLength={24}
        />
        <p className="text-muted-foreground text-xs leading-5">
          Usernames are public on Contributors. Use 3-24 lowercase letters,
          numbers, or underscores.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p
          className={`text-sm ${
            status.kind === "error"
              ? "text-destructive"
              : status.kind === "success"
                ? "text-primary"
                : "text-muted-foreground"
          }`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message || `${user.rep} REP`}
        </p>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
