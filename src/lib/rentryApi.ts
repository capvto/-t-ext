export type PublishResponse = {
  id: string;
  editCode: string;
  viewUrl: string;
};

export type PasteResponse = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

const BASE = (import.meta as any).env?.VITE_PUBLISH_API_BASE || "/.netlify/functions";
const UPSTREAM_ERROR_STATUSES = new Set([502, 503, 504]);
const MAX_ERROR_TEXT_LENGTH = 500;

type ApiHttpError = Error & {
  status?: number;
  statusText?: string;
  endpoint?: string;
  contentType?: string;
  rawBody?: string;
};

function trimErrorText(input: string, max = MAX_ERROR_TEXT_LENGTH): string {
  const clean = String(input || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}...`;
}

function looksLikeHtml(input: string, contentType?: string): boolean {
  const text = String(input || "").trim().toLowerCase();
  const ct = String(contentType || "").toLowerCase();

  if (ct.includes("text/html")) return true;
  if (!text) return false;

  return (
    text.startsWith("<!doctype html") ||
    text.startsWith("<html") ||
    text.includes("<head") ||
    text.includes("<body")
  );
}

function withApiMeta(error: Error, meta: Omit<ApiHttpError, "name" | "message">): ApiHttpError {
  const enriched = error as ApiHttpError;
  Object.assign(enriched, meta);
  return enriched;
}

async function parseErrorResponse(res: Response, endpoint: string): Promise<ApiHttpError> {
  const contentType = res.headers.get("content-type") || "";
  const rawBody = await res.text().catch(() => "");

  let message = "";

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const parsed = JSON.parse(rawBody);
      if (typeof parsed?.error === "string" && parsed.error.trim()) {
        message = parsed.error.trim();
      }
    } catch {
      // Ignore invalid JSON and fallback below.
    }
  }

  if (!message) {
    if (looksLikeHtml(rawBody, contentType)) {
      if (UPSTREAM_ERROR_STATUSES.has(res.status)) {
        message = `Service temporarily unavailable (HTTP ${res.status}). Please retry in a minute.`;
      } else {
        message = `Unexpected upstream error (HTTP ${res.status}).`;
      }
    } else {
      message = trimErrorText(rawBody);
    }
  }

  if (!message) {
    message = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`;
  }

  return withApiMeta(new Error(message), {
    status: res.status,
    statusText: res.statusText,
    endpoint,
    contentType,
    rawBody: trimErrorText(rawBody, 1500)
  });
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const endpoint = `${BASE}${path}`;
  const res = await fetch(endpoint, init);

  if (!res.ok) {
    throw await parseErrorResponse(res, endpoint);
  }

  return (await res.json()) as T;
}

function errMessage(e: any) {
  const s = String(e?.message || e || "");
  return s || "Request failed";
}

export async function publishPaste(title: string, content: string, slug?: string): Promise<PublishResponse> {
  return requestJson<PublishResponse>("/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, content, ...(slug ? { slug } : {}) })
  });
}

export async function getPaste(id: string): Promise<PasteResponse> {
  return requestJson<PasteResponse>(`/paste?id=${encodeURIComponent(id)}`, { method: "GET" });
}

export async function updatePaste(id: string, editCode: string, content: string): Promise<{ ok: boolean; updatedAt?: string }> {
  return requestJson<{ ok: boolean; updatedAt?: string }>("/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, editCode, content })
  });
}

export async function deletePaste(id: string, editCode: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>("/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, editCode })
  });
}

export function safeErrorText(e: any): string {
  const status = Number((e as ApiHttpError)?.status || 0);
  if (UPSTREAM_ERROR_STATUSES.has(status)) {
    return `Service temporarily unavailable (HTTP ${status}). Please retry in a minute.`;
  }
  if (status >= 500) {
    return `Server error (HTTP ${status}). Please retry.`;
  }

  try {
    // If the function returned JSON stringified error, keep it readable.
    const msg = errMessage(e);
    const parsed = JSON.parse(msg);
    const normalized = String(parsed?.error || msg);
    return looksLikeHtml(normalized) ? "Unexpected upstream error. Please retry." : trimErrorText(normalized);
  } catch {
    const msg = errMessage(e);

    if (looksLikeHtml(msg)) {
      return "Unexpected upstream error. Please retry.";
    }

    const normalized = msg.toLowerCase();
    if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
      return "Network error. Check connectivity and retry.";
    }

    return trimErrorText(msg);
  }
}
