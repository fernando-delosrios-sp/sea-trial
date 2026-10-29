/**
 * Safely reads an environment variable without throwing in restricted runtimes.
 */
export function safeGetEnv(key: string): string | undefined {
  try {
    return Deno.env.get(key);
  } catch {
    return undefined;
  }
}
