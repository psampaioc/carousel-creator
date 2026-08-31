export function authenticatedQueryArgs(
  isLoading: boolean,
  isAuthenticated: boolean,
): Record<string, never> | "skip" {
  return !isLoading && isAuthenticated ? {} : "skip";
}
