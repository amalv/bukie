export const getEnvironmentDependentUrl = () => {
  const isProduction = import.meta.env.VITE_ENV === "production";
  if (isProduction) {
    return `${window.location.origin}/bukie`;
  }
  return window.location.origin;
};
