export type CmsSessionMode = "legacy" | "hybrid" | "http_only";

function normalizeSessionMode(input: string | undefined): CmsSessionMode {
  const raw = (input || "").trim().toLowerCase();
  if (raw === "legacy" || raw === "hybrid" || raw === "http_only") {
    return raw;
  }
  return "hybrid";
}

export const CMS_SESSION_MODE = normalizeSessionMode(
  process.env.NEXT_PUBLIC_CMS_SESSION_MODE
);

export const USE_HTTP_ONLY_SESSION_COOKIES = CMS_SESSION_MODE !== "legacy";
export const PERSIST_TOKENS_TO_LOCAL_STORAGE = CMS_SESSION_MODE === "legacy";
