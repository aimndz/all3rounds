import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface DataPaginationProps {
  page: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export function DataPagination({
  page,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}: DataPaginationProps) {
  if (totalItems <= itemsPerPage) return null;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="mt-8">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className={`cursor-pointer ${
                page === 1 ? "pointer-events-none opacity-50" : "hover:bg-white/5 hover:text-white text-white/60"
              }`}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            // Basic pagination logic: show first, last, and around current
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={page === p}
                    onClick={() => onPageChange(p)}
                    className={`cursor-pointer ${page === p ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return (
                <PaginationItem key={p}>
                  <PaginationEllipsis className="text-white/40" />
                </PaginationItem>
              );
            }
            return null;
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              className={`cursor-pointer ${
                page === totalPages ? "pointer-events-none opacity-50" : "hover:bg-white/5 hover:text-white text-white/60"
              }`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
