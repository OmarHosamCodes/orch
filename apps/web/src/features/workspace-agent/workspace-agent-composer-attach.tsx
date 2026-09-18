import { useRef } from "react";
import type { AgentTextAttachment } from "@orch/agent/types";
import { FileText } from "lucide-react";

import { ComposerMenuItem } from "@/components/elements/composer";
import { filePartsToAgentAttachments } from "@/features/workspace-agent/agent-attachments";

export function WorkspaceAgentComposerAttachItem({
  onAttachments,
  onClose,
}: {
  onAttachments: (attachments: AgentTextAttachment[]) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <ComposerMenuItem
        onClick={() => {
          inputRef.current?.click();
        }}
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        Attach file
      </ComposerMenuItem>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.json,.png,.jpg,.jpeg,.webp,.gif,text/plain,text/markdown,application/json,image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length === 0) return;
          void Promise.all(
            files.map(
              (file) =>
                new Promise<{ url: string; filename: string; mediaType: string }>(
                  (resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = () => reject(new Error("Couldn't read that file."));
                    reader.onload = () => {
                      resolve({
                        url: String(reader.result ?? ""),
                        filename: file.name,
                        mediaType: file.type,
                      });
                    };
                    if (file.type.startsWith("image/")) {
                      reader.readAsDataURL(file);
                    } else {
                      reader.readAsDataURL(file);
                    }
                  },
                ),
            ),
          )
            .then((parts) => {
              onAttachments(filePartsToAgentAttachments(parts));
              onClose();
            })
            .catch(() => {
              onClose();
            });
        }}
      />
    </>
  );
}
