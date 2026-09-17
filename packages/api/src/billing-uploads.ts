import { ORPCError } from "@orpc/server";

import { assertTaskAndKnowledgeUploadsAllowed } from "./billing-team";

export type UploadBlockedHttpResponse = {
  status: 403;
  body: { error: string; code: "upload_blocked" };
};

export async function rejectIfUploadsBlocked(
  teamId: string,
): Promise<{ ok: true } | { ok: false; response: UploadBlockedHttpResponse }> {
  try {
    await assertTaskAndKnowledgeUploadsAllowed(teamId);
    return { ok: true };
  } catch (error) {
    const blocked = mapUploadBlockedOrpcError(error);
    if (blocked) {
      return { ok: false, response: blocked };
    }
    throw error;
  }
}

export function mapUploadBlockedOrpcError(error: unknown): UploadBlockedHttpResponse | null {
  if (error instanceof ORPCError && error.code === "FORBIDDEN") {
    const data = error.data as { code?: string } | undefined;
    if (data?.code === "upload_blocked") {
      return {
        status: 403,
        body: { error: error.message, code: "upload_blocked" },
      };
    }
  }
  return null;
}
