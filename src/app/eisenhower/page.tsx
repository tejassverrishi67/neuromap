"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  LayoutGrid,
  CheckSquare,
  AlertTriangle,
  Plus,
  Trash2,
  ExternalLink,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCanvases, getCanvasById, updateCanvas, CanvasData } from "@/lib/storage";

interface TaskItem {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  dueDate?: string;
  quadrant: "q1" | "q2" | "q3" | "q4";
}

export default function EisenhowerPage() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string>("");
  const [canvas, setCanvas] = useState<CanvasData | null>(null);
  
  // Tasks from current canvas
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({
    q1: "", q2: "", q3: "", q4: ""
  });

  // Load canvases
  useEffect(() => {
    async function loadData() {
      const list = await getCanvases();
      setCanvases(list);
      if (list.length > 0) {
        setSelectedCanvasId(list[0]._id);
      }
    }
    loadData();
  }, []);

  // Fetch selected canvas tasks
  useEffect(() => {
    if (!selectedCanvasId) return;
    
    async function fetchCanvasTasks() {
      const data = await getCanvasById(selectedCanvasId);
      if (data) {
        setCanvas(data);
        
        // Filter out task nodes and map them to TaskItems with quadrants
        const taskNodes = (data.nodes || []).filter((n: any) => n.data?.nodeType === "task");
        const mappedTasks: TaskItem[] = taskNodes.map((n: any) => {
          // Determine starting quadrant based on priority & dueDate
          let quadrant: "q1" | "q2" | "q3" | "q4" = "q4";
          const priority = n.data?.priority || "medium";
          const hasDueDate = !!n.data?.dueDate;
          
          if (n.data?.eisenhowerQuadrant) {
            quadrant = n.data.eisenhowerQuadrant;
          } else {
            // Heuristic quadrant assignment
            if (priority === "high" && hasDueDate) quadrant = "q1";
            else if (priority === "high" && !hasDueDate) quadrant = "q2";
            else if (priority === "medium" && hasDueDate) quadrant = "q3";
            else if (priority === "low" && hasDueDate) quadrant = "q3";
            else if (priority === "medium" && !hasDueDate) quadrant = "q2";
            else quadrant = "q4";
          }

          return {
            id: n.id,
            title: n.data?.title || "Untitled Task",
            content: n.data?.content || "",
            priority: priority,
            status: n.data?.status || "todo",
            dueDate: n.data?.dueDate,
            quadrant
          };
        });
        
        setTasks(mappedTasks);
      }
    }
    fetchCanvasTasks();
  }, [selectedCanvasId]);

  // Sync back to canvas model
  const syncTasksToCanvas = async (updatedTasks: TaskItem[]) => {
    if (!canvas) return;

    // Map Tasks back to canvas node structure
    const updatedNodes = canvas.nodes.map((n: any) => {
      if (n.data?.nodeType === "task") {
        const matchingTask = updatedTasks.find(t => t.id === n.id);
        if (matchingTask) {
          return {
            ...n,
            data: {
              ...n.data,
              title: matchingTask.title,
              priority: matchingTask.priority,
              status: matchingTask.status,
              eisenhowerQuadrant: matchingTask.quadrant
            }
          };
        }
      }
      return n;
    });

    try {
      const saved = await updateCanvas(canvas._id, {
        nodes: updatedNodes,
        edges: canvas.edges,
        viewport: canvas.viewport
      });
      setCanvas(saved);
    } catch {
      toast.error("Failed to sync matrix to storage.");
    }
  };

  // Reclassify a task's quadrant
  const handleMoveQuadrant = (taskId: string, targetQuadrant: "q1" | "q2" | "q3" | "q4") => {
    // Determine new priority based on quadrant alignment
    let newPriority: "high" | "medium" | "low" = "medium";
    if (targetQuadrant === "q1" || targetQuadrant === "q2") {
      newPriority = "high";
    } else if (targetQuadrant === "q3") {
      newPriority = "medium";
    } else {
      newPriority = "low";
    }

    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, quadrant: targetQuadrant, priority: newPriority }
        : t
    );
    setTasks(updated);
    syncTasksToCanvas(updated);
    toast.success("Task quadrant updated!");
  };

  // One-click conversion: Create a task in the matrix and insert directly into the canvas
  const handleCreateTaskInQuadrant = async (quadrant: "q1" | "q2" | "q3" | "q4") => {
    const title = newTaskTitle[quadrant].trim();
    if (!title) {
      toast.error("Please enter a task description.");
      return;
    }

    if (!canvas) {
      toast.error("No canvas selected.");
      return;
    }

    // Determine starting values based on quadrant
    let priority: "high" | "medium" | "low" = "medium";
    let dueDate: string | undefined = undefined;

    if (quadrant === "q1") {
      priority = "high";
      dueDate = new Date(Date.now() + 86400000).toISOString(); // Due tomorrow
    } else if (quadrant === "q2") {
      priority = "high";
    } else if (quadrant === "q3") {
      priority = "medium";
      dueDate = new Date(Date.now() + 86400000 * 2).toISOString(); // Due in 2 days
    } else {
      priority = "low";
    }

    const taskId = `task-matrix-${Date.now()}`;

    // Layout position mapping for new matrix nodes
    // Find bottom-most node to append to prevent overlapping
    let startY = 100;
    if (canvas.nodes && canvas.nodes.length > 0) {
      const maxY = Math.max(...canvas.nodes.map((n: any) => n.position.y));
      startY = maxY + 200;
    }

    const newCanvasNode = {
      id: taskId,
      type: "customNode",
      position: { x: 350, y: startY }, // column 1 is Tasks (x: 350)
      data: {
        nodeType: "task",
        title: title,
        content: `Created from Eisenhower matrix (${quadrant.toUpperCase()})`,
        status: "todo" as const,
        priority: priority,
        eisenhowerQuadrant: quadrant,
        dueDate
      }
    };

    const updatedNodes = [...(canvas.nodes || []), newCanvasNode];
    
    try {
      const savedCanvas = await updateCanvas(canvas._id, {
        nodes: updatedNodes,
        edges: canvas.edges || [],
        viewport: canvas.viewport
      });
      setCanvas(savedCanvas);
      
      const newMappedTask: TaskItem = {
        id: taskId,
        title,
        content: newCanvasNode.data.content,
        priority,
        status: "todo",
        dueDate,
        quadrant
      };
      
      const updatedTasksList = [...tasks, newMappedTask];
      setTasks(updatedTasksList);
      
      // Reset input
      setNewTaskTitle(prev => ({ ...prev, [quadrant]: "" }));
      toast.success("Converted text into canvas task node!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to add task node to canvas.");
    }
  };

  // Toggle status inside matrix
  const handleToggleTaskStatus = (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "done" ? "todo" : "done";
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, status: nextStatus as any } : t
    );
    setTasks(updated);
    syncTasksToCanvas(updated);
    toast.success(`Task marked as ${nextStatus}`);
  };

  // Delete task completely
  const handleDeleteTask = async (taskId: string) => {
    if (!canvas) return;
    const filteredNodes = canvas.nodes.filter((n: any) => n.id !== taskId);
    const filteredEdges = (canvas.edges || []).filter((e: any) => e.source !== taskId && e.target !== taskId);

    try {
      const saved = await updateCanvas(canvas._id, {
        nodes: filteredNodes,
        edges: filteredEdges,
        viewport: canvas.viewport
      });
      setCanvas(saved);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Task node removed from canvas.");
    } catch {
      toast.error("Failed to delete node.");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 pb-12">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-emerald-650 dark:text-emerald-400 flex items-center gap-3">
            <LayoutGrid className="w-8 h-8 text-emerald-500" /> Eisenhower Matrix
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Prioritize your second-brain task nodes. Reclassify items dynamically to reflect changes in your mindmaps.
          </p>
        </div>

        {/* Canvas Select */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Label htmlFor="canvas-selector" className="font-mono text-xs text-muted-foreground whitespace-nowrap">Active Canvas:</Label>
          <Select value={selectedCanvasId} onValueChange={(val) => val && setSelectedCanvasId(val)}>
            <SelectTrigger className="h-9 w-56 bg-card text-xs text-foreground font-sans border-border">
              <SelectValue placeholder="Choose canvas..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-xs text-foreground font-mono">
              {canvases.map(c => (
                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canvas && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/canvas/${canvas._id}`)}
              className="h-9 text-xs font-mono border-border hover:border-emerald-500/40 text-muted-foreground hover:text-foreground"
              title="Open Dynamic Canvas"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {canvases.length === 0 ? (
        <Card className="bg-card/40 border-border backdrop-blur-sm p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
          <LayoutGrid className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold">No canvases logged</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Create a canvas on the Dashboard or Brain Dump page first to enable the Eisenhower Matrix calculations.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* QUADRANT I: Urgent + Important */}
          <Card className="bg-card border-urgent-border shadow-xl flex flex-col justify-between overflow-hidden transition-all hover:shadow-2xl">
            <CardHeader className="bg-urgent-header border-b border-urgent-border p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-sm font-bold text-urgent-text flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-urgent-text" /> I. Urgent + Important (Do First)
                </CardTitle>
                <Badge className="bg-urgent-bg text-urgent-text border border-urgent-border text-[9px] font-mono">
                  {tasks.filter(t => t.quadrant === "q1").length} Tasks
                </Badge>
              </div>
              <CardDescription className="text-[10.5px]">
                High-priority deliverables due immediately. Complete these as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 min-h-60">
              {tasks.filter(t => t.quadrant === "q1").map(task => (
                <div key={task.id} className="p-3 rounded-lg border border-urgent-border/50 bg-urgent-bg/10 flex justify-between gap-3 text-xs transition-colors hover:bg-urgent-header">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                      className="w-4 h-4 accent-red-500 rounded border-border cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.dueDate && <span className="text-[9px] text-urgent-text font-mono font-medium">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select onValueChange={(val) => handleMoveQuadrant(task.id, val as any)}>
                      <SelectTrigger className="h-6 px-1.5 text-[10px] bg-background/50 border-border/40 font-mono w-24">
                        Move
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-[10px] font-mono">
                        <SelectItem value="q2">Schedule (Q2)</SelectItem>
                        <SelectItem value="q3">Delegate (Q3)</SelectItem>
                        <SelectItem value="q4">Eliminate (Q4)</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete node">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.quadrant === "q1").length === 0 && (
                <div className="h-full flex items-center justify-center py-12 text-center text-xs text-muted-foreground/50 font-mono italic">
                  No critical tasks active.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-urgent-bg/5 border-t border-urgent-border p-2.5 flex gap-2">
              <Input
                value={newTaskTitle.q1}
                onChange={(e) => setNewTaskTitle(prev => ({ ...prev, q1: e.target.value }))}
                placeholder="Convert new urgent task... (Press enter)"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTaskInQuadrant("q1")}
                className="h-8 text-xs bg-background/50 border-urgent-border focus-visible:ring-primary"
              />
              <Button onClick={() => handleCreateTaskInQuadrant("q1")} size="icon" className="h-8 w-8 bg-urgent-bg hover:bg-urgent-header border border-urgent-border text-urgent-text shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* QUADRANT II: Important + Not Urgent */}
          <Card className="bg-card border-goal-border shadow-xl flex flex-col justify-between overflow-hidden transition-all hover:shadow-2xl">
            <CardHeader className="bg-goal-header border-b border-goal-border p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-sm font-bold text-goal-text flex items-center gap-2">
                  <Compass className="w-4 h-4 text-goal-text" /> II. Important + Not Urgent (Schedule)
                </CardTitle>
                <Badge className="bg-goal-bg text-goal-text border border-goal-border text-[9px] font-mono">
                  {tasks.filter(t => t.quadrant === "q2").length} Tasks
                </Badge>
              </div>
              <CardDescription className="text-[10.5px]">
                High-impact goals and skills tracker. Schedule time for execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 min-h-60">
              {tasks.filter(t => t.quadrant === "q2").map(task => (
                <div key={task.id} className="p-3 rounded-lg border border-goal-border/50 bg-goal-bg/10 flex justify-between gap-3 text-xs transition-colors hover:bg-goal-header">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                      className="w-4 h-4 accent-emerald-500 rounded border-border cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select onValueChange={(val) => handleMoveQuadrant(task.id, val as any)}>
                      <SelectTrigger className="h-6 px-1.5 text-[10px] bg-background/50 border-border/40 font-mono w-24">
                        Move
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-[10px] font-mono">
                        <SelectItem value="q1">Do First (Q1)</SelectItem>
                        <SelectItem value="q3">Delegate (Q3)</SelectItem>
                        <SelectItem value="q4">Eliminate (Q4)</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete node">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.quadrant === "q2").length === 0 && (
                <div className="h-full flex items-center justify-center py-12 text-center text-xs text-muted-foreground/50 font-mono italic">
                  No goals scheduled.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-goal-bg/5 border-t border-goal-border p-2.5 flex gap-2">
              <Input
                value={newTaskTitle.q2}
                onChange={(e) => setNewTaskTitle(prev => ({ ...prev, q2: e.target.value }))}
                placeholder="Convert new goal task... (Press enter)"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTaskInQuadrant("q2")}
                className="h-8 text-xs bg-background/50 border-goal-border focus-visible:ring-primary"
              />
              <Button onClick={() => handleCreateTaskInQuadrant("q2")} size="icon" className="h-8 w-8 bg-goal-bg hover:bg-goal-header border border-goal-border text-goal-text shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* QUADRANT III: Urgent + Not Important */}
          <Card className="bg-card border-task-border shadow-xl flex flex-col justify-between overflow-hidden transition-all hover:shadow-2xl">
            <CardHeader className="bg-task-header border-b border-task-border p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-sm font-bold text-task-text flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-task-text" /> III. Urgent + Not Important (Delegate)
                </CardTitle>
                <Badge className="bg-task-bg text-task-text border border-task-border text-[9px] font-mono">
                  {tasks.filter(t => t.quadrant === "q3").length} Tasks
                </Badge>
              </div>
              <CardDescription className="text-[10.5px]">
                Reminders, emails, and meetings. Group or delegate where possible.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 min-h-60">
              {tasks.filter(t => t.quadrant === "q3").map(task => (
                <div key={task.id} className="p-3 rounded-lg border border-task-border/50 bg-task-bg/10 flex justify-between gap-3 text-xs transition-colors hover:bg-task-header">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                      className="w-4 h-4 accent-sky-500 rounded border-border cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                      {task.dueDate && <span className="text-[9px] text-task-text font-mono font-medium">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select onValueChange={(val) => handleMoveQuadrant(task.id, val as any)}>
                      <SelectTrigger className="h-6 px-1.5 text-[10px] bg-background/50 border-border/40 font-mono w-24">
                        Move
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-[10px] font-mono">
                        <SelectItem value="q1">Do First (Q1)</SelectItem>
                        <SelectItem value="q2">Schedule (Q2)</SelectItem>
                        <SelectItem value="q4">Eliminate (Q4)</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete node">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.quadrant === "q3").length === 0 && (
                <div className="h-full flex items-center justify-center py-12 text-center text-xs text-muted-foreground/50 font-mono italic">
                  No busywork logged.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-task-bg/5 border-t border-task-border p-2.5 flex gap-2">
              <Input
                value={newTaskTitle.q3}
                onChange={(e) => setNewTaskTitle(prev => ({ ...prev, q3: e.target.value }))}
                placeholder="Convert new busywork task... (Press enter)"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTaskInQuadrant("q3")}
                className="h-8 text-xs bg-background/50 border-task-border focus-visible:ring-primary"
              />
              <Button onClick={() => handleCreateTaskInQuadrant("q3")} size="icon" className="h-8 w-8 bg-task-bg hover:bg-task-header border border-task-border text-task-text shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* QUADRANT IV: Neither */}
          <Card className="bg-card border-note-border shadow-xl flex flex-col justify-between overflow-hidden transition-all hover:shadow-2xl">
            <CardHeader className="bg-note-header border-b border-note-border p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="font-mono text-sm font-bold text-note-text flex items-center gap-2">
                  <Info className="w-4 h-4 text-note-text" /> IV. Neither (Eliminate / Backlog)
                </CardTitle>
                <Badge className="bg-note-bg text-note-text border border-note-border text-[9px] font-mono">
                  {tasks.filter(t => t.quadrant === "q4").length} Tasks
                </Badge>
              </div>
              <CardDescription className="text-[10.5px]">
                Low priority tasks or backlogs. Eliminate or do only when other quadrants are clear.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 min-h-60">
              {tasks.filter(t => t.quadrant === "q4").map(task => (
                <div key={task.id} className="p-3 rounded-lg border border-note-border/50 bg-note-bg/10 flex justify-between gap-3 text-xs transition-colors hover:bg-note-header">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "done"}
                      onChange={() => handleToggleTaskStatus(task.id, task.status)}
                      className="w-4 h-4 accent-purple-500 rounded border-border cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`font-semibold ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select onValueChange={(val) => handleMoveQuadrant(task.id, val as any)}>
                      <SelectTrigger className="h-6 px-1.5 text-[10px] bg-background/50 border-border/40 font-mono w-24">
                        Move
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-[10px] font-mono">
                        <SelectItem value="q1">Do First (Q1)</SelectItem>
                        <SelectItem value="q2">Schedule (Q2)</SelectItem>
                        <SelectItem value="q3">Delegate (Q3)</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-500 transition-colors" title="Delete node">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {tasks.filter(t => t.quadrant === "q4").length === 0 && (
                <div className="h-full flex items-center justify-center py-12 text-center text-xs text-muted-foreground/50 font-mono italic">
                  No backlog tasks.
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-note-bg/5 border-t border-note-border p-2.5 flex gap-2">
              <Input
                value={newTaskTitle.q4}
                onChange={(e) => setNewTaskTitle(prev => ({ ...prev, q4: e.target.value }))}
                placeholder="Convert new backlog task... (Press enter)"
                onKeyDown={(e) => e.key === "Enter" && handleCreateTaskInQuadrant("q4")}
                className="h-8 text-xs bg-background/50 border-note-border focus-visible:ring-primary"
              />
              <Button onClick={() => handleCreateTaskInQuadrant("q4")} size="icon" className="h-8 w-8 bg-note-bg hover:bg-note-header border border-note-border text-note-text shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
