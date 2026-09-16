const ORCH_SLASH_VERBS = [
  "new",
  "settle",
  "stop",
  "memory",
  "task",
  "project",
  "client",
  "member",
  "entry",
] as const;

export type OrchSlashVerb = (typeof ORCH_SLASH_VERBS)[number];

export type OrchSlashCommandSuggestion = {
  verb: OrchSlashVerb;
  label: string;
  hint: string;
};

const COMMAND_META: Record<OrchSlashVerb, { hint: string }> = {
  new: { hint: "Start a new thread" },
  settle: { hint: "Archive the current thread" },
  stop: { hint: "Cancel the active run" },
  memory: { hint: "Show recent memory notes" },
  task: { hint: "Mention a task" },
  project: { hint: "Mention a project" },
  client: { hint: "Mention a client" },
  member: { hint: "Mention a member" },
  entry: { hint: "Mention a time entry" },
};

export function parseSubmittedSlashCommand(text: string): OrchSlashVerb | null {
  const match = /^\/(new|settle|stop|memory|task|project|client|member|entry)\s*$/i.exec(
    text.trim(),
  );
  return match ? (match[1]!.toLowerCase() as OrchSlashVerb) : null;
}

export function getOrchSlashCommandSuggestions(query: string): OrchSlashCommandSuggestion[] {
  const normalized = query.trim().toLowerCase().replace(/^\//, "");
  return ORCH_SLASH_VERBS.filter((verb) => !normalized || verb.startsWith(normalized)).map(
    (verb) => ({
      verb,
      label: `/${verb}`,
      hint: COMMAND_META[verb].hint,
    }),
  );
}

export function isEntitySlashVerb(
  verb: OrchSlashVerb,
): verb is "task" | "project" | "client" | "member" | "entry" {
  return (
    verb === "task" ||
    verb === "project" ||
    verb === "client" ||
    verb === "member" ||
    verb === "entry"
  );
}
