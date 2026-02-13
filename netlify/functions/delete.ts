import { connectLambda, getStore } from "@netlify/blobs";
import { createHash } from "crypto";

const STORE_NAME = "t-ext-rentry";

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

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export const handler = async (event: any) => {
  // Required when running in Lambda compatibility mode
  connectLambda(event);

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

  const id = String(body?.id ?? "").trim();
  const editCode = String(body?.editCode ?? "");

  if (!id) return json(400, { error: "Missing id" });
  if (!editCode) return json(401, { error: "Missing edit code" });

  const key = `pastes/${id}`;
  const raw = await store.get(key);
if (!raw) return json(404, { error: "Not found" });

let data: any = null;
try {
  data = JSON.parse(String(raw));
} catch {
  return json(500, { error: "Corrupted data" });
}

  const expected = String(data.editHash || "");
  const provided = sha256Hex(editCode);
  if (!expected || provided !== expected) {
    return json(403, { error: "Invalid edit code" });
  }

  await store.delete(key);
  return json(200, { ok: true });
};
