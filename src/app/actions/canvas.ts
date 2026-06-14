"use server";

/* eslint-disable @typescript-eslint/no-unused-vars */

// MongoDB Server Actions are temporarily disabled for localStorage development mode.
// The application operates entirely client-side using localStorage.

export async function getCanvases() {
  return [];
}

export async function getCanvasById(_id: string) {
  return null;
}

export async function createCanvas(_name: string, _description = "", _templateName?: string) {
  return null;
}

export async function updateCanvas(
  _id: string,
  _data: {
    nodes: any[];
    edges: any[];
    viewport: { x: number; y: number; zoom: number };
  }
) {
  return null;
}

export async function deleteCanvas(_id: string) {
  return false;
}

export async function getDashboardData() {
  return {
    canvases: [],
    isDbConnected: false
  };
}
