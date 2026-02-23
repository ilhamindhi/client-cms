const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";

export function getBackendApiBaseUrl() {
  const raw =
    process.env.CMS_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    DEFAULT_API_BASE_URL;
  return raw.replace(/\/+$/, "");
}
