export function canvasWorkspaceHref(workspaceId: string) {
  return `/canvas/${workspaceId}`;
}

export function canvasWorkspaceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/canvas\/([^/]+)/);
  const id = match?.[1];
  return id && id.length > 0 ? id : null;
}

/** CNS = null, a named brain = id, any other product surface = undefined (do not filter). */
export function orchCanvasWorkspaceIdFromPath(pathname: string): string | null | undefined {
  if (pathname === "/canvas" || pathname.startsWith("/canvas/")) {
    return canvasWorkspaceIdFromPath(pathname);
  }
  return undefined;
}
