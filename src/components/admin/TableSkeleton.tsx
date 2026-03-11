import { Loader2 } from "lucide-react";

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141417]">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/5 bg-white/2">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-4">
                <div className="h-3 w-20 rounded-md bg-white/5 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-6 py-4">
                  {c === 0 ? (
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded-md bg-white/10 animate-pulse" />
                      <div className="h-2 w-16 rounded-md bg-white/5 animate-pulse" />
                    </div>
                  ) : (
                    <div className="h-4 w-full max-w-[100px] rounded-md bg-white/5 animate-pulse" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-white/20" />
      </div>
    </div>
  );
}
