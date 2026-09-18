import type { AgentWriteClass } from "./types";

export function classifyAgentWrite(input: {
  domain: "agency" | "canvas" | "knowledge" | "memory" | "nav";
}): AgentWriteClass {
  return input.domain === "agency" ? "confirm" : "immediate";
}
