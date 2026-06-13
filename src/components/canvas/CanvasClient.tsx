"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { 
  ArrowLeft, 
  RefreshCw, 
  Save, 
  HardDriveDownload, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Focus
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CustomNode from "./nodes/CustomNode";
import CanvasToolbar from "./CanvasToolbar";
import { updateCanvas } from "@/lib/storage";
import { detectDeadlineConflicts, ConflictInfo } from "@/lib/conflictDetector";

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
  
  // Conflict panel collapse state
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);

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

  // Real-time conflict computation
  const conflicts = useMemo(() => {
    return detectDeadlineConflicts(nodes, edges);
  }, [nodes, edges]);

  // Inject conflicts into nodes for rendering inside CustomNode
  const nodesWithConflicts = useMemo(() => {
    return nodes.map(node => {
      const nodeConflicts = conflicts[node.id] || [];
      return {
        ...node,
        data: {
          ...node.data,
          conflicts: nodeConflicts
        }
      };
    });
  }, [nodes, conflicts]);

  // Flattened list of conflicts for the overlay sidebar
  const conflictsList = useMemo(() => {
    const list: (ConflictInfo & { nodeTitle: string })[] = [];
    Object.entries(conflicts).forEach(([nodeId, items]) => {
      const node = nodes.find(n => n.id === nodeId);
      const title = String((node?.data as any)?.title || "Untitled Deadline");
      items.forEach(item => {
        list.push({
          ...item,
          nodeTitle: title
        });
      });
    });
    return list;
  }, [conflicts, nodes]);

  // Quick navigation: Center viewport on warning node
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Highlight node selection
    setNodes(nds => nds.map(n => ({
      ...n,
      selected: n.id === nodeId
    })));

    // Zoom and center
    const x = node.position.x;
    const y = node.position.y;
    reactFlowInstance.setCenter(x + 144, y + 100, {
      zoom: 1.1,
      duration: 800
    });
    
    toast.info(`Centered on: "${node.data.title || 'Untitled'}"`);
  }, [nodes, setNodes, reactFlowInstance]);

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
          {/* Conflict Warning Indicator Button */}
          {conflictsList.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConflictsOpen(!isConflictsOpen)}
              className="text-xs font-mono h-8 border-red-950/60 hover:border-red-900/80 bg-red-950/30 text-red-400 hover:text-red-300 gap-1.5 animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" /> {conflictsList.length} Conflict{conflictsList.length > 1 ? "s" : ""}
            </Button>
          )}
          
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
          nodes={nodesWithConflicts}
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

        {/* Collapsible Conflict Panel Sidebar */}
        {conflictsList.length > 0 && isConflictsOpen && (
          <div className="absolute top-4 left-4 z-30 w-80 bg-card/90 border border-red-900/40 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-red-950/30 pb-2.5 mb-3 shrink-0">
              <span className="font-mono text-xs font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Schedule Warnings
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsConflictsOpen(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-[10.5px]">
              {conflictsList.map((c, idx) => (
                <div key={idx} className="p-3 border border-red-950/40 bg-red-950/5 rounded-xl space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-red-400 font-semibold uppercase tracking-wider text-[9px] bg-red-950/40 border border-red-900/30 px-1 rounded">
                      {c.type.replace("-", " ")}
                    </span>
                    <button
                      onClick={() => handleFocusNode(c.nodeId)}
                      className="text-muted-foreground hover:text-emerald-400 flex items-center gap-0.5"
                      title="Focus Node"
                    >
                      <Focus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-foreground leading-normal font-sans text-xs">
                    {c.message}
                  </p>
                  <div className="border-t border-red-950/30 pt-1.5 mt-1 text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong className="text-red-400/80 font-bold block mb-0.5">Suggestion:</strong>
                    {c.rescheduleSuggestion}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
