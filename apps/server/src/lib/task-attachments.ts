import { oversizeUploadResponse } from "@orch/api/billing-upload-route-order";
import { rejectIfUploadsBlocked } from "@orch/api/billing-uploads";
import { createContext, type Context } from "@orch/api/context";
import { compressImage, replaceFileExtension } from "@orch/api/image-compression";
import {
  createTaskAttachmentUploadToken,
  getTaskAttachmentReadUrl,
  uploadTaskAttachmentBuffer,
} from "@orch/api/storage";
import { db } from "@orch/db";
import { agencyOpsProjectTask, workspaceTeamMember } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";

async function requireAuthTeamAccess(context: Context, teamId: string) {
  const userId = context.session?.user?.id;
  if (!userId) {
    return null;
  }

  const [membership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  return membership ? userId : null;
}

async function resolveTaskProjectId(teamId: string, taskId: string) {
  const [task] = await db
    .select({ projectId: agencyOpsProjectTask.projectId })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  return task?.projectId ?? null;
}

export function registerTaskAttachmentUploadRoute(app: Hono) {
  app.post("/uploads/task-attachments", async (c) => {
    const requestContext = await createContext({ context: c });
    const userId = requestContext.session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const teamId = formData.get("teamId");
    const taskId = formData.get("taskId");
    const file = formData.get("file");

    if (typeof teamId !== "string" || !teamId) {
      return c.json({ error: "teamId is required" }, 400);
    }

    if (!(file instanceof File)) {
      return c.json({ error: "file is required" }, 400);
    }

    if (typeof taskId !== "string" || !taskId) {
      return c.json({ error: "taskId is required" }, 400);
    }

    const memberUserId = await requireAuthTeamAccess(requestContext, teamId);
    if (!memberUserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const projectId = await resolveTaskProjectId(teamId, taskId);
    if (!projectId) {
      return c.json({ error: "Task not found" }, 404);
    }

    const uploadGate = await rejectIfUploadsBlocked(teamId);
    if (!uploadGate.ok) {
      const { status, body } = uploadGate.response;
      return c.json(body, status);
    }

    const oversize = oversizeUploadResponse(file.size);
    if (oversize) {
      return c.json(oversize.body, oversize.status);
    }

    let fileName = file.name;
    let mimeType = file.type || "application/octet-stream";
    let uploadBuffer = Buffer.from(await file.arrayBuffer());
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;

    if (mimeType.startsWith("image/")) {
      const compressed = await compressImage(uploadBuffer, mimeType, { maxDimension: 2560 });
      if (compressed) {
        uploadBuffer = Buffer.from(compressed.buffer);
        mimeType = compressed.mimeType;
        imageWidth = compressed.width;
        imageHeight = compressed.height;
        if (compressed.changed) {
          fileName = replaceFileExtension(fileName, "webp");
        }
      }
    }

    const extension = fileName.split(".").pop() ?? "";
    const storageKey = `task-attachments/${teamId}/${taskId}/${createWorkspaceId("upload")}${extension ? `.${extension}` : ""}`;

    await uploadTaskAttachmentBuffer({
      storageKey,
      buffer: uploadBuffer,
      mimeType,
    });

    return c.json(
      {
        storageKey,
        publicUrl: await getTaskAttachmentReadUrl(storageKey),
        uploadToken: createTaskAttachmentUploadToken({
          teamId,
          taskId,
          fileName,
          mimeType,
          storageKey,
          sizeBytes: uploadBuffer.byteLength,
        }),
        fileName,
        mimeType,
        sizeBytes: uploadBuffer.byteLength,
        ...(imageWidth != null && imageHeight != null ? { imageWidth, imageHeight } : {}),
        taskId,
        projectId,
      },
      201,
    );
  });
}
