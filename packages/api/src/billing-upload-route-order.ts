export const MAX_TASK_KNOWLEDGE_UPLOAD_BYTES = 50 * 1024 * 1024;

export type TaskKnowledgeUploadValidationStep =
  | "validate_fields"
  | "membership"
  | "upload_blocked_gate"
  | "size_limit"
  | "storage";

/** HTTP upload routes must run gates in this order so trial/leftover teams get upload_blocked (403), not oversize (400). */
export const TASK_KNOWLEDGE_UPLOAD_VALIDATION_ORDER: readonly TaskKnowledgeUploadValidationStep[] =
  ["validate_fields", "membership", "upload_blocked_gate", "size_limit", "storage"];

export function oversizeUploadResponse(
  fileSizeBytes: number,
): { status: 400; body: { error: string } } | null {
  if (fileSizeBytes > MAX_TASK_KNOWLEDGE_UPLOAD_BYTES) {
    return { status: 400, body: { error: "File size must be under 50MB" } };
  }
  return null;
}
