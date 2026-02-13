import { connectLambda, getStore } from "@netlify/blobs";

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

export const handler = async (event: any) => {
  // Required when running in Lambda compatibility mode
  connectLambda(event);

  const store = getStore({ name: STORE_NAME });

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const id = String(event.queryStringParameters?.id ?? "").trim();
  if (!id) return json(400, { error: "Missing id" });

  const raw = await store.get(`pastes/${id}`);
  if (!raw) return json(404, { error: "Not found" });

  let data: any = null;
  try {
    data = JSON.parse(String(raw));
  } catch {
    return json(500, { error: "Corrupted data" });
  }

  // Never expose editHash
  return json(200, {
    id: data.id,
    title: data.title || "",
    content: data.content || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  });
};
