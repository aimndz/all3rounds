"use client";

import { useState } from "react";
import type { BattleStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge, STATUS_CONFIG } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function InlineBattleStatusSelect({
  battleId,
  status,
  canEditStatus,
  onStatusUpdated,
  badgeClassName,
  triggerClassName,
}: {
  battleId: string;
  status: BattleStatus;
  canEditStatus: boolean;
  onStatusUpdated?: (status: BattleStatus) => void;
  badgeClassName?: string;
  triggerClassName?: string;
}) {
  const { toast } = useToast();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: BattleStatus) => {
    if (!canEditStatus || newStatus === status) {
      return;
    }

    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/battles/${battleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      onStatusUpdated?.((data.status || newStatus) as BattleStatus);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update status";
      const isRateLimit = message.includes("429");
      toast({
        variant: isRateLimit ? "default" : "destructive",
        title: isRateLimit ? "Rate Limit" : "Error",
        description: isRateLimit
          ? "Too many requests. Please try again later."
          : message,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!canEditStatus) {
    return <StatusBadge status={status} noTooltip className={badgeClassName} />;
  }

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Select
        disabled={updatingStatus}
        value={status}
        onValueChange={(value) => handleStatusChange(value as BattleStatus)}
      >
        <SelectTrigger
          className={cn(
            "h-auto w-auto border-none bg-transparent p-0 shadow-none ring-0 focus:ring-0 [&>svg]:hidden",
            triggerClassName,
          )}
        >
          <SelectValue>
            <StatusBadge
              status={status}
              noTooltip
              className={cn(
                "cursor-pointer transition-all hover:brightness-110",
                updatingStatus && "opacity-50",
                badgeClassName,
              )}
            />
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {(Object.keys(STATUS_CONFIG) as BattleStatus[]).map((nextStatus) => {
            const Icon = STATUS_CONFIG[nextStatus].icon;

            return (
              <SelectItem
                key={nextStatus}
                value={nextStatus}
                className="text-xs"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{STATUS_CONFIG[nextStatus].label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
