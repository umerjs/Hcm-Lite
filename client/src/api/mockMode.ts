/**
 * Mock mode helper for client api functions.
 * When VITE_USE_MOCK=true, api functions return typed fixtures from client/src/api/mocks/.
 */

export const isMockMode = (moduleName?: string): boolean => {
  const globalMock = import.meta.env.VITE_USE_MOCK === "true";
  if (!globalMock) return false;

  // Specific module overrides if needed: e.g. VITE_MOCK_ATTENDANCE=false
  if (moduleName) {
    const envKey = `VITE_MOCK_${moduleName.toUpperCase()}`;
    const override = (import.meta.env as Record<string, string | undefined>)[envKey];
    if (override !== undefined) {
      return override === "true";
    }
  }

  return true;
};

export const mockDelay = (ms = 300): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
