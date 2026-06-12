"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Connection,
  Edge,
  Node,
  Viewport,
  Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, RefreshCw, Save, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CustomNode, { CustomNodeData } from "./nodes/CustomNode";
import CanvasToolbar from "./CanvasToolbar";
import { updateCanvas } from "@/lib/storage";

// Define node types outside the component to prevent re-creation on render
const nodeTypes = {
  customNode: CustomNode
};

interface CanvasClientProps {
  canvas: {
    _id: string;
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
    viewport: { x: number; y: number; zoom: number };
    updatedAt: string | null;
  };
}

function FlowEditor({ canvas }: CanvasClientProps) {
  const router = useRouter();
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(canvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(canvas.edges);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");

  // Track if initial load is complete to avoid autosaving initial data
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load viewport on mount or when reactFlowInstance is ready
  useEffect(() => {
    if (canvas.viewport) {
      reactFlowInstance.setViewport(canvas.viewport);
    }
    // Wait a brief tick to mark as loaded to suppress initial autosave
    setTimeout(() => {
      isLoadedRef.current = true;
    }, 500);

    // Check for newer local backup
    try {
      const localBackupRaw = localStorage.getItem(`neuromap_backup_${canvas._id}`);
      if (localBackupRaw) {
        const backup = JSON.parse(localBackupRaw);
        const dbUpdatedAt = canvas.updatedAt ? new Date(canvas.updatedAt).getTime() : 0;
        
        // If local backup is newer than DB timestamp by at least 2 seconds
        if (backup.timestamp && backup.timestamp > dbUpdatedAt + 2000) {
          toast("Unsaved Local Backup Found", {
            description: "We found a newer unsaved draft of this canvas in local cache. Restore it?",
            action: {
              label: "Restore",
              onClick: () => {
                if (backup.nodes) setNodes(backup.nodes);
                if (backup.edges) setEdges(backup.edges);
                if (backup.viewport) reactFlowInstance.setViewport(backup.viewport);
                toast.success("Restored local backup draft.");
                // Immediately queue save to DB to sync
                triggerDbSave(backup.nodes, backup.edges, backup.viewport);
              }
            },
            duration: 10000
          });
        }
      }
    } catch (e) {
      console.error("Failed to check localStorage backup:", e);
    }

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [canvas._id, canvas.viewport, reactFlowInstance, setNodes, setEdges]);

  // Connect handler
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // DB Sync trigger
  const triggerDbSave = async (currentNodes: Node[], currentEdges: Edge[], currentViewport: Viewport) => {
    try {
      await updateCanvas(canvas._id, {
        nodes: currentNodes as any[],
        edges: currentEdges as any[],
        viewport: currentViewport
      });
      setSaveStatus("saved");
    } catch (err) {
      console.error("Autosave database push failed:", err);
      setSaveStatus("offline");
    }
  };

  // Debounced autosave controller
  const queueAutosave = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      if (!isLoadedRef.current) return;

      setSaveStatus("saving");
      const currentViewport = reactFlowInstance.getViewport();

      // 1. Immediately cache to local storage
      try {
        const backupData = {
          nodes: currentNodes,
          edges: currentEdges,
          viewport: currentViewport,
          timestamp: Date.now()
        };
        localStorage.setItem(`neuromap_backup_${canvas._id}`, JSON.stringify(backupData));
      } catch (err) {
        console.error("Failed to cache work to localStorage:", err);
      }

      // 2. Debounce MongoDB commit
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        triggerDbSave(currentNodes, currentEdges, currentViewport);
      }, 3000); // 3-second debounce
    },
    [canvas._id, reactFlowInstance]
  );

  // Trigger autosave when nodes, edges, or connections change
  useEffect(() => {
    queueAutosave(nodes, edges);
  }, [nodes, edges, queueAutosave]);

  // Listen to viewport changes explicitly to trigger autosave
  const onViewportChange = useCallback(() => {
    if (!isLoadedRef.current) return;
    queueAutosave(nodes, edges);
  }, [nodes, edges, queueAutosave]);

  // Manual save trigger override
  const handleManualSave = async () => {
    setSaveStatus("saving");
    const currentViewport = reactFlowInstance.getViewport();
    
    // Cache locally
    try {
      localStorage.setItem(
        `neuromap_backup_${canvas._id}`,
        JSON.stringify({
          nodes,
          edges,
          viewport: currentViewport,
          timestamp: Date.now()
        })
      );
    } catch (e) {
      console.error(e);
    }

    try {
      await updateCanvas(canvas._id, {
        nodes: nodes as any[],
        edges: edges as any[],
        viewport: currentViewport
      });
      setSaveStatus("saved");
      toast.success("Canvas successfully synced to database.");
    } catch (err) {
      setSaveStatus("offline");
      toast.error("Could not sync to cloud database. Work is cached locally.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* Top Header Controls Bar */}
      <header className="h-16 border-b border-border bg-card/65 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-wide font-mono">{canvas.name}</h1>
            <p className="text-[10px] text-muted-foreground truncate max-w-[240px] md:max-w-xs">{canvas.description || "Interactive Visual Workspace"}</p>
          </div>
        </div>

        {/* Sync Info Header */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSave}
            className="text-xs font-mono h-8 border border-border/40 hover:border-emerald-900/50 bg-background/20"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save
          </Button>
        </div>
      </header>

      {/* React Flow Infinite Canvas Container */}
      <div className="flex-1 w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onMoveEnd={onViewportChange}
          nodeTypes={nodeTypes}
          fitView={nodes.length > 0 ? false : true} // Use saved viewport coordinates or auto-fit if empty
          minZoom={0.15}
          maxZoom={3.5}
        >
          <Background color="#10b981" gap={20} size={1} />
          <Controls showInteractive={false} className="left-4 bottom-4 md:left-4" />
          <MiniMap
            zoomable
            pannable
            nodeColor={(node) => {
              switch (node.data?.nodeType) {
                case "goal":
                  return "oklch(0.52 0.16 142)";
                case "task":
                  return "oklch(0.60 0.15 220)";
                case "deadline":
                  return "oklch(0.55 0.18 25)";
                default:
                  return "oklch(0.5 0.15 280)";
              }
            }}
            maskColor="rgba(12, 12, 14, 0.7)"
            className="hidden md:block !bg-card border border-border rounded-xl shadow-2xl"
          />
        </ReactFlow>

        {/* Floating Spawner Overlay Toolbar */}
        <CanvasToolbar saveStatus={saveStatus} onManualSave={handleManualSave} />
      </div>
    </div>
  );
}

export default function CanvasClient({ canvas }: CanvasClientProps) {
  return (
    <ReactFlowProvider>
      <FlowEditor canvas={canvas} />
    </ReactFlowProvider>
  );
}
