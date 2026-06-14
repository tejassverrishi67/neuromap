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

// Helper to load raw list from localStorage with validation and corruption recovery
function loadRawCanvases(): CanvasData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return seedDemoDataIfEmpty([]);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Stored canvases data is not an array");
    }

    // Validate individual item schemas
    const validated = parsed.filter((c: any) => {
      return (
        c &&
        typeof c === "object" &&
        typeof c._id === "string" &&
        typeof c.name === "string" &&
        Array.isArray(c.nodes) &&
        Array.isArray(c.edges)
      );
    });

    if (validated.length === 0 && parsed.length > 0) {
      throw new Error("All stored canvases failed schema validation");
    }

    return seedDemoDataIfEmpty(validated);
  } catch (e) {
    console.error("Failed to load canvases from localStorage (corruption detected):", e);
    // Backup corrupt raw data to avoid silent loss
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_corrupt_backup`, raw);
      }
    } catch (err) {
      console.error("Failed to write corruption backup:", err);
    }
    // Clear the corrupted key
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return seedDemoDataIfEmpty([]);
  }
}

// Helper to seed standard templates when storage is empty
function seedDemoDataIfEmpty(list: CanvasData[]): CanvasData[] {
  if (list.length > 0) return list;

  const now = new Date().toISOString();
  const seededList: CanvasData[] = Object.keys(templates).map((key, index) => {
    const t = templates[key];
    const initialNodes = JSON.parse(JSON.stringify(t.nodes));
    const initialEdges = JSON.parse(JSON.stringify(t.edges));

    // Populate completedAt with recent staggered dates for tasks that are "done"
    initialNodes.forEach((node: any) => {
      if (node.data?.nodeType === "task") {
        if (node.data.status === "done") {
          node.data.completedAt = new Date(Date.now() - 86400000 * (index + 1)).toISOString();
        }
      }
    });

    return {
      _id: `seeded-${key.toLowerCase().replace(/\s+/g, "-")}`,
      name: t.name,
      description: t.description,
      nodes: initialNodes,
      edges: initialEdges,
      viewport: { x: 0, y: 0, zoom: 0.85 },
      metadata: {
        totalNodes: initialNodes.length,
        totalGoals: initialNodes.filter((n: any) => n.data?.nodeType === "goal").length,
        totalTasks: initialNodes.filter((n: any) => n.data?.nodeType === "task").length,
        totalDeadlines: initialNodes.filter((n: any) => n.data?.nodeType === "deadline").length,
        totalNotes: initialNodes.filter((n: any) => n.data?.nodeType === "note").length,
      },
      lastActivity: new Date(Date.now() - 3600000 * index).toISOString(),
      createdAt: now,
      updatedAt: now
    };
  });

  saveRawCanvases(seededList);
  return seededList;
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

// 4. Update canvas properties (with optional metadata editing)
export async function updateCanvas(
  id: string,
  data: {
    name?: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    viewport?: { x: number; y: number; zoom: number };
  }
): Promise<CanvasData> {
  await new Promise((r) => setTimeout(r, 50));
  const list = loadRawCanvases();
  const idx = list.findIndex((c) => c._id === id);
  if (idx === -1) {
    throw new Error("Canvas not found");
  }

  const now = new Date().toISOString();
  const nodes = data.nodes !== undefined ? data.nodes : list[idx].nodes || [];
  const edges = data.edges !== undefined ? data.edges : list[idx].edges || [];
  const viewport = data.viewport !== undefined ? data.viewport : list[idx].viewport || { x: 0, y: 0, zoom: 1 };
  const name = data.name !== undefined ? data.name : list[idx].name;
  const description = data.description !== undefined ? data.description : list[idx].description;

  list[idx] = {
    ...list[idx],
    name,
    description,
    nodes,
    edges,
    viewport,
    metadata: {
      totalNodes: nodes.length,
      totalGoals: nodes.filter((n: any) => n.data?.nodeType === "goal").length,
      totalTasks: nodes.filter((n: any) => n.data?.nodeType === "task").length,
      totalDeadlines: nodes.filter((n: any) => n.data?.nodeType === "deadline").length,
      totalNotes: nodes.filter((n: any) => n.data?.nodeType === "note").length,
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
