import { useContext } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { OrchMessageParts } from "@/features/workspace-agent/workspace-agent-thread-data-ui";
import {
  WorkspaceAgentThreadMessageContext,
  WorkspaceAgentThreadWelcome,
} from "@/features/workspace-agent/workspace-agent-thread-slots";

export function OrchMessageList() {
  const ctx = useContext(WorkspaceAgentThreadMessageContext);
  if (!ctx) return null;
  if (ctx.messages.length === 0) {
    return (
      <Conversation>
        <ConversationEmptyState>
          <WorkspaceAgentThreadWelcome />
        </ConversationEmptyState>
      </Conversation>
    );
  }

  return (
    <Conversation>
      <ConversationContent>
        {ctx.messages.map((message) => {
          const from = message.role === "user" ? "user" : "assistant";
          return (
            <Message key={message.id} from={from}>
              <MessageContent from={from}>
                <OrchMessageParts message={message} />
              </MessageContent>
            </Message>
          );
        })}
      </ConversationContent>
    </Conversation>
  );
}
