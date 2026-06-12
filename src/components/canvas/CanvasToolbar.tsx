"use client";

import React from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Target,
  CheckSquare,
  Clock,
  FileText,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Save,
  CloudLightning,
  Check,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CanvasToolbarProps {
  saveStatus: "saved" | "saving" | "offline";
  onManualSave: () => void;
}

export default function CanvasToolbar({ saveStatus, onManualSave }: CanvasToolbarProps) {
  const { setNodes, getViewport } = useReactFlow();

  const addNode = (nodeType: "goal" | "task" | "deadline" | "note") => {
    // Generate a unique ID based on timestamp
    const id = `${nodeType}-${Date.now()}`;
    const viewport = getViewport();

    // Position node at the center of the current viewport view
    const x = -viewport.x / viewport.zoom + (window.innerWidth / 2) / viewport.zoom - 150;
    const y = -viewport.y / viewport.zoom + (window.innerHeight / 2) / viewport.zoom - 100;

    const defaultData = {
      nodeType,
      title: `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
      content: "",
      status: "todo",
      priority: "medium",
      progress: 0,
      dueDate: nodeType === "deadline" ? new Date(Date.now() + 86400000 * 2).toISOString() : "", // 2 days from now
      warningThreshold: 24,
      tags: []
    };

    const newNode = {
      id,
      type: "customNode",
      position: { x, y },
      data: defaultData
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success(`Created ${nodeType} node`);
  };

  const handleFitView = () => {
    // We import fitView via hook inside ReactFlow component
    // but ReactFlowContext exposes fitView on the instance
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-card/75 border border-border backdrop-blur-md px-4 py-2 rounded-2xl gap-3 shadow-2xl select-none select-none max-w-[90vw] md:max-w-none flex-wrap">
      {/* Node Creation Section */}
      <div className="flex items-center gap-1.5 border-r border-border/60 pr-3 mr-0.5">
        <Button
          onClick={() => addNode("goal")}
          size="sm"
          variant="ghost"
          className="text-emerald-400 hover:bg-emerald-950/20 hover:text-emerald-300 font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-emerald-900/30"
        >
          <Target className="w-3.5 h-3.5" /> Goal
        </Button>
        <Button
          onClick={() => addNode("task")}
          size="sm"
          variant="ghost"
          className="text-sky-400 hover:bg-sky-950/20 hover:text-sky-300 font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-sky-900/30"
        >
          <CheckSquare className="w-3.5 h-3.5" /> Task
        </Button>
        <Button
          onClick={() => addNode("deadline")}
          size="sm"
          variant="ghost"
          className="text-amber-400 hover:bg-amber-950/20 hover:text-amber-300 font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-amber-900/30"
        >
          <Clock className="w-3.5 h-3.5" /> Deadline
        </Button>
        <Button
          onClick={() => addNode("note")}
          size="sm"
          variant="ghost"
          className="text-purple-400 hover:bg-purple-950/20 hover:text-purple-300 font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-purple-900/30"
        >
          <FileText className="w-3.5 h-3.5" /> Note
        </Button>
      </div>

      {/* Sync/Status Section */}
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-background/50 border border-border/40 px-2 py-1 rounded-lg">
          {saveStatus === "saving" && (
            <>
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="w-3 h-3 text-emerald-400 font-bold" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === "offline" && (
            <>
              <CloudLightning className="w-3 h-3 text-amber-400 animate-bounce" />
              <span className="text-amber-400 font-bold">Sync Offline</span>
            </>
          )}
        </div>

        {/* Manual Save Trigger */}
        <Button
          onClick={onManualSave}
          size="icon"
          variant="outline"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-400 border-border hover:border-emerald-950 hover:bg-emerald-950/10 rounded-lg transition-all"
          title="Save Canvas Now"
        >
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
