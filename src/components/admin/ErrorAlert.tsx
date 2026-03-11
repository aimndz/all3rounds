import { AlertCircle } from "lucide-react";

export function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="border-destructive/20 bg-destructive/5 text-destructive mb-8 flex items-center gap-3 rounded-xl border p-4 text-xs font-bold">
      <AlertCircle className="h-4 w-4" />
      {message}
    </div>
  );
}
