import type {
  KnowledgeBoardCardKind,
  KnowledgeObjectType,
  WorkspaceNodeConnection,
  WorkspaceNodeTint,
  WorkspaceNodeType,
} from "@orch/workspace";

interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasNodeModel extends CanvasRect {
  id: string;
  kind?: KnowledgeBoardCardKind;
  objectType?: KnowledgeObjectType;
  parentId?: string | null;
  href?: string;
  agencyHref?: string | null;
  chip?: string;
  bodyPreview?: string;
  readOnly?: boolean;
  unplaced?: boolean;
  label?: string;
  title?: string;
  content?: string;
  nodeType?: WorkspaceNodeType;
  connections?: WorkspaceNodeConnection[];
  minWidth?: number;
  minHeight?: number;
  dashboard?: {
    tint?: WorkspaceNodeTint;
  };
}
