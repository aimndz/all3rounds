/**
 * Typed client-side fetch wrapper with automatic CSRF headers.
 * Replaces raw fetch("/api/...") calls across components.
 */

type ApiOptions = {
  /** Skip adding Content-Type header (e.g. for FormData) */
  skipContentType?: boolean;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(body.error || `HTTP ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(
  url: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) searchParams.set(key, String(val));
    }
  }
  const fullUrl = searchParams.size > 0 ? `${url}?${searchParams}` : url;
  const res = await fetch(fullUrl);
  return handleResponse<T>(res);
}

export async function apiMutate<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  options?: ApiOptions,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!options?.skipContentType) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export const apiPost = <T>(url: string, body?: unknown) =>
  apiMutate<T>(url, "POST", body);

export const apiPatch = <T>(url: string, body?: unknown) =>
  apiMutate<T>(url, "PATCH", body);

export const apiDelete = <T>(url: string, body?: unknown) =>
  apiMutate<T>(url, "DELETE", body);
