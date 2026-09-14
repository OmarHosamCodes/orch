import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useSyncExternalStore } from "react";

import {
  resetAgencyLiveConnectedForTest,
  setAgencyTeamLiveConnected,
} from "@/features/shared/live/agency-live-connected";
import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/notification-list-limit";
import { getServerUrl } from "@/lib/env";
import { orpc } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
import { refreshAgencyLiveGatedPolling } from "@/features/shared/agency-query-options";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  type AgencyLiveConnectionState,
  waitForWebSocketOpen,
} from "@/features/shared/agency-live-rpc";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

// Lazy: avoid static connection → handlers → store/orpc → env cycle (Bun test load-order).
let agencyLiveHandlersPromise: Promise<
  typeof import("@/features/shared/live/agency-live-handlers")
> | null = null;

function loadAgencyLiveHandlers() {
  agencyLiveHandlersPromise ??= import("@/features/shared/live/agency-live-handlers");
  return agencyLiveHandlersPromise;
}

export type AgencyLiveListener = (event: AgencyLiveEvent) => void;

export type SubscribeAgencyLiveOptions = {
  viewerUserId?: string | null;
};

type LiveIdentitySnapshot = {
  subscriptionGeneration: number;
  identityGeneration: number;
  viewerUserId: string | null;
};

type TeamLiveConnection = {
  websocket: WebSocket | null;
  refCount: number;
  listeners: Set<AgencyLiveListener>;
  state: AgencyLiveConnectionState;
  stateListeners: Set<() => void>;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  abortController: AbortController | null;
  subscriptionGeneration: number;
  viewerUserId: string | null;
  identityGeneration: number;
  reconciledKey: string | null;
};

const teamConnections = new Map<string, TeamLiveConnection>();

function isBenignSubscriptionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return (
    message.includes("closed or aborted while waiting for pulling") ||
    message.includes("The operation was aborted") ||
    message.includes("WebSocket connection timed out")
  );
}

function createEmptyConnection(): TeamLiveConnection {
  return {
    websocket: null,
    refCount: 0,
    listeners: new Set(),
    state: "connecting",
    stateListeners: new Set(),
    reconnectAttempt: 0,
    reconnectTimer: null,
    abortController: null,
    subscriptionGeneration: 0,
    viewerUserId: null,
    identityGeneration: 0,
    reconciledKey: null,
  };
}

function getConnection(teamId: string): TeamLiveConnection {
  let connection = teamConnections.get(teamId);
  if (!connection) {
    connection = createEmptyConnection();
    teamConnections.set(teamId, connection);
  }
  return connection;
}

function updateConnectionState(teamId: string, state: AgencyLiveConnectionState) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.state === state) {
    return;
  }
  if (connection.state === "live" && state !== "live") {
    connection.reconciledKey = null;
  }
  connection.state = state;
  setAgencyTeamLiveConnected(teamId, state === "live");
  refreshAgencyLiveGatedPolling(teamId);
  if (state === "live") {
    maybeReconcileAuthenticatedLive(teamId);
  }
  for (const listener of connection.stateListeners) {
    listener();
  }
}

function clearReconnectTimer(connection: TeamLiveConnection) {
  if (connection.reconnectTimer) {
    clearTimeout(connection.reconnectTimer);
    connection.reconnectTimer = null;
  }
}

function closeConnectionWebSocket(connection: TeamLiveConnection, reason = "subscription ended") {
  if (!connection.websocket) {
    return;
  }
  closeAgencyLiveWebSocket(connection.websocket, reason);
  connection.websocket = null;
}

function snapshotLiveIdentity(connection: TeamLiveConnection): LiveIdentitySnapshot {
  return {
    subscriptionGeneration: connection.subscriptionGeneration,
    identityGeneration: connection.identityGeneration,
    viewerUserId: connection.viewerUserId,
  };
}

function isLiveIdentityCurrent(teamId: string, snapshot: LiveIdentitySnapshot): boolean {
  const connection = teamConnections.get(teamId);
  return Boolean(
    connection &&
    connection.subscriptionGeneration === snapshot.subscriptionGeneration &&
    connection.identityGeneration === snapshot.identityGeneration &&
    connection.viewerUserId === snapshot.viewerUserId,
  );
}

function setConnectionViewer(connection: TeamLiveConnection, viewerUserId: string | null) {
  if (connection.viewerUserId === viewerUserId) {
    return;
  }
  connection.viewerUserId = viewerUserId;
  connection.identityGeneration += 1;
}

function reconcileAuthenticatedAgencyLive(teamId: string) {
  const queryClient = getQueryClient();
  void queryClient.invalidateQueries({
    queryKey: orpc.agencyOps.timer.getActive.queryKey({ input: { teamId } }),
  });
  void queryClient.invalidateQueries({
    queryKey: orpc.agencyOps.timer.listActiveMembers.queryKey({ input: { teamId } }),
  });
  void queryClient.invalidateQueries({
    queryKey: orpc.notifications.list.queryKey({
      input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
    }),
  });
  void queryClient.invalidateQueries({
    queryKey: orpc.notifications.unreadCount.queryKey({ input: { teamId } }),
  });
}

function maybeReconcileAuthenticatedLive(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.state !== "live" || !connection.viewerUserId) {
    return;
  }
  const key = `${connection.subscriptionGeneration}:${connection.identityGeneration}`;
  if (connection.reconciledKey === key) {
    return;
  }
  connection.reconciledKey = key;
  reconcileAuthenticatedAgencyLive(teamId);
}

export function setAgencyLiveViewerUserId(viewerUserId: string | null) {
  for (const teamId of [...teamConnections.keys()]) {
    const connection = teamConnections.get(teamId);
    if (!connection) {
      continue;
    }
    setConnectionViewer(connection, viewerUserId);
    maybeReconcileAuthenticatedLive(teamId);
  }
}

/** One hold key per team while signed in; viewer id is not part of the key. */
export function agencyLiveHoldKey(teamId: string, viewerUserId: string | null): string | null {
  if (!teamId || !viewerUserId) {
    return null;
  }
  return teamId;
}

/** ponytail: test-only live-state transition */
export function setAgencyLiveConnectionStateForTest(
  teamId: string,
  state: AgencyLiveConnectionState,
) {
  updateConnectionState(teamId, state);
}

/** ponytail: test-only state subscription for mounted Canvas consumers */
export function subscribeAgencyLiveConnectionStateForTest(
  teamId: string,
  onStoreChange: () => void,
) {
  return subscribeToConnectionState(teamId, onStoreChange);
}

/** ponytail: test-only identity snapshot */
export function getAgencyLiveViewerIdentityForTest(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (!connection) {
    return null;
  }
  return {
    viewerUserId: connection.viewerUserId,
    identityGeneration: connection.identityGeneration,
  };
}

let handlerLoadGate: () => Promise<void> = async () => {};

/** ponytail: test-only gate so identity can change during in-flight fan-out */
export function setAgencyLiveHandlerLoadGateForTest(gate: () => Promise<void>) {
  handlerLoadGate = gate;
}

async function fanOutEvent(teamId: string, event: AgencyLiveEvent) {
  const connection = teamConnections.get(teamId);
  if (!connection) {
    return;
  }
  const snapshot = snapshotLiveIdentity(connection);
  await handlerLoadGate();
  if (!isLiveIdentityCurrent(teamId, snapshot)) {
    return;
  }
  const { handleAgencyLiveEvent } = await loadAgencyLiveHandlers();
  if (!isLiveIdentityCurrent(teamId, snapshot)) {
    return;
  }
  handleAgencyLiveEvent(teamId, event, {
    viewerUserId: snapshot.viewerUserId,
    isCurrent: () => isLiveIdentityCurrent(teamId, snapshot),
  });
  if (!isLiveIdentityCurrent(teamId, snapshot)) {
    return;
  }
  const current = teamConnections.get(teamId);
  if (!current) {
    return;
  }
  for (const listener of current.listeners) {
    listener(event);
  }
}

function scheduleReconnect(teamId: string, generation: number) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.refCount <= 0 || generation !== connection.subscriptionGeneration) {
    return;
  }

  clearReconnectTimer(connection);
  updateConnectionState(teamId, "reconnecting");
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** connection.reconnectAttempt, RECONNECT_MAX_MS);
  connection.reconnectAttempt += 1;

  connection.reconnectTimer = setTimeout(() => {
    void startTeamSubscription(teamId, generation);
  }, delay);
}

async function startTeamSubscription(teamId: string, generation: number) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.refCount <= 0 || generation !== connection.subscriptionGeneration) {
    return;
  }

  connection.abortController?.abort();
  closeConnectionWebSocket(connection, "subscription replaced");
  connection.abortController = new AbortController();
  const subscriptionSignal = connection.abortController.signal;

  updateConnectionState(teamId, connection.reconnectAttempt > 0 ? "reconnecting" : "connecting");

  let websocket: WebSocket | null = null;
  let onWebSocketClose: (() => void) | null = null;

  try {
    const rpcConnection = createAgencyLiveRpcClient(getServerUrl());
    websocket = rpcConnection.websocket;
    connection.websocket = websocket;

    onWebSocketClose = () => {
      connection.abortController?.abort();
    };
    websocket.addEventListener("close", onWebSocketClose);

    await waitForWebSocketOpen(websocket);

    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    const iterator = await rpcConnection.client.agencyOps.live.subscribe(
      { teamId },
      { signal: subscriptionSignal },
    );

    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    updateConnectionState(teamId, "live");
    connection.reconnectAttempt = 0;

    for await (const event of iterator) {
      if (
        subscriptionSignal.aborted ||
        connection.refCount <= 0 ||
        generation !== connection.subscriptionGeneration
      ) {
        break;
      }
      await fanOutEvent(teamId, event as AgencyLiveEvent);
    }

    if (
      !subscriptionSignal.aborted &&
      connection.refCount > 0 &&
      generation === connection.subscriptionGeneration
    ) {
      scheduleReconnect(teamId, generation);
    }
  } catch (error) {
    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    if (isBenignSubscriptionError(error)) {
      scheduleReconnect(teamId, generation);
      return;
    }

    console.error("[agency-live] subscription error", error);
    updateConnectionState(teamId, "error");
    scheduleReconnect(teamId, generation);
  } finally {
    if (websocket && onWebSocketClose) {
      websocket.removeEventListener("close", onWebSocketClose);
    }
    if (
      websocket &&
      connection.websocket === websocket &&
      (connection.refCount <= 0 ||
        generation !== connection.subscriptionGeneration ||
        subscriptionSignal.aborted)
    ) {
      closeConnectionWebSocket(connection, "subscription ended");
    }
  }
}

function ensureConnectionStarted(teamId: string) {
  const connection = getConnection(teamId);
  clearReconnectTimer(connection);
  connection.reconnectAttempt = 0;
  connection.subscriptionGeneration += 1;
  const generation = connection.subscriptionGeneration;
  void startTeamSubscription(teamId, generation);
}

function teardownTeamConnection(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (!connection) {
    return;
  }

  clearReconnectTimer(connection);
  connection.abortController?.abort();
  closeConnectionWebSocket(connection, "subscription disposed");
  connection.subscriptionGeneration += 1;
  updateConnectionState(teamId, "connecting");
  maybeRemoveIdleConnection(teamId);
}

function maybeRemoveIdleConnection(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (connection && connection.refCount <= 0 && connection.stateListeners.size === 0) {
    teamConnections.delete(teamId);
  }
}

export function subscribeAgencyLive(
  teamId: string,
  listener: AgencyLiveListener,
  options?: SubscribeAgencyLiveOptions,
): () => void {
  if (!teamId) {
    return () => {};
  }

  const connection = getConnection(teamId);
  const wasInactive = connection.refCount === 0;
  connection.refCount += 1;
  connection.listeners.add(listener);
  if (options && "viewerUserId" in options) {
    setConnectionViewer(connection, options.viewerUserId ?? null);
  }

  if (wasInactive) {
    ensureConnectionStarted(teamId);
  }

  return () => {
    const current = teamConnections.get(teamId);
    if (!current) {
      return;
    }
    current.listeners.delete(listener);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      teardownTeamConnection(teamId);
    }
  };
}

export function getAgencyLiveConnectionState(teamId: string): AgencyLiveConnectionState {
  return teamConnections.get(teamId)?.state ?? "connecting";
}

function subscribeToConnectionState(teamId: string, onStoreChange: () => void): () => void {
  if (!teamId) {
    return () => {};
  }

  const connection = getConnection(teamId);
  connection.stateListeners.add(onStoreChange);
  return () => {
    const current = teamConnections.get(teamId);
    current?.stateListeners.delete(onStoreChange);
    if (current) {
      maybeRemoveIdleConnection(teamId);
    }
  };
}

export function useAgencyLiveConnectionState(teamId: string): AgencyLiveConnectionState {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToConnectionState(teamId, onStoreChange),
    () => getAgencyLiveConnectionState(teamId),
    () => "connecting",
  );
}

function teardownAllAgencyLiveConnections() {
  for (const teamId of [...teamConnections.keys()]) {
    teardownTeamConnection(teamId);
    teamConnections.delete(teamId);
  }
  resetAgencyLiveConnectedForTest();
}

/** ponytail: test-only reset; not for production */
export function resetAgencyLiveConnectionsForTest() {
  teardownAllAgencyLiveConnections();
  handlerLoadGate = async () => {};
}

// ponytail: Vite HMR reloads this module without unmounting React; close sockets so server
// subscribers don't accumulate until restart.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownAllAgencyLiveConnections();
  });
}
