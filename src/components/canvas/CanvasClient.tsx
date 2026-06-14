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
  Focus,
  Sun,
  Moon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CustomNode from "./nodes/CustomNode";
import CanvasToolbar from "./CanvasToolbar";
import { updateCanvas, getCanvasById } from "@/lib/storage";
import { detectDeadlineConflicts, ConflictInfo } from "@/lib/conflictDetector";
import { useTheme } from "next-themes";
import {
  globalCanvasHistory,
  cloneSnapshot,
  isStateDifferent,
  HistorySnapshot,
  CanvasHistory
} from "@/lib/historyStore";

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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? resolvedTheme : "dark";
  const minimapMaskColor = currentTheme === "dark" ? "rgba(12, 12, 14, 0.7)" : "rgba(240, 240, 243, 0.7)";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(canvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(canvas.edges);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const isPerformingUndoRedoRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartSnapshotRef = useRef<HistorySnapshot | null>(null);

  // Initialize history stack
  const historyRef = useRef<CanvasHistory>({
    past: [],
    present: { nodes: canvas.nodes, edges: canvas.edges },
    future: []
  });

  // Synchronize history from/to globalCanvasHistory
  useEffect(() => {
    if (globalCanvasHistory[canvas._id]) {
      historyRef.current = globalCanvasHistory[canvas._id];
    } else {
      globalCanvasHistory[canvas._id] = historyRef.current;
    }
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, [canvas._id]);

  const pushHistorySnapshot = useCallback((nextState: HistorySnapshot) => {
    if (isPerformingUndoRedoRef.current) return;

    const history = historyRef.current;
    if (isStateDifferent(history.present, nextState)) {
      history.past = [...history.past, cloneSnapshot(history.present)].slice(-50);
      history.present = cloneSnapshot(nextState);
      history.future = [];

      setCanUndo(history.past.length > 0);
      setCanRedo(false);
    }
  }, []);

  const pushHistorySnapshotWithStart = useCallback((startState: HistorySnapshot, endState: HistorySnapshot) => {
    if (isPerformingUndoRedoRef.current) return;

    const history = historyRef.current;
    history.past = [...history.past, cloneSnapshot(startState)].slice(-50);
    history.present = cloneSnapshot(endState);
    history.future = [];

    setCanUndo(history.past.length > 0);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.past.length === 0) return;

    isPerformingUndoRedoRef.current = true;

    const currentSnapshot = cloneSnapshot(history.present);
    const previousSnapshot = history.past.pop()!;

    history.future.unshift(currentSnapshot);
    history.present = cloneSnapshot(previousSnapshot);

    setNodes(previousSnapshot.nodes);
    setEdges(previousSnapshot.edges);

    setCanUndo(history.past.length > 0);
    setCanRedo(history.future.length > 0);

    isPerformingUndoRedoRef.current = false;
    toast.success("Undone change");
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    if (history.future.length === 0) return;

    isPerformingUndoRedoRef.current = true;

    const nextSnapshot = history.future.shift()!;
    history.past.push(cloneSnapshot(history.present));
    history.present = cloneSnapshot(nextSnapshot);

    setNodes(nextSnapshot.nodes);
    setEdges(nextSnapshot.edges);

    setCanUndo(history.past.length > 0);
    setCanRedo(history.future.length > 0);

    isPerformingUndoRedoRef.current = false;
    toast.success("Redone change");
  }, [setNodes, setEdges]);

  // Track dragging operation
  const onNodeDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartSnapshotRef.current = {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e }))
    };
  }, [nodes, edges]);

  const onNodeDragStop = useCallback(() => {
    isDraggingRef.current = false;
    if (dragStartSnapshotRef.current) {
      const isDiff = isStateDifferent(dragStartSnapshotRef.current, { nodes, edges });
      if (isDiff) {
        pushHistorySnapshotWithStart(dragStartSnapshotRef.current, { nodes, edges });
      }
      dragStartSnapshotRef.current = null;
    }
  }, [nodes, edges, pushHistorySnapshotWithStart]);

  // Hook nodes and edges changes for other actions (node edits, type conversion, additions, deletions, connects)
  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (isPerformingUndoRedoRef.current) return;
    if (isDraggingRef.current) return;

    pushHistorySnapshot({ nodes, edges });
  }, [nodes, edges, pushHistorySnapshot]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).contentEditable === "true")
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (isMac && e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === "y" && !isMac) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");
  
  // Conflict panel collapse state
  const [isConflictsOpen, setIsConflictsOpen] = useState(false);

  const [canvasName, setCanvasName] = useState(canvas.name);
  const [canvasDesc, setCanvasDesc] = useState(canvas.description || "");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // Track if initial load is complete to avoid autosaving initial data
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch {
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

  // Synchronize canvas across open browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `neuromap_backup_${canvas._id}` || e.key === "neuromap_canvases_store") {
        async function reload() {
          const data = await getCanvasById(canvas._id);
          if (data) {
            if (data.nodes) setNodes(data.nodes);
            if (data.edges) setEdges(data.edges);
            if (data.viewport) reactFlowInstance.setViewport(data.viewport);
            if (data.name) setCanvasName(data.name);
            if (data.description !== undefined) setCanvasDesc(data.description);
          }
        }
        reload();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [canvas._id, setNodes, setEdges, reactFlowInstance]);

  // Handle click on canvas pane; spawn note node if it is a double-click
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      // Check if it is a double click (click count === 2)
      if (event.detail !== 2) return;

      const target = event.target as HTMLElement;
      if (target.closest(".react-flow__node") || target.closest(".z-30") || target.closest("header")) return;

      const pane = document.querySelector(".react-flow__pane");
      if (!pane) return;
      const rect = pane.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const viewport = reactFlowInstance.getViewport();
      const projectedX = (x - viewport.x) / viewport.zoom;
      const projectedY = (y - viewport.y) / viewport.zoom;

      const id = `note-${Date.now()}`;
      const newNode = {
        id,
        type: "customNode",
        position: { x: projectedX - 144, y: projectedY - 100 },
        data: {
          nodeType: "note" as const,
          title: "New Note",
          content: "Double-clicked to create.",
          tags: []
        }
      };

      setNodes((nds) => nds.concat(newNode as any));
      toast.success("Created note node at cursor");
    },
    [reactFlowInstance, setNodes]
  );

  // Clean up connected edges when nodes are deleted
  const onNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      const deletedIds = new Set(deletedNodes.map((n) => n.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
      toast.success(`Removed connected paths for deleted nodes`);
    },
    [setEdges]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      {/* Top Header Controls Bar */}
      <header className="h-16 border-b border-border bg-card/65 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          {isEditingMetadata ? (
            <div className="flex items-center gap-2 nodrag">
              <input
                type="text"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                placeholder="Canvas name"
                className="text-xs font-semibold text-foreground font-mono bg-background border border-border rounded px-2 py-1 h-8 focus:outline-none focus:border-emerald-500 w-44"
                autoFocus
              />
              <input
                type="text"
                value={canvasDesc}
                onChange={(e) => setCanvasDesc(e.target.value)}
                placeholder="Description"
                className="text-[10px] text-muted-foreground font-mono bg-background border border-border rounded px-2 py-1 h-8 focus:outline-none focus:border-emerald-500 w-64"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!canvasName.trim()) {
                    toast.error("Name is required");
                    return;
                  }
                  setIsEditingMetadata(false);
                  try {
                    await updateCanvas(canvas._id, {
                      name: canvasName.trim(),
                      description: canvasDesc.trim()
                    });
                    toast.success("Workspace properties updated");
                  } catch {
                    toast.error("Failed to save workspace properties");
                  }
                }}
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                Save
              </Button>
            </div>
          ) : (
            <div
              className="cursor-pointer hover:bg-muted/10 p-1.5 rounded transition-all flex flex-col min-w-0"
              onClick={() => setIsEditingMetadata(true)}
              title="Click to edit workspace properties"
            >
              <h1 className="text-sm font-semibold text-foreground tracking-wide font-mono truncate max-w-[200px] md:max-w-xs">{canvasName}</h1>
              <p className="text-[10px] text-muted-foreground truncate max-w-[240px] md:max-w-xs">{canvasDesc || "Interactive Visual Workspace"}</p>
            </div>
          )}
        </div>

        {/* Sync Info Header */}
        <div className="flex items-center gap-2">
          {/* Conflict Warning Indicator Button */}
          {conflictsList.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsConflictsOpen(!isConflictsOpen)}
              className="text-xs font-mono h-8 border-urgent-border hover:border-urgent-text bg-urgent-bg text-urgent-text gap-1.5 animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" /> {conflictsList.length} Conflict{conflictsList.length > 1 ? "s" : ""}
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              try {
                const dataToExport = {
                  name: canvasName,
                  description: canvasDesc,
                  nodes,
                  edges,
                  viewport: reactFlowInstance.getViewport(),
                  exportVersion: "1.0",
                  exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `neuromap_canvas_${canvasName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Canvas exported successfully!");
              } catch {
                toast.error("Failed to export canvas");
              }
            }}
            className="text-xs font-mono h-8 border border-border/40 hover:border-emerald-900/50 bg-background/20 gap-1.5 mr-1.5"
            title="Download canvas JSON backup"
          >
            <HardDriveDownload className="w-3.5 h-3.5" /> Export
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSave}
            className="text-xs font-mono h-8 border border-border/40 hover:border-emerald-900/50 bg-background/20"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-muted-foreground hover:text-foreground border border-border/40 bg-background/20 ml-1.5"
            title={currentTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            )}
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
          onPaneClick={onPaneClick}
          zoomOnDoubleClick={false}
          panActivationKeyCode="Space"
          onNodesDelete={onNodesDelete}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
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
            maskColor={minimapMaskColor}
            className="hidden md:block !bg-card border border-border rounded-xl shadow-2xl"
          />
        </ReactFlow>

        {/* Floating Spawner Overlay Toolbar */}
        <CanvasToolbar
          saveStatus={saveStatus}
          onManualSave={handleManualSave}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Collapsible Conflict Panel Sidebar */}
        {conflictsList.length > 0 && isConflictsOpen && (
          <div className="absolute top-4 left-4 z-30 w-80 bg-card/90 border border-urgent-border backdrop-blur-md rounded-2xl shadow-2xl p-4 flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-urgent-border pb-2.5 mb-3 shrink-0">
              <span className="font-mono text-xs font-bold text-urgent-text flex items-center gap-1.5">
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
                <div key={idx} className="p-3 border border-urgent-border bg-urgent-bg rounded-xl space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-urgent-text font-semibold uppercase tracking-wider text-[9px] bg-urgent-bg border border-urgent-border px-1 rounded">
                      {c.type.replace("-", " ")}
                    </span>
                    <button
                      onClick={() => handleFocusNode(c.nodeId)}
                      className="text-muted-foreground hover:text-goal-text flex items-center gap-0.5"
                      title="Focus Node"
                    >
                      <Focus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-foreground leading-normal font-sans text-xs">
                    {c.message}
                  </p>
                  <div className="border-t border-urgent-border pt-1.5 mt-1 text-[10px] text-muted-foreground leading-relaxed italic">
                    <strong className="text-urgent-text font-bold block mb-0.5">Suggestion:</strong>
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
