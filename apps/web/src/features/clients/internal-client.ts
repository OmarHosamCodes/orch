export const INTERNAL_CLIENT_NAME = "Internal";

export type InternalClientCandidate = {
  id: string;
  name: string;
  category?: string | null;
};

export function findInternalClient<T extends InternalClientCandidate>(
  clients: readonly T[],
): T | undefined {
  return (
    clients.find((client) => client.category === "internal") ??
    clients.find(
      (client) => client.name.trim().toLowerCase() === INTERNAL_CLIENT_NAME.toLowerCase(),
    )
  );
}

export function pickDefaultProjectClientId(
  clients: readonly InternalClientCandidate[],
): string | null {
  return findInternalClient(clients)?.id ?? clients[0]?.id ?? null;
}

type CreateClientFn = (
  payload: {
    teamId: string;
    name: string;
    category?: "internal" | "external";
  },
  callbacks?: { onSuccess?: (clientId: string) => void },
) => Promise<unknown> | unknown;

export async function ensureInternalClientId(options: {
  teamId: string;
  clients: readonly InternalClientCandidate[];
  createClient: CreateClientFn;
  asInternalCategory: boolean;
}): Promise<string | null> {
  const existing = findInternalClient(options.clients);
  if (existing) return existing.id;

  let createdId: string | null = null;
  await options.createClient(
    {
      teamId: options.teamId,
      name: INTERNAL_CLIENT_NAME,
      ...(options.asInternalCategory ? { category: "internal" as const } : {}),
    },
    {
      onSuccess: (clientId) => {
        createdId = clientId;
      },
    },
  );
  return createdId;
}
