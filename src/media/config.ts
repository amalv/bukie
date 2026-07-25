export type MediaBackend = "local" | "r2";
export type MediaEnvironment = Partial<NodeJS.ProcessEnv>;

export type MediaConfig = {
  backend: MediaBackend;
  cacheEnabled: boolean;
};

const isEnabled = (value: string | undefined): boolean => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

export const getMediaConfig = (
  env: MediaEnvironment = process.env,
): MediaConfig => ({
  backend: env.MEDIA_BACKEND === "r2" ? "r2" : "local",
  cacheEnabled: isEnabled(env.MEDIA_CACHE_ENABLED),
});
