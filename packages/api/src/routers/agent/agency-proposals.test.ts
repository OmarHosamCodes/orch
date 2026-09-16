import { describe, expect, test } from "bun:test";

import {
  buildAgencyActionAfter,
  loadAgencyActionBefore,
  proposalStateFingerprint,
} from "./agency-proposals";

describe("agency proposal before/after nullability", () => {
  test("create actions use null before (DB columns must allow null)", async () => {
    const creates = [
      { type: "client.create" as const, name: "Acme" },
      { type: "project.create" as const, name: "P", clientId: "c1" },
      { type: "task.create" as const, title: "T", projectId: "p1" },
      { type: "tag.create" as const, name: "tag" },
      {
        type: "time_entry.create" as const,
        projectId: "p1",
        startAt: "2026-08-04T09:00:00.000Z",
        endAt: "2026-08-04T10:00:00.000Z",
      },
    ];

    for (const action of creates) {
      const before = await loadAgencyActionBefore("user", "team", action);
      expect(before).toBeNull();
      expect(buildAgencyActionAfter(before, action)).not.toBeNull();
    }
  });

  test("delete actions use null after", () => {
    const deletes = [
      { type: "time_entry.delete" as const, entryId: "e1" },
      { type: "task.delete" as const, taskId: "t1" },
      { type: "tag.delete" as const, tagId: "g1" },
      { type: "timer.stop" as const },
    ];

    for (const action of deletes) {
      expect(buildAgencyActionAfter({ id: "x" }, action)).toBeNull();
    }
  });
});

describe("proposalStateFingerprint", () => {
  test("ignores updatedAt so a later save does not look like a conflict", () => {
    const before = {
      id: "agency-time-1",
      isWaste: false,
      endedAt: "2026-09-15T00:14:25.827Z",
      updatedAt: "2026-09-15T00:14:30.696Z",
    };
    const current = {
      ...before,
      updatedAt: "2026-09-16T09:00:00.000Z",
      durationSeconds: 99,
    };
    expect(proposalStateFingerprint(current)).toBe(proposalStateFingerprint(before));
  });

  test("still detects a real isWaste change", () => {
    expect(proposalStateFingerprint({ id: "agency-time-1", isWaste: false })).not.toBe(
      proposalStateFingerprint({ id: "agency-time-1", isWaste: true }),
    );
  });

  test("treats the same fields as equal regardless of JSON key order", () => {
    expect(
      proposalStateFingerprint({
        isWaste: false,
        id: "agency-time-1",
        source: "manual",
      }),
    ).toBe(
      proposalStateFingerprint({
        id: "agency-time-1",
        source: "manual",
        isWaste: false,
      }),
    );
  });
});
