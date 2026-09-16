import { runDueDetections } from "@orch/api/routers/agent/detection-lifecycle";

export function startAgentDetectionScheduler() {
  const intervalMs = 60 * 60 * 1000;
  void runDueDetections();
  setInterval(() => {
    void runDueDetections();
  }, intervalMs);
}
