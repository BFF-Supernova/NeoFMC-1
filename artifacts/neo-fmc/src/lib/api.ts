import { toast } from "@/hooks/use-toast";

const getHeaders = (): HeadersInit => {
  const token = localStorage.getItem("neo_fmc_token");
  const tenantId = localStorage.getItem("neo_fmc_sa_tenant");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
  };
};

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMsg = body.message || body.error || `API error ${res.status}`;
    throw new Error(errorMsg);
  }
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return res.text() as unknown as T;
}

export function handleApiError(err: unknown, fallbackMsg?: string) {
  const msg = err instanceof Error ? err.message : fallbackMsg || "An error occurred";
  toast({
    title: "Error",
    description: msg,
    variant: "destructive",
  });
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: <T = unknown>(path: string, formData: FormData) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const token = localStorage.getItem("neo_fmc_token");
    const tenantId = localStorage.getItem("neo_fmc_sa_tenant");
    return fetch(`${base}/api${path}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
      },
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `API error ${res.status}`);
      }
      return res.json() as Promise<T>;
    });
  },
};
