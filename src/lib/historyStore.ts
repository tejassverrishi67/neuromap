import { Node, Edge } from "@xyflow/react";

export interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface CanvasHistory {
  past: HistorySnapshot[];
  present: HistorySnapshot;
  future: HistorySnapshot[];
}

// Global in-memory history registry to allow undoing operations
// like Brain Dump imports after client-side router redirect.
export const globalCanvasHistory: Record<string, CanvasHistory> = {};

/**
 * Perform a fast O(N) structural diff between two canvas state snapshots,
 * ignoring selection, focus, dragging flags, and conflict decorations.
 */
export function isStateDifferent(s1: HistorySnapshot | null, s2: HistorySnapshot | null): boolean {
  if (!s1 || !s2) return true;
  if (s1.edges.length !== s2.edges.length) return true;
  if (s1.nodes.length !== s2.nodes.length) return true;

  // Compare edges by ID map
  const s2EdgesMap = new Map<string, Edge>();
  for (let i = 0; i < s2.edges.length; i++) {
    const e = s2.edges[i];
    s2EdgesMap.set(e.id, e);
  }

  for (let i = 0; i < s1.edges.length; i++) {
    const e1 = s1.edges[i];
    const e2 = s2EdgesMap.get(e1.id);
    if (!e2) return true;
    if (e1.source !== e2.source || e1.target !== e2.target) return true;
  }

  // Compare nodes by ID map
  const s2NodesMap = new Map<string, Node>();
  for (let i = 0; i < s2.nodes.length; i++) {
    const n = s2.nodes[i];
    s2NodesMap.set(n.id, n);
  }

  for (let i = 0; i < s1.nodes.length; i++) {
    const n1 = s1.nodes[i];
    const n2 = s2NodesMap.get(n1.id);
    if (!n2) return true;

    if (n1.type !== n2.type) return true;
    if (n1.position?.x !== n2.position?.x || n1.position?.y !== n2.position?.y) return true;

    const d1 = (n1.data || {}) as any;
    const d2 = (n2.data || {}) as any;

    if (d1.nodeType !== d2.nodeType) return true;
    if (d1.title !== d2.title) return true;
    if (d1.content !== d2.content) return true;
    if (d1.status !== d2.status) return true;
    if (d1.priority !== d2.priority) return true;
    if (d1.progress !== d2.progress) return true;
    if (d1.dueDate !== d2.dueDate) return true;
    if (d1.warningThreshold !== d2.warningThreshold) return true;

    const t1 = d1.tags || [];
    const t2 = d2.tags || [];
    if (t1.length !== t2.length) return true;
    for (let j = 0; j < t1.length; j++) {
      if (t1[j] !== t2[j]) return true;
    }
  }

  return false;
}

/**
 * Deep clones nodes and edges to ensure snapshots are stable snapshots of state.
 */
export function cloneSnapshot(snapshot: HistorySnapshot): HistorySnapshot {
  return {
    nodes: snapshot.nodes.map(n => ({
      ...n,
      position: { ...n.position },
      data: {
        ...n.data,
        tags: n.data.tags ? [...(n.data.tags as string[])] : []
      }
    })),
    edges: snapshot.edges.map(e => ({ ...e }))
  };
}
