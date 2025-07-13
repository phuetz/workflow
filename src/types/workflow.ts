export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  type: string;
  label: string;
  position: Position;
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface NodeType {
  type: string;
  label: string;
  icon: string;
  color: string;
  category: string;
  inputs: number;
  outputs: number;
  description: string;
  /** Whether the node exposes an "on error" handle */
  errorHandle?: boolean;
}