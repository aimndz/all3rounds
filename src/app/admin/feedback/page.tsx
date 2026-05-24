"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Mail, Monitor, UserCircle } from "lucide-react";
import { useState } from "react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { CardSkeleton } from "@/components/admin/CardSkeleton";
import { DataPagination } from "@/components/admin/DataPagination";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/use-paginated-fetch";

type FeedbackItem = {
  id: string;
  userId: string | null;
  category: string;
  message: string;
  contactEmail: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  user: {
    displayName: string | null;
    role: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Items" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "archived", label: "Archived" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "bug", label: "Bugs" },
  { value: "content", label: "Content" },
  { value: "feature", label: "Features" },
  { value: "data", label: "Data" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  content: "Content",
  feature: "Feature",
  data: "Data",
  account: "Account",
  other: "Other",
};

function formatWhen(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return formatDistanceToNow(date, { addSuffix: true });
}

function FeedbackCard({ feedback }: { feedback: FeedbackItem }) {
  const statusClass =
    feedback.status === "new"
      ? "bg-primary/20 text-primary"
      : feedback.status === "archived"
        ? "bg-white/10 text-white/40"
        : "bg-secondary/20 text-secondary-foreground";

  return (
    <article className="group hover:border-primary/25 relative overflow-hidden rounded-(--radius-panel) border border-white/5 bg-[#141417] p-4 transition-all duration-300 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold tracking-[0.16em] text-white/60 uppercase"
            >
              {CATEGORY_LABELS[feedback.category] ?? feedback.category}
            </Badge>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-white/25 uppercase">
              {formatWhen(feedback.createdAt)}
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold tracking-[0.14em] text-white/30 uppercase">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <UserCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {feedback.user?.displayName || "Anonymous"}
              </span>
            </span>
            {feedback.user?.role && (
              <span className="text-white/20">({feedback.user.role})</span>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={`w-fit rounded border-transparent px-2 py-1 text-[9px] font-semibold tracking-[0.16em] uppercase ${statusClass}`}
        >
          {feedback.status}
        </Badge>
      </div>

      <p className="border-primary/40 mt-5 border-l-2 pl-4 text-sm leading-relaxed font-medium whitespace-pre-wrap text-white sm:text-base">
        {feedback.message}
      </p>

      <div className="mt-5 grid gap-2 border-t border-white/5 pt-4 text-[11px] text-white/40 sm:grid-cols-2">
        {feedback.contactEmail && (
          <a
            href={`mailto:${feedback.contactEmail}`}
            className="flex min-w-0 items-center gap-2 rounded-(--radius-panel) border border-white/5 bg-white/3 px-3 py-2 transition-colors hover:bg-white/7 hover:text-white"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{feedback.contactEmail}</span>
          </a>
        )}

        {feedback.pageUrl && (
          <a
            href={feedback.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 rounded-(--radius-panel) border border-white/5 bg-white/3 px-3 py-2 transition-colors hover:bg-white/7 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{feedback.pageUrl}</span>
          </a>
        )}

        {feedback.userAgent && (
          <div className="flex min-w-0 items-center gap-2 rounded-(--radius-panel) border border-white/5 bg-white/3 px-3 py-2 sm:col-span-2">
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{feedback.userAgent}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function FeedbackFilterSelect({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label
        htmlFor={id}
        className="text-[10px] font-semibold tracking-[0.18em] text-white/35 uppercase"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function AdminFeedbackPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const {
    data: feedbackItems,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
  } = usePaginatedFetch<FeedbackItem>("/api/admin/feedback", {
    limit: 10,
    extraParams: { status: statusFilter, category: categoryFilter },
  });

  return (
    <AdminPageShell error={error}>
      <PageHeader title="Feedback" itemCount={loading ? undefined : total}>
        <div className="surface-card surface-card--muted grid w-full gap-3 p-3 sm:w-auto sm:grid-cols-2">
          <FeedbackFilterSelect
            id="feedback-status-filter"
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          />
          <FeedbackFilterSelect
            id="feedback-category-filter"
            label="Type"
            options={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={(val) => {
              setCategoryFilter(val);
              setPage(1);
            }}
          />
        </div>
      </PageHeader>

      {loading ? (
        <CardSkeleton count={5} />
      ) : feedbackItems.length === 0 ? (
        <div className="empty-state py-28">
          <p className="text-xs font-medium tracking-widest text-white/20 uppercase">
            No feedback found
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {feedbackItems.map((item) => (
            <FeedbackCard key={item.id} feedback={item} />
          ))}
        </div>
      )}

      {!loading && feedbackItems.length > 0 && (
        <DataPagination
          page={page}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      )}
    </AdminPageShell>
  );
}
