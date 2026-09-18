export function buildCanvasScopedPatchNote(input: {
  scopeNodes: Array<{ id: string; title: string }>;
}) {
  const node = input.scopeNodes[0];
  if (!node) return "";
  return [
    `Scoped node: ${node.id} (“${node.title}”).`,
    "Draft or apply patches against this nodeId (block.patch / node.update).",
    "Do not create a new node unless the user explicitly asks for one.",
    "After apply_canvas_action, tell the user how to Open the node.",
    "To link Agency: node.update agencyRef { teamId, projectId?, taskId? } on a team-visible node. Never invent ids.",
  ].join(" ");
}
