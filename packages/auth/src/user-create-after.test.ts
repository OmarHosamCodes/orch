import { describe, expect, test } from "bun:test";

import { createUserCreateAfterHandler } from "./user-create-after";

const user = {
  id: "user-1",
  email: "person@example.com",
  name: "Personal Agency",
};

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("createUserCreateAfterHandler", () => {
  test("schedules Polar without awaiting it and awaits Agency creation", async () => {
    const polar = deferred();
    const agency = deferred();
    const events: string[] = [];
    const handler = createUserCreateAfterHandler({
      schedulePolarCustomerSetup: () => {
        events.push("polar-scheduled");
        void polar.promise;
      },
      logError: () => {},
    });
    handler.registerPersonalAgencyOnUserCreate(async () => {
      events.push("agency-started");
      await agency.promise;
      events.push("agency-finished");
    });

    let completed = false;
    const afterPromise = handler.afterUserCreate(user).then(() => {
      completed = true;
    });
    await Promise.resolve();

    expect(events).toEqual(["polar-scheduled", "agency-started"]);
    expect(completed).toBe(false);

    agency.resolve();
    await afterPromise;

    expect(events).toEqual(["polar-scheduled", "agency-started", "agency-finished"]);
    expect(completed).toBe(true);
  });

  test("logs and rethrows Agency creation failures", async () => {
    const failure = new Error("Agency insert failed");
    const logged: Array<[string, unknown]> = [];
    const handler = createUserCreateAfterHandler({
      schedulePolarCustomerSetup: () => {},
      logError: (message, error) => logged.push([message, error]),
    });
    handler.registerPersonalAgencyOnUserCreate(async () => {
      throw failure;
    });

    await expect(handler.afterUserCreate(user)).rejects.toBe(failure);

    expect(logged).toEqual([["Personal Agency setup failed:", failure]]);
  });

  test("throws when the Agency callback was not registered", async () => {
    const logged: Array<[string, unknown]> = [];
    const handler = createUserCreateAfterHandler({
      schedulePolarCustomerSetup: () => {},
      logError: (message, error) => logged.push([message, error]),
    });

    const result = handler.afterUserCreate(user);

    await expect(result).rejects.toThrow("Personal Agency user-create handler is not registered.");
    expect(logged).toHaveLength(1);
  });
});
