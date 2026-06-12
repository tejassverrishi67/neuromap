"use client";

import { templates } from "./templates";

export interface CanvasData {
  _id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  viewport: { x: number; y: number; zoom: number };
  metadata: {
    totalNodes: number;
    totalGoals: number;
    totalTasks: number;
    totalDeadlines: number;
    totalNotes: number;
  };
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = "neuromap_canvases_store";

// Helper to load raw list from localStorage
function loadRawCanvases(): CanvasData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load canvases from localStorage:", e);
    return [];
  }
}

// Helper to save raw list to localStorage
function saveRawCanvases(canvases: CanvasData[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(canvases));
  } catch (e) {
    console.error("Failed to save canvases to localStorage:", e);
  }
}

// 1. Get all canvases
export async function getCanvases(): Promise<CanvasData[]> {
  // Simulate minor network delay
  await new Promise((r) => setTimeout(r, 100));
  return loadRawCanvases().sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

// 2. Get specific canvas by ID
export async function getCanvasById(id: string): Promise<CanvasData | null> {
  await new Promise((r) => setTimeout(r, 100));
  const list = loadRawCanvases();
  const found = list.find((c) => c._id === id);
  return found || null;
}

// 3. Create canvas (blank or template)
export async function createCanvas(name: string, description = "", templateName?: string): Promise<CanvasData> {
  await new Promise((r) => setTimeout(r, 150));
  const list = loadRawCanvases();

  let initialNodes: any[] = [];
  let initialEdges: any[] = [];
  let canvasDesc = description;

  if (templateName && templates[templateName]) {
    const t = templates[templateName];
    initialNodes = JSON.parse(JSON.stringify(t.nodes)); // deep copy
    initialEdges = JSON.parse(JSON.stringify(t.edges));
    canvasDesc = description || t.description;
  }

  const now = new Date().toISOString();
  const newCanvas: CanvasData = {
    _id: `local-${Date.now()}`,
    name,
    description: canvasDesc,
    nodes: initialNodes,
    edges: initialEdges,
    viewport: { x: 0, y: 0, zoom: 1 },
    metadata: {
      totalNodes: initialNodes.length,
      totalGoals: initialNodes.filter((n) => n.data?.nodeType === "goal").length,
      totalTasks: initialNodes.filter((n) => n.data?.nodeType === "task").length,
      totalDeadlines: initialNodes.filter((n) => n.data?.nodeType === "deadline").length,
      totalNotes: initialNodes.filter((n) => n.data?.nodeType === "note").length,
    },
    lastActivity: now,
    createdAt: now,
    updatedAt: now
  };

  list.push(newCanvas);
  saveRawCanvases(list);
  return newCanvas;
}

// 4. Update canvas properties
export async function updateCanvas(
  id: string,
  data: {
    nodes: any[];
    edges: any[];
    viewport: { x: number; y: number; zoom: number };
  }
): Promise<CanvasData> {
  await new Promise((r) => setTimeout(r, 50));
  const list = loadRawCanvases();
  const idx = list.findIndex((c) => c._id === id);
  if (idx === -1) {
    throw new Error("Canvas not found");
  }

  const now = new Date().toISOString();
  const nodes = data.nodes || [];

  list[idx] = {
    ...list[idx],
    nodes: data.nodes,
    edges: data.edges,
    viewport: data.viewport,
    metadata: {
      totalNodes: nodes.length,
      totalGoals: nodes.filter((n) => n.data?.nodeType === "goal").length,
      totalTasks: nodes.filter((n) => n.data?.nodeType === "task").length,
      totalDeadlines: nodes.filter((n) => n.data?.nodeType === "deadline").length,
      totalNotes: nodes.filter((n) => n.data?.nodeType === "note").length,
    },
    lastActivity: now,
    updatedAt: now
  };

  saveRawCanvases(list);
  return list[idx];
}

// 5. Delete canvas
export async function deleteCanvas(id: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 50));
  const list = loadRawCanvases();
  const filtered = list.filter((c) => c._id !== id);
  if (filtered.length === list.length) return false;
  saveRawCanvases(filtered);
  return true;
}
