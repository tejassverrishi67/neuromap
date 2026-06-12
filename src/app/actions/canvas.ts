"use server";

// MongoDB Server Actions are temporarily disabled for localStorage development mode.
// The application operates entirely client-side using localStorage.

export async function getCanvases() {
  return [];
}

export async function getCanvasById(id: string) {
  return null;
}

export async function createCanvas(name: string, description = "", templateName?: string) {
  return null;
}

export async function updateCanvas(
  id: string,
  data: {
    nodes: any[];
    edges: any[];
    viewport: { x: number; y: number; zoom: number };
  }
) {
  return null;
}

export async function deleteCanvas(id: string) {
  return false;
}

export async function getDashboardData() {
  return {
    canvases: [],
    isDbConnected: false
  };
}
