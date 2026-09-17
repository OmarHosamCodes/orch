import { ORPCError } from "@orpc/server";
import { db } from "@orch/db";
import { agencyOpsDepartment, agencyOpsMemberHrProfile } from "@orch/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { createWorkspaceId } from "@orch/workspace";

import { requireAgencyRole } from "../shared/membership";

type AgencyDepartmentRecord = {
  id: string;
  teamId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

function mapDepartmentRow(row: {
  id: string;
  teamId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AgencyDepartmentRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeDepartmentName(name: string) {
  return name.trim();
}

export async function listAgencyDepartments(actorUserId: string, input: { teamId: string }) {
  await requireAgencyRole(actorUserId, input.teamId, "viewer");

  const rows = await db
    .select({
      id: agencyOpsDepartment.id,
      teamId: agencyOpsDepartment.teamId,
      name: agencyOpsDepartment.name,
      createdAt: agencyOpsDepartment.createdAt,
      updatedAt: agencyOpsDepartment.updatedAt,
    })
    .from(agencyOpsDepartment)
    .where(eq(agencyOpsDepartment.teamId, input.teamId))
    .orderBy(asc(agencyOpsDepartment.name));

  return { items: rows.map(mapDepartmentRow) };
}

export async function createAgencyDepartment(
  actorUserId: string,
  input: { teamId: string; name: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const name = normalizeDepartmentName(input.name);
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Department name is required." });
  }

  const now = new Date();
  try {
    const [created] = await db
      .insert(agencyOpsDepartment)
      .values({
        id: createWorkspaceId("agency-department"),
        teamId: input.teamId,
        name,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: agencyOpsDepartment.id,
        teamId: agencyOpsDepartment.teamId,
        name: agencyOpsDepartment.name,
        createdAt: agencyOpsDepartment.createdAt,
        updatedAt: agencyOpsDepartment.updatedAt,
      });

    if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
    return mapDepartmentRow(created);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ORPCError("CONFLICT", { message: "A department with that name already exists." });
    }
    throw error;
  }
}

export async function updateAgencyDepartment(
  actorUserId: string,
  input: { teamId: string; departmentId: string; name: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const name = normalizeDepartmentName(input.name);
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Department name is required." });
  }

  const [existing] = await db
    .select({ id: agencyOpsDepartment.id })
    .from(agencyOpsDepartment)
    .where(
      and(
        eq(agencyOpsDepartment.id, input.departmentId),
        eq(agencyOpsDepartment.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Department was not found." });
  }

  try {
    const [updated] = await db
      .update(agencyOpsDepartment)
      .set({ name, updatedAt: new Date() })
      .where(eq(agencyOpsDepartment.id, input.departmentId))
      .returning({
        id: agencyOpsDepartment.id,
        teamId: agencyOpsDepartment.teamId,
        name: agencyOpsDepartment.name,
        createdAt: agencyOpsDepartment.createdAt,
        updatedAt: agencyOpsDepartment.updatedAt,
      });

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
    return mapDepartmentRow(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ORPCError("CONFLICT", { message: "A department with that name already exists." });
    }
    throw error;
  }
}

export async function deleteAgencyDepartment(
  actorUserId: string,
  input: { teamId: string; departmentId: string },
) {
  await requireAgencyRole(actorUserId, input.teamId, "owner");

  const [department] = await db
    .select({ id: agencyOpsDepartment.id })
    .from(agencyOpsDepartment)
    .where(
      and(
        eq(agencyOpsDepartment.id, input.departmentId),
        eq(agencyOpsDepartment.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!department) {
    throw new ORPCError("NOT_FOUND", { message: "Department was not found." });
  }

  const [assigneeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyOpsMemberHrProfile)
    .where(
      and(
        eq(agencyOpsMemberHrProfile.teamId, input.teamId),
        eq(agencyOpsMemberHrProfile.departmentId, input.departmentId),
      ),
    );

  if ((assigneeCount?.count ?? 0) > 0) {
    throw new ORPCError("CONFLICT", {
      message: "Reassign or clear members before deleting this department.",
    });
  }

  await db.delete(agencyOpsDepartment).where(eq(agencyOpsDepartment.id, input.departmentId));
  return { departmentId: input.departmentId, deleted: true };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
