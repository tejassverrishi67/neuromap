import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    nodeType: "goal" | "task" | "deadline" | "note";
    title: string;
    content?: string;
    status?: "todo" | "in-progress" | "done";
    priority?: "low" | "medium" | "high";
    progress?: number;
    dueDate?: string;
    warningThreshold?: number;
    tags?: string[];
  };
}

export interface ICanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface ICanvas extends Document {
  name: string;
  description?: string;
  nodes: ICanvasNode[];
  edges: ICanvasEdge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata: {
    totalNodes: number;
    totalGoals: number;
    totalTasks: number;
    totalDeadlines: number;
    totalNotes: number;
  };
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CanvasNodeSchema = new Schema<ICanvasNode>({
  id: { type: String, required: true },
  type: { type: String, required: true, default: "customNode" },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    nodeType: { type: String, enum: ["goal", "task", "deadline", "note"], required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    progress: { type: Number, default: 0 },
    dueDate: { type: String, default: "" },
    warningThreshold: { type: Number, default: 24 },
    tags: { type: [String], default: [] }
  }
}, { _id: false });

const CanvasEdgeSchema = new Schema<ICanvasEdge>({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String }
}, { _id: false });

const CanvasSchema = new Schema<ICanvas>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    nodes: { type: [CanvasNodeSchema], default: [] },
    edges: { type: [CanvasEdgeSchema], default: [] },
    viewport: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      zoom: { type: Number, default: 1 }
    },
    metadata: {
      totalNodes: { type: Number, default: 0 },
      totalGoals: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      totalDeadlines: { type: Number, default: 0 },
      totalNotes: { type: Number, default: 0 }
    },
    lastActivity: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Middleware to automatically compute and set total node types and update lastActivity on save
CanvasSchema.pre("save", function (this: any, next: any) {
  const nodes = this.nodes || [];
  this.metadata = {
    totalNodes: nodes.length,
    totalGoals: nodes.filter((n: any) => n.data?.nodeType === "goal").length,
    totalTasks: nodes.filter((n: any) => n.data?.nodeType === "task").length,
    totalDeadlines: nodes.filter((n: any) => n.data?.nodeType === "deadline").length,
    totalNotes: nodes.filter((n: any) => n.data?.nodeType === "note").length
  };
  this.lastActivity = new Date();
  next();
});

const Canvas: Model<ICanvas> = mongoose.models.Canvas || mongoose.model<ICanvas>("Canvas", CanvasSchema);

export default Canvas;
