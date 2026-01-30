export type PublishResponse = {
  id: string;
  editCode: string;
  viewUrl: string;
  editUrl: string;
};

export type PasteResponse = {
  id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

const BASE = (import.meta as any).env?.VITE_PUBLISH_API_BASE || "/.netlify/functions";

function errMessage(e: any) {
  const s = String(e?.message || e || "");
  return s || "Request failed";
}

export async function publishPaste(title: string, content: string, slug?: string): Promise<PublishResponse> {
  const res = await fetch(`${BASE}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, content, ...(slug ? { slug } : {}) })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as PublishResponse;
}

export async function getPaste(id: string): Promise<PasteResponse> {
  const res = await fetch(`${BASE}/paste?id=${encodeURIComponent(id)}`, { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as PasteResponse;
}

export async function updatePaste(id: string, editCode: string, content: string): Promise<{ ok: boolean; updatedAt?: string }> {
  const res = await fetch(`${BASE}/update`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, editCode, content })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as { ok: boolean; updatedAt?: string };
}

export async function deletePaste(id: string, editCode: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, editCode })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as { ok: boolean };
}

export function safeErrorText(e: any): string {
  try {
    // If the function returned JSON stringified error, keep it readable.
    const msg = errMessage(e);
    const parsed = JSON.parse(msg);
    return String(parsed?.error || msg);
  } catch {
    return errMessage(e);
  }
}
