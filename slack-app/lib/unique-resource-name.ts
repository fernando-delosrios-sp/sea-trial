export const MAX_NAME_COLLISION_ATTEMPTS = 100;

/** Slack API rejected create because the display name is already in use. */
export class NameCollisionError extends Error {
  constructor(public readonly slackError: string) {
    super(`Name collision: ${slackError}`);
    this.name = "NameCollisionError";
  }
}

/**
 * Formats a candidate display name for a collision retry attempt.
 * Attempt 0 returns the base name; attempt N returns `{base}-{N}`.
 */
export function formatSuffixedName(baseName: string, attemptIndex: number): string {
  if (attemptIndex <= 0) return baseName;
  return `${baseName}-${attemptIndex}`;
}

/** Returns true when a Slack error indicates a display-name collision. */
export function isNameCollisionError(error: string | undefined): boolean {
  if (!error) return false;
  switch (error) {
    case "name_taken":
    case "already_exists":
    case "name_already_exists":
      return true;
    default:
      return false;
  }
}

export interface AllocateUniqueNameResult<T> {
  name: string;
  result: T;
}

/**
 * Attempts create with the base name, then `-1`, `-2`, … until success or cap.
 */
export async function allocateUniqueName<T>(
  baseName: string,
  tryCreate: (candidateName: string) => Promise<T>,
  options: { maxAttempts?: number } = {},
): Promise<AllocateUniqueNameResult<T>> {
  const maxAttempts = options.maxAttempts ?? MAX_NAME_COLLISION_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateName = formatSuffixedName(baseName, attempt);
    try {
      const result = await tryCreate(candidateName);
      return { name: candidateName, result };
    } catch (error) {
      const isCollision = error instanceof NameCollisionError ||
        (error instanceof Error &&
          isNameCollisionError(
            error.message.replace(/^Name collision: /, ""),
          ));
      if (isCollision) {
        if (attempt < maxAttempts - 1) {
          continue;
        }
        throw new Error(
          `Failed to allocate unique name for "${baseName}" after ${maxAttempts} attempts`,
        );
      }
      throw error;
    }
  }

  throw new Error(
    `Failed to allocate unique name for "${baseName}" after ${maxAttempts} attempts`,
  );
}
