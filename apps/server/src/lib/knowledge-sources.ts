import { rejectIfUploadsBlocked } from "@orch/api/billing-uploads";
import { createContext, type Context } from "@orch/api/context";
import { compressImage, replaceFileExtension } from "@orch/api/image-compression";
import { getKnowledgeSourceReadUrl, uploadKnowledgeSourceBuffer } from "@orch/api/storage";
import { db } from "@orch/db";
import { workspaceTeamMember } from "@orch/db/schema";
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

export function registerKnowledgeSourceUploadRoute(app: Hono) {
  app.post("/uploads/knowledge-sources", async (c) => {
    const requestContext = await createContext({ context: c });
    const userId = requestContext.session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const teamId = formData.get("teamId");
    const file = formData.get("file");

    if (typeof teamId !== "string" || !teamId) {
      return c.json({ error: "teamId is required" }, 400);
    }

    if (!(file instanceof File)) {
      return c.json({ error: "file is required" }, 400);
    }

    const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "File size must be under 50MB" }, 400);
    }

    const memberUserId = await requireAuthTeamAccess(requestContext, teamId);
    if (!memberUserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const uploadGate = await rejectIfUploadsBlocked(teamId);
    if (!uploadGate.ok) {
      const { status, body } = uploadGate.response;
      return c.json(body, status);
    }

    let fileName = file.name;
    let mimeType = file.type || "application/octet-stream";
    let uploadBuffer = Buffer.from(await file.arrayBuffer());

    if (mimeType.startsWith("image/")) {
      const compressed = await compressImage(uploadBuffer, mimeType, { maxDimension: 2560 });
      if (compressed) {
        uploadBuffer = Buffer.from(compressed.buffer);
        mimeType = compressed.mimeType;
        if (compressed.changed) {
          fileName = replaceFileExtension(fileName, "webp");
        }
      }
    }

    const extension = fileName.split(".").pop() ?? "";
    const uploadId = createWorkspaceId("ksrc");
    const storageKey = `knowledge-sources/${teamId}/${uploadId}${extension ? `.${extension}` : ""}`;

    await uploadKnowledgeSourceBuffer({
      storageKey,
      buffer: uploadBuffer,
      mimeType,
    });

    return c.json(
      {
        uploadId,
        storageKey,
        publicUrl: await getKnowledgeSourceReadUrl(storageKey),
        fileName,
        mimeType,
        sizeBytes: uploadBuffer.byteLength,
        teamId,
      },
      201,
    );
  });
}
