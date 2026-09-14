type OrpcErrorShape = {
  code?: string;
  error?: { code?: string };
};

function getOrpcErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const known = error as OrpcErrorShape;
  return known.error?.code ?? known.code ?? null;
}

export function isOrpcNotFoundError(error: unknown): boolean {
  return getOrpcErrorCode(error) === "NOT_FOUND";
}
