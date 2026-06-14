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
  RefreshCw,
  Undo2,
  Redo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CanvasToolbarProps {
  saveStatus: "saved" | "saving" | "offline";
  onManualSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function CanvasToolbar({
  saveStatus,
  onManualSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: CanvasToolbarProps) {
  const { setNodes, getViewport } = useReactFlow();
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
    }
  }, []);

  const undoTooltip = isMac ? "Undo (⌘Z)" : "Undo (Ctrl + Z)";
  const redoTooltip = isMac ? "Redo (⌘⇧Z)" : "Redo (Ctrl + Y)";

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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-card/75 border border-border backdrop-blur-md px-4 py-2 rounded-2xl gap-3 shadow-2xl select-none max-w-[90vw] md:max-w-none flex-wrap">
      {/* Node Creation Section */}
      <div className="flex items-center gap-1.5 border-r border-border/60 pr-3 mr-0.5">
        <Button
          onClick={() => addNode("goal")}
          size="sm"
          variant="ghost"
          title="Spawn a Goal card at the center of the viewport"
          className="text-goal-text hover:bg-goal-header hover:text-goal-text font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-goal-border"
        >
          <Target className="w-3.5 h-3.5" /> Goal
        </Button>
        <Button
          onClick={() => addNode("task")}
          size="sm"
          variant="ghost"
          title="Spawn a Task item at the center of the viewport"
          className="text-task-text hover:bg-task-header hover:text-task-text font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-task-border"
        >
          <CheckSquare className="w-3.5 h-3.5" /> Task
        </Button>
        <Button
          onClick={() => addNode("deadline")}
          size="sm"
          variant="ghost"
          title="Spawn a Deadline alert at the center of the viewport"
          className="text-deadline-text hover:bg-deadline-header hover:text-deadline-text font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-deadline-border"
        >
          <Clock className="w-3.5 h-3.5" /> Deadline
        </Button>
        <Button
          onClick={() => addNode("note")}
          size="sm"
          variant="ghost"
          title="Spawn a Note card at the center of the viewport"
          className="text-purple-650 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-750 dark:hover:text-purple-300 font-mono text-xs gap-1 h-8 px-2.5 rounded-lg border border-transparent hover:border-note-border"
        >
          <FileText className="w-3.5 h-3.5" /> Note
        </Button>
      </div>

      {/* Sync/Status Section */}
      <div className="flex items-center gap-3">
        {/* Save Status Indicator */}
        <div 
          className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground bg-background/50 border border-border/40 px-2 py-1 rounded-lg"
          title="Real-time storage synchronization status"
        >
          {saveStatus === "saving" && (
            <>
              <RefreshCw className="w-3 h-3 text-goal-text animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="w-3 h-3 text-goal-text font-bold" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === "offline" && (
            <>
              <CloudLightning className="w-3 h-3 text-deadline-text animate-bounce" />
              <span className="text-deadline-text font-bold">Sync Offline</span>
            </>
          )}
        </div>

        {/* Undo Button */}
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          size="icon"
          variant="outline"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 border-border hover:border-emerald-200 dark:hover:border-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground rounded-lg transition-all"
          title={undoTooltip}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </Button>

        {/* Redo Button */}
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          size="icon"
          variant="outline"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 border-border hover:border-emerald-200 dark:hover:border-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground rounded-lg transition-all"
          title={redoTooltip}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </Button>

        {/* Manual Save Trigger */}
        <Button
          onClick={onManualSave}
          size="icon"
          variant="outline"
          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 border-border hover:border-emerald-200 dark:hover:border-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 rounded-lg transition-all"
          title="Save and backup active workspace to storage immediately"
        >
          <Save className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
