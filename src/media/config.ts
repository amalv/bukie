export type MediaBackend = "local" | "r2";
export type MediaEnvironment = Partial<NodeJS.ProcessEnv>;

export type MediaConfig = {
  backend: MediaBackend;
  cacheEnabled: boolean;
  r2PublicBaseUrl?: string;
};

const isEnabled = (value: string | undefined): boolean => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const normalizeBaseUrl = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
};

export const getMediaConfig = (
  env: MediaEnvironment = process.env,
): MediaConfig => ({
  backend: env.MEDIA_BACKEND === "r2" ? "r2" : "local",
  cacheEnabled: isEnabled(env.MEDIA_CACHE_ENABLED),
  r2PublicBaseUrl: normalizeBaseUrl(env.R2_PUBLIC_BASE_URL),
});
