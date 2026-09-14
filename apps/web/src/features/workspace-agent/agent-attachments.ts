import type { AgentTextAttachment, AgentTextAttachmentMediaType } from "@orch/agent/types";
import {
  AGENT_IMAGE_ATTACHMENT_MAX_BYTES,
  AGENT_TEXT_ATTACHMENT_MAX_BYTES,
  AGENT_TEXT_ATTACHMENT_MAX_FILES,
} from "@orch/agent/types";

const MEDIA_TYPE_BY_EXTENSION: Record<string, AgentTextAttachmentMediaType> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const MEDIA_TYPE_BY_MIME: Record<string, AgentTextAttachmentMediaType> = {
  "text/plain": "text/plain",
  "text/markdown": "text/markdown",
  "application/json": "application/json",
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

function isImageAttachmentMediaType(mediaType: string): boolean {
  return mediaType.startsWith("image/");
}

export function resolveAgentAttachmentMediaType(args: {
  filename?: string | null;
  mediaType?: string | null;
}): AgentTextAttachmentMediaType | null {
  const mime = args.mediaType?.trim().toLowerCase() ?? "";
  if (mime in MEDIA_TYPE_BY_MIME) {
    return MEDIA_TYPE_BY_MIME[mime] ?? null;
  }

  const extension = args.filename?.trim().split(".").pop()?.toLowerCase() ?? "";
  return MEDIA_TYPE_BY_EXTENSION[extension] ?? null;
}

export function decodeDataUrlText(url: string): string {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i.exec(url);
  if (!match) {
    throw new Error("Attachment data is invalid.");
  }

  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  if (isBase64) {
    return atob(payload);
  }
  return decodeURIComponent(payload);
}

export function filePartsToAgentAttachments(
  files: Array<{ url: string; filename?: string; mediaType?: string }>,
): AgentTextAttachment[] {
  if (files.length > AGENT_TEXT_ATTACHMENT_MAX_FILES) {
    throw new Error(`Up to ${AGENT_TEXT_ATTACHMENT_MAX_FILES} files.`);
  }

  return files.map((file) => {
    const filename = file.filename?.trim() || "attachment.txt";
    const mediaType = resolveAgentAttachmentMediaType({
      filename,
      mediaType: file.mediaType,
    });
    if (!mediaType) {
      throw new Error("Only .txt, .md, .json, and image files.");
    }

    if (isImageAttachmentMediaType(mediaType)) {
      if (!file.url.startsWith("data:image/")) {
        throw new Error("Image attachment data is invalid.");
      }
      if (file.url.length > AGENT_IMAGE_ATTACHMENT_MAX_BYTES) {
        throw new Error(
          `Each image must be ${AGENT_IMAGE_ATTACHMENT_MAX_BYTES / 1_000_000} MB or less.`,
        );
      }
      return { filename, mediaType, text: file.url };
    }

    const text = decodeDataUrlText(file.url);
    if (new TextEncoder().encode(text).length > AGENT_TEXT_ATTACHMENT_MAX_BYTES) {
      throw new Error(`Each file must be ${AGENT_TEXT_ATTACHMENT_MAX_BYTES / 1000} KB or less.`);
    }

    return { filename, mediaType, text };
  });
}
