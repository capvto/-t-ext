import { connectLambda, getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "crypto";

const STORE_NAME = "t-ext-rentry";
const MAX_LEN = 200_000; // ~200KB

const SLUG_MIN = 2;
const SLUG_MAX = 64;
const RESERVED_SLUGS = new Set([
  "p", // legacy public route prefix
  "assets",
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "index.html"
]);

function json(statusCode: number, data: any) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    },
    body: JSON.stringify(data)
  };
}

function makeId() {
  // 8 chars base62
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function makeCode() {
  // 12 chars base62
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

function normalizeSlug(raw: string) {
  let s = String(raw || "").trim().toLowerCase();
  if (!s) return "";
  // Basic friendly normalization (spaces => '-', drop unsupported chars)
  s = s.replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9-_]+/g, "-");
  s = s.replace(/-+/g, "-");
  s = s.replace(/^[-_]+|[-_]+$/g, "");
  if (!s) return "";
  if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX).replace(/^[-_]+|[-_]+$/g, "");
  return s;
}

async function ensureUniqueOrThrow(store: ReturnType<typeof getStore>, id: string) {
  const existing = await store.get(`pastes/${id}`);
  if (existing) {
    const err: any = new Error("Slug already in use");
    err.statusCode = 409;
    throw err;
  }
}

async function generateUniqueId(store: ReturnType<typeof getStore>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const id = makeId();
    const key = `pastes/${id}`;
    const existing = await store.get(key);
    if (!existing) return id;
  }
  // Fallback (very unlikely)
  return makeId() + makeId();
}

export const handler = async (event: any) => {
  // Required when running in Lambda compatibility mode
  connectLambda(event);

  // Default is eventual consistency (fast reads). Strong consistency requires
  // additional runtime context that isn't always available in Lambda-compat.
  const store = getStore({ name: STORE_NAME });

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: any = null;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const content = String(body?.content ?? "");
  const title = typeof body?.title === "string" ? body.title.slice(0, 120) : "";
  const requestedSlug = typeof body?.slug === "string" ? body.slug : "";

  if (!content.trim()) return json(400, { error: "Empty content" });
  if (content.length > MAX_LEN) return json(413, { error: "Content too large" });

  let id = "";
  const slug = normalizeSlug(requestedSlug);
  if (requestedSlug && String(requestedSlug).trim()) {
    if (!slug) return json(400, { error: "Invalid slug" });
    if (slug.length < SLUG_MIN) return json(400, { error: `Slug too short (min ${SLUG_MIN})` });
    if (RESERVED_SLUGS.has(slug)) return json(400, { error: "Slug not allowed" });
    try {
      await ensureUniqueOrThrow(store, slug);
    } catch (e: any) {
      if (e?.statusCode === 409) return json(409, { error: "This link is already in use" });
      throw e;
    }
    id = slug;
  } else {
    id = await generateUniqueId(store);
  }
  const editCode = makeCode();
  const editHash = sha256Hex(editCode);

  const now = new Date().toISOString();
  await store.setJSON(`pastes/${id}`, {
    id,
    title,
    content,
    createdAt: now,
    updatedAt: now,
    editHash
  });

  const origin =
    (event.headers?.["x-forwarded-proto"] && event.headers?.["x-forwarded-host"])
      ? `${event.headers["x-forwarded-proto"]}://${event.headers["x-forwarded-host"]}`
      : "";

  const encId = encodeURIComponent(id);
  const viewUrl = origin ? `${origin}/${encId}` : `/${encId}`;

  // We do not expose an "edit link": editing is unlocked on the public page by
  // inserting the secret edit code.
  return json(200, { id, editCode, viewUrl });
};
