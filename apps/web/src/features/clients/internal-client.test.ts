import { describe, expect, test } from "bun:test";

import {
  ensureInternalClientId,
  findInternalClient,
  INTERNAL_CLIENT_NAME,
  pickDefaultProjectClientId,
} from "./internal-client";

describe("internal client defaults", () => {
  test("prefers a category-internal client over name match and first row", () => {
    const clients = [
      { id: "c1", name: "Acme", category: "external" as const },
      { id: "c2", name: "Internal", category: "external" as const },
      { id: "c3", name: "Studio", category: "internal" as const },
    ];
    expect(findInternalClient(clients)?.id).toBe("c3");
    expect(pickDefaultProjectClientId(clients)).toBe("c3");
  });

  test("falls back to a client named Internal, then the first client", () => {
    expect(
      pickDefaultProjectClientId([
        { id: "c1", name: "Acme", category: "external" },
        { id: "c2", name: "Internal", category: "external" },
      ]),
    ).toBe("c2");
    expect(pickDefaultProjectClientId([{ id: "c1", name: "Acme" }])).toBe("c1");
    expect(pickDefaultProjectClientId([])).toBeNull();
  });

  test("creates Internal when none exist", async () => {
    const created = await ensureInternalClientId({
      teamId: "team-1",
      clients: [],
      asInternalCategory: true,
      createClient: (payload, callbacks) => {
        expect(payload).toEqual({
          teamId: "team-1",
          name: INTERNAL_CLIENT_NAME,
          category: "internal",
        });
        callbacks?.onSuccess?.("new-internal");
      },
    });
    expect(created).toBe("new-internal");
  });

  test("reuses an existing Internal client without creating", async () => {
    let created = false;
    const id = await ensureInternalClientId({
      teamId: "team-1",
      clients: [{ id: "existing", name: "Internal", category: "internal" }],
      asInternalCategory: true,
      createClient: () => {
        created = true;
      },
    });
    expect(id).toBe("existing");
    expect(created).toBe(false);
  });
});
