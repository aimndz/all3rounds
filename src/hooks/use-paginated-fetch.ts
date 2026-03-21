import { useState, useCallback, useEffect } from "react";

interface FetchOptions {
  limit?: number;
  initialPage?: number;
  extraParams?: Record<string, string>;
}

export function usePaginatedFetch<T>(url: string, options: FetchOptions = {}) {
  const { limit = 10, initialPage = 1, extraParams = {} } = options;

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const extraParamsString = JSON.stringify(extraParams);

  const fetchData = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });

        // Add extra filters
        const parsedExtra = JSON.parse(extraParamsString);
        Object.entries(parsedExtra).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            params.append(key, value as string);
          }
        });

        const res = await fetch(`${url}?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch data.");
        }

        const result = await res.json();
        
        // Handle format returned by our paginated APIs
        if (result && typeof result === "object" && "data" in result) {
          setData(result.data);
          setTotal(result.total || 0);
        } else if (Array.isArray(result)) {
          // Fallback if API hasn't been updated to pagination yet
          setData(result);
          setTotal(result.length);
        } else if (result && result.moderators) {
           // Handle stats
           setData(result as unknown as T[])
           setTotal(0)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    [url, limit, extraParamsString]
  );

  useEffect(() => {
    fetchData(page);
  }, [fetchData, page]);

  // Method to remove an item manually from state (useful for approvals/rejections)
  const removeItem = useCallback(
    (idKey: keyof T, idValue: unknown) => {
      const isLastOnPage = data.length === 1;

      setData((prev) => prev.filter((item) => item[idKey] !== idValue));
      setTotal((prev) => {
        const nextTotal = prev - 1;
        return nextTotal < 0 ? 0 : nextTotal;
      });
      
      // If we cleared the current page, either go back or refresh to pull next batch
      if (isLastOnPage) {
        if (page > 1) {
          setPage((p) => p - 1);
        } else {
          // Stay on page 1 but refetch to bring in shifted items
          fetchData(1);
        }
      }
    },
    [data.length, page, fetchData]
  );
  
  // Method to update a single item in place
  const updateItem = useCallback(
    (idKey: keyof T, idValue: unknown, updates: Partial<T>) => {
      setData((prev) => 
        prev.map((item) => 
          item[idKey] === idValue ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  return {
    data,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    refetch: () => fetchData(page),
    removeItem,
    updateItem,
    setError
  };
}
