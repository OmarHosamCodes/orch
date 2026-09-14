import { appRouter } from "@orch/api/routers/index";
import { RPCHandler } from "@orpc/server/bun-ws";
import type { ServerWebSocket } from "@orpc/server/bun-ws";

import type { Context } from "@orch/api/context";
import { createWebSocketContext } from "./ws-context";

const wsRpcHandler = new RPCHandler(appRouter);

export type AgencyWebSocketData = {
  request: Request;
  context?: Context;
};

export async function authenticateWebSocket(
  ws: Bun.ServerWebSocket<AgencyWebSocketData>,
  request: Request,
) {
  const context = await createWebSocketContext(request);

  if (!context.session?.user) {
    ws.close(4401, "Unauthorized");
    return false;
  }

  ws.data.context = context;
  return true;
}

export function handleWebSocketMessage(
  ws: Bun.ServerWebSocket<AgencyWebSocketData>,
  message: string | Buffer,
) {
  const context = ws.data.context;

  if (!context?.session?.user) {
    ws.close(4401, "Unauthorized");
    return;
  }

  wsRpcHandler.message(ws as ServerWebSocket, message, { context });
}

export function handleWebSocketClose(ws: Bun.ServerWebSocket<AgencyWebSocketData>) {
  wsRpcHandler.close(ws as ServerWebSocket);
}
