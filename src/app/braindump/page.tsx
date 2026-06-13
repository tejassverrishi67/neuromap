"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Brain,
  Sparkles,
  Send,
  History,
  Trash2,
  Check,
  ChevronRight,
  AlertCircle,
  FileText,
  CheckSquare,
  Clock,
  Target,
  Plus,
  Compass,
  ArrowRight,
  Tag
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCanvases, getCanvasById, updateCanvas, createCanvas, CanvasData } from "@/lib/storage";
import { parseBrainDump, ParsedNode } from "@/lib/brainDumpParser";

export default function BrainDumpPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [dumps, setDumps] = useState<any[]>([]);
  
  // Parser output and edit state
  const [parsedNodes, setParsedNodes] = useState<ParsedNode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "goal" | "task" | "deadline" | "note" | "matrix">("all");
  
  // Canvas destinations
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [targetCanvasId, setTargetCanvasId] = useState<string>("");
  const [newCanvasName, setNewCanvasName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Load dumps & canvases on mount
  useEffect(() => {
    // Standard starting dumps
    const initialDumps = [
      {
        id: "1",
        text: "I need to finish DSA before placements, complete my hackathon MVP by Sunday, prepare for DBMS exam next week, and update my portfolio.",
        date: "Just now",
        parsed: false
      },
      {
        id: "2",
        text: "Read Chapter 4 of Alex Xu's system design book. Target SDE-2 promotion timeline is Q4 2026. Keep doing 2 mock interviews every week.",
        date: "Yesterday",
        parsed: true
      }
    ];
    
    try {
      const storedDumps = localStorage.getItem("neuromap_dumps_history");
      if (storedDumps) {
        setDumps(JSON.parse(storedDumps));
      } else {
        setDumps(initialDumps);
        localStorage.setItem("neuromap_dumps_history", JSON.stringify(initialDumps));
      }
    } catch (e) {
      setDumps(initialDumps);
    }

    async function loadCanvases() {
      const list = await getCanvases();
      setCanvases(list);
      if (list.length > 0) {
        setTargetCanvasId(list[0]._id);
      } else {
        setTargetCanvasId("new");
        setNewCanvasName("My Brain Dump Mindmap");
      }
    }
    loadCanvases();
  }, []);

  const saveDumpsToStorage = (updatedDumps: any[]) => {
    setDumps(updatedDumps);
    try {
      localStorage.setItem("neuromap_dumps_history", JSON.stringify(updatedDumps));
    } catch (e) {
      console.error(e);
    }
  };

  const handleTextDumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      toast.error("Please enter some text to dump.");
      return;
    }

    const newDump = {
      id: Date.now().toString(),
      text: inputText.trim(),
      date: "Just now",
      parsed: false
    };

    const updated = [newDump, ...dumps];
    saveDumpsToStorage(updated);
    setInputText("");
    toast.success("Thoughts logged to Brain Dump inbox.");
    
    // Automatically trigger parser on submission
    triggerParser(inputText.trim(), newDump.id);
  };

  const handleDeleteDump = (id: string) => {
    const updated = dumps.filter((d) => d.id !== id);
    saveDumpsToStorage(updated);
    toast.success("Dump entry removed");
  };

  const triggerParser = (text: string, dumpId?: string) => {
    const nodes = parseBrainDump(text);
    if (nodes.length === 0) {
      toast.error("Could not extract any actionable elements from this text. Try writing more descriptive thoughts.");
      return;
    }

    setParsedNodes(nodes);
    
    // Select all by default
    const selections: Record<string, boolean> = {};
    nodes.forEach(n => {
      selections[n.id] = true;
    });
    setSelectedIds(selections);
    
    // Mark as parsed in history
    if (dumpId) {
      const updated = dumps.map(d => d.id === dumpId ? { ...d, parsed: true } : d);
      saveDumpsToStorage(updated);
    }
    
    toast.success(`Extracted ${nodes.length} second-brain nodes! Check the proposals panel below.`);
    
    // Scroll to proposals
    setTimeout(() => {
      document.getElementById("proposals-panel")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  // Node editing handlers in list
  const handleUpdateNodeField = (id: string, field: keyof ParsedNode, value: any) => {
    setParsedNodes(prev =>
      prev.map(n => (n.id === id ? { ...n, [field]: value } : n))
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSelectAll = (select: boolean) => {
    const selections: Record<string, boolean> = {};
    filteredNodes.forEach(n => {
      selections[n.id] = select;
    });
    setSelectedIds(prev => ({ ...prev, ...selections }));
  };

  const handleDeleteParsedNode = (id: string) => {
    setParsedNodes(prev => prev.filter(n => n.id !== id));
    toast.success("Item removed from preview.");
  };

  // Filter nodes based on active tab
  const getFilteredNodes = () => {
    if (activeTab === "all" || activeTab === "matrix") return parsedNodes;
    return parsedNodes.filter(n => n.nodeType === activeTab);
  };

  const filteredNodes = getFilteredNodes();

  // Eisenhower categorization helper
  const getEisenhowerQuadrant = (node: ParsedNode) => {
    const isUrgent = node.priority === "high" || !!node.dueDate;
    const isImportant = node.nodeType === "goal" || node.priority === "high" || node.priority === "medium";
    
    if (isUrgent && isImportant) return "q1"; // Do First
    if (!isUrgent && isImportant) return "q2"; // Schedule
    if (isUrgent && !isImportant) return "q3"; // Delegate / Manage
    return "q4"; // Eliminate / Backlog
  };

  const handleImportToCanvas = async () => {
    const nodesToImport = parsedNodes.filter(n => selectedIds[n.id]);
    if (nodesToImport.length === 0) {
      toast.error("Please select at least one node to import.");
      return;
    }

    setIsImporting(true);
    try {
      let canvasId = targetCanvasId;
      let targetCanvas: CanvasData | null = null;

      if (canvasId === "new") {
        if (!newCanvasName.trim()) {
          toast.error("Please specify a name for the new canvas.");
          setIsImporting(false);
          return;
        }
        const created = await createCanvas(newCanvasName.trim(), "Workspace created via Brain Dump");
        canvasId = created._id;
        targetCanvas = created;
      } else {
        targetCanvas = await getCanvasById(canvasId);
      }

      if (!targetCanvas) {
        toast.error("Target canvas not found.");
        setIsImporting(false);
        return;
      }

      // Generate column positions
      const columnSpacing = 350;
      const rowSpacing = 220;
      const colIndexMap: Record<string, number> = { goal: 0, task: 1, deadline: 2, note: 3 };
      const colCounts: Record<string, number> = { goal: 0, task: 0, deadline: 0, note: 0 };

      // Append offsets if canvas has existing nodes to prevent overlapping
      let startY = 0;
      if (targetCanvas.nodes && targetCanvas.nodes.length > 0) {
        const maxY = Math.max(...targetCanvas.nodes.map((n: any) => n.position.y));
        startY = maxY + 300; // Place 300px below lowest node
      }

      const newNodesList = nodesToImport.map((node, index) => {
        const type = node.nodeType;
        const col = colIndexMap[type] ?? 3;
        const row = colCounts[type];
        colCounts[type] += 1;

        const x = col * columnSpacing;
        const y = startY + row * rowSpacing;

        return {
          id: `${node.id}-${Date.now()}-${index}`,
          type: "customNode",
          position: { x, y },
          data: {
            nodeType: node.nodeType,
            title: node.title,
            content: node.content,
            status: node.status || "todo",
            priority: node.priority || "medium",
            progress: node.nodeType === "goal" ? 0 : undefined,
            dueDate: node.dueDate,
            warningThreshold: node.warningThreshold || 24,
            tags: node.tags || []
          }
        };
      });

      // Construct links (edges) automatically from Goals to Tasks
      const newEdgesList: any[] = [];
      const importedGoals = newNodesList.filter(n => n.data.nodeType === "goal");
      const importedTasks = newNodesList.filter(n => n.data.nodeType === "task");
      
      if (importedGoals.length > 0) {
        importedGoals.forEach(g => {
          importedTasks.forEach(t => {
            newEdgesList.push({
              id: `edge-${g.id}-${t.id}-${Date.now()}`,
              source: g.id,
              target: t.id
            });
          });
        });
      }

      // Merge nodes
      const finalNodes = [...(targetCanvas.nodes || []), ...newNodesList];
      const finalEdges = [...(targetCanvas.edges || []), ...newEdgesList];

      // Calculate centering viewport
      const xs = newNodesList.map(n => n.position.x);
      const ys = newNodesList.map(n => n.position.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Update Canvas
      await updateCanvas(canvasId, {
        nodes: finalNodes,
        edges: finalEdges,
        viewport: {
          x: 600 - cx * 0.75,
          y: 350 - cy * 0.75,
          zoom: 0.75
        }
      });

      toast.success(`Imported ${nodesToImport.length} nodes successfully! Redirecting...`);
      router.push(`/canvas/${canvasId}`);
    } catch (e) {
      console.error(e);
      toast.error("Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  // Node Icons mapping
  const getNodeIcon = (type: string) => {
    switch (type) {
      case "goal": return <Target className="w-4 h-4 text-emerald-400" />;
      case "task": return <CheckSquare className="w-4 h-4 text-sky-400" />;
      case "deadline": return <Clock className="w-4 h-4 text-amber-400" />;
      default: return <FileText className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 pb-32">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight font-mono text-emerald-400 flex items-center gap-3">
          <Inbox className="w-8 h-8 text-emerald-500" /> Smart Brain Dump
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste unstructured ideas or logs. The local heuristic parser will automatically scan, classify, and extract them into connected visual nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thought Input Panel */}
        <Card className="lg:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-500" /> Thoughts Unloader
            </CardTitle>
            <CardDescription className="text-xs">
              Type or paste anything. Our local intelligence layer extracts actionable goals, tasks, deadlines, and note elements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleTextDumpSubmit} className="space-y-4">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Example: I need to finish DSA before placements, complete my hackathon MVP by Sunday, prepare for DBMS exam next week, and update my portfolio."
                rows={8}
                className="bg-background border-border text-foreground focus-visible:ring-emerald-500 font-sans text-sm resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="border-emerald-900/60 bg-emerald-950/20 text-emerald-400 font-mono text-[10px]">
                  Client-Side Offline NLP
                </Badge>
                <Button type="submit" className="bg-primary hover:bg-emerald-700 text-primary-foreground font-mono text-xs gap-2">
                  <Sparkles className="w-4 h-4" /> Analyze thoughts
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-emerald-950/15 border-t border-emerald-900/20 p-4 rounded-b-xl flex items-start gap-3 text-xs text-emerald-400/90 font-sans">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[11px] block text-emerald-300">INTELLIGENT STRUCTURING RULES</strong>
              The parser automatically detects deadlines (e.g. "by Sunday" or "next week"), action tasks ("complete", "prepare"), career milestones ("DSA", "portfolio"), and saves them with confidence levels and layout coordinate offsets.
            </div>
          </CardFooter>
        </Card>

        {/* Thought History List */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" /> Dump History
            </CardTitle>
            <CardDescription className="text-xs">
              Quickly reload and analyze thoughts recorded previously.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto max-h-96 pr-1">
            {dumps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <span className="text-xs font-mono">Dump inbox empty</span>
              </div>
            ) : (
              dumps.map((dump) => (
                <div
                  key={dump.id}
                  className="p-3.5 rounded-xl border border-border bg-background/25 flex flex-col justify-between gap-3 text-xs"
                >
                  <p className="text-muted-foreground break-words leading-relaxed font-sans italic">
                    "{dump.text}"
                  </p>
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground/75 border-t border-border/40 pt-2">
                    <span>{dump.date}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => triggerParser(dump.text, dump.id)}
                        className="h-6 px-2 text-emerald-400 hover:bg-emerald-950/20 hover:text-emerald-300 gap-1 font-mono text-[10px]"
                      >
                        Run Parser <ChevronRight className="w-3 h-3" />
                      </Button>
                      <button
                        onClick={() => handleDeleteDump(dump.id)}
                        className="hover:text-red-400 transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parser Proposal & Import Console */}
      {parsedNodes.length > 0 && (
        <Card id="proposals-panel" className="bg-card/40 border-border backdrop-blur-sm shadow-2xl flex flex-col scroll-mt-6">
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-mono text-lg text-emerald-400 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" /> Extracted Brain Proposals
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and customize nodes before importing them. Discard or reclassify as needed.
                </CardDescription>
              </div>

              {/* Selector Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleSelectAll(true)}
                  className="font-mono text-[10px] h-8 border-border"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleSelectAll(false)}
                  className="font-mono text-[10px] h-8 border-border"
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 border-b border-border/20 pt-4 overflow-x-auto">
              {[
                { id: "all", label: "All Items" },
                { id: "goal", label: "Goals" },
                { id: "task", label: "Tasks" },
                { id: "deadline", label: "Deadlines" },
                { id: "note", label: "Notes" },
                { id: "matrix", label: "Eisenhower Matrix" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-mono border-t-2 border-transparent transition-all -mb-[1px] whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-emerald-400 bg-emerald-950/15"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label} ({tab.id === "all" || tab.id === "matrix" ? parsedNodes.length : parsedNodes.filter(n => n.nodeType === tab.id).length})
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="py-6">
            {/* Tab: Standard Lists */}
            {activeTab !== "matrix" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredNodes.length === 0 ? (
                  <div className="md:col-span-2 text-center py-10 font-mono text-xs text-muted-foreground">
                    No nodes extracted for this category.
                  </div>
                ) : (
                  filteredNodes.map((node) => (
                    <Card
                      key={node.id}
                      className={`bg-background/40 border transition-all ${
                        selectedIds[node.id] ? "border-emerald-600 shadow-md" : "border-border/60"
                      }`}
                    >
                      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[node.id]}
                            onChange={() => handleToggleSelect(node.id)}
                            className="w-4 h-4 accent-emerald-500 rounded border-border cursor-pointer"
                          />
                          <Badge variant="outline" className="h-5 px-1.5 flex gap-1 font-mono text-[9px] uppercase">
                            {getNodeIcon(node.nodeType)}
                            <span className="text-[9px]">{node.nodeType}</span>
                          </Badge>
                          <Badge className="bg-emerald-950/20 text-emerald-500 border-emerald-900/30 text-[9px] font-mono">
                            {Math.round(node.confidence * 100)}% Confidence
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteParsedNode(node.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-3">
                        {/* Title input */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground font-mono">Title</Label>
                          <Input
                            value={node.title}
                            onChange={(e) => handleUpdateNodeField(node.id, "title", e.target.value)}
                            className="h-8 text-xs font-sans bg-background/50"
                          />
                        </div>

                        {/* Description input */}
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground font-mono">Description / Notes</Label>
                          <Textarea
                            value={node.content}
                            onChange={(e) => handleUpdateNodeField(node.id, "content", e.target.value)}
                            rows={2}
                            className="text-xs font-sans bg-background/50 resize-none"
                          />
                        </div>

                        {/* Reclassify select dropdown */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground font-mono">Reclassify Type</Label>
                            <Select
                              value={node.nodeType}
                              onValueChange={(val) => handleUpdateNodeField(node.id, "nodeType", val as any)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border text-xs text-foreground font-mono">
                                <SelectItem value="goal">Goal</SelectItem>
                                <SelectItem value="task">Task</SelectItem>
                                <SelectItem value="deadline">Deadline</SelectItem>
                                <SelectItem value="note">Note</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Dynamic variant-specific parameters */}
                          {node.nodeType === "task" && (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-mono">Priority</Label>
                              <Select
                                value={node.priority}
                                onValueChange={(val) => handleUpdateNodeField(node.id, "priority", val as any)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-xs font-mono">
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {node.nodeType === "deadline" && (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-mono">Due Date</Label>
                              <Input
                                type="datetime-local"
                                value={node.dueDate ? node.dueDate.substring(0, 16) : ""}
                                onChange={(e) => handleUpdateNodeField(node.id, "dueDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                                className="h-8 text-xs bg-background/50"
                              />
                            </div>
                          )}

                          {node.nodeType === "note" && (
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-mono">Tags (comma separated)</Label>
                              <Input
                                value={(node.tags || []).join(", ")}
                                onChange={(e) =>
                                  handleUpdateNodeField(
                                    node.id,
                                    "tags",
                                    e.target.value.split(",").map(t => t.trim()).filter(Boolean)
                                  )
                                }
                                placeholder="math, placements"
                                className="h-8 text-xs bg-background/50"
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Tab: Eisenhower Matrix quadrant preview */}
            {activeTab === "matrix" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quadrant 1 */}
                <div className="border border-red-900/40 rounded-xl bg-red-950/5 p-4 space-y-3">
                  <h4 className="font-mono text-xs font-semibold text-red-400 flex items-center justify-between border-b border-red-950/30 pb-2">
                    <span>I. Urgent + Important (Do First)</span>
                    <Badge className="bg-red-950 text-red-400 border border-red-900/30 text-[9px]">
                      {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q1").length} Items
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q1").map(node => (
                      <div key={node.id} className="p-2 border border-red-900/20 bg-background/40 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[node.id]}
                            onChange={() => handleToggleSelect(node.id)}
                            className="w-3.5 h-3.5 accent-red-500 rounded cursor-pointer"
                          />
                          <span className="truncate text-foreground/95" title={node.title}>{node.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateNodeField(node.id, "priority", "medium")}
                            className="h-5 w-5 text-muted-foreground hover:text-emerald-400 text-[10px]"
                            title="Downgrade priority"
                          >
                            <ArrowRight className="w-3 h-3 rotate-90" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q1").length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-4 font-mono italic">No items here</p>
                    )}
                  </div>
                </div>

                {/* Quadrant 2 */}
                <div className="border border-emerald-900/40 rounded-xl bg-emerald-950/5 p-4 space-y-3">
                  <h4 className="font-mono text-xs font-semibold text-emerald-400 flex items-center justify-between border-b border-emerald-950/30 pb-2">
                    <span>II. Important + Not Urgent (Schedule)</span>
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-900/30 text-[9px]">
                      {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q2").length} Items
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q2").map(node => (
                      <div key={node.id} className="p-2 border border-emerald-900/20 bg-background/40 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[node.id]}
                            onChange={() => handleToggleSelect(node.id)}
                            className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className="truncate text-foreground/95" title={node.title}>{node.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateNodeField(node.id, "priority", "high")}
                            className="h-5 w-5 text-muted-foreground hover:text-red-400 text-[10px]"
                            title="Upgrade priority"
                          >
                            <ArrowRight className="w-3 h-3 -rotate-90" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q2").length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-4 font-mono italic">No items here</p>
                    )}
                  </div>
                </div>

                {/* Quadrant 3 */}
                <div className="border border-sky-900/40 rounded-xl bg-sky-950/5 p-4 space-y-3">
                  <h4 className="font-mono text-xs font-semibold text-sky-400 flex items-center justify-between border-b border-sky-950/30 pb-2">
                    <span>III. Urgent + Not Important (Delegate)</span>
                    <Badge className="bg-sky-950 text-sky-400 border border-sky-900/30 text-[9px]">
                      {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q3").length} Items
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q3").map(node => (
                      <div key={node.id} className="p-2 border border-sky-900/20 bg-background/40 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[node.id]}
                            onChange={() => handleToggleSelect(node.id)}
                            className="w-3.5 h-3.5 accent-sky-500 rounded cursor-pointer"
                          />
                          <span className="truncate text-foreground/95" title={node.title}>{node.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateNodeField(node.id, "priority", "low")}
                            className="h-5 w-5 text-muted-foreground hover:text-purple-400 text-[10px]"
                            title="Downgrade priority"
                          >
                            <ArrowRight className="w-3 h-3 rotate-90" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q3").length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-4 font-mono italic">No items here</p>
                    )}
                  </div>
                </div>

                {/* Quadrant 4 */}
                <div className="border border-purple-900/40 rounded-xl bg-purple-950/5 p-4 space-y-3">
                  <h4 className="font-mono text-xs font-semibold text-purple-400 flex items-center justify-between border-b border-purple-950/30 pb-2">
                    <span>IV. Neither (Eliminate / Backlog)</span>
                    <Badge className="bg-purple-950 text-purple-400 border border-purple-900/30 text-[9px]">
                      {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q4").length} Items
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q4").map(node => (
                      <div key={node.id} className="p-2 border border-purple-900/20 bg-background/40 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[node.id]}
                            onChange={() => handleToggleSelect(node.id)}
                            className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer"
                          />
                          <span className="truncate text-foreground/95" title={node.title}>{node.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleUpdateNodeField(node.id, "priority", "medium")}
                            className="h-5 w-5 text-muted-foreground hover:text-sky-400 text-[10px]"
                            title="Upgrade priority"
                          >
                            <ArrowRight className="w-3 h-3 -rotate-90" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredNodes.filter(n => getEisenhowerQuadrant(n) === "q4").length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-4 font-mono italic">No items here</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Import Panel Control Footer */}
          <CardFooter className="bg-emerald-950/15 border-t border-border/40 p-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-b-xl">
            {/* Target Select */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="space-y-1">
                <Label htmlFor="destination-canvas" className="text-[10px] font-mono text-emerald-400">Destination Canvas</Label>
                <Select value={targetCanvasId} onValueChange={(val) => val && setTargetCanvasId(val)}>
                  <SelectTrigger className="h-9 w-60 bg-background text-xs text-foreground font-sans">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-xs text-foreground font-mono">
                    <SelectItem value="new">[+] Create New Canvas</SelectItem>
                    {canvases.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetCanvasId === "new" && (
                <div className="space-y-1 w-full sm:w-auto">
                  <Label htmlFor="new-canvas-name" className="text-[10px] font-mono text-emerald-400">New Canvas Name</Label>
                  <Input
                    id="new-canvas-name"
                    value={newCanvasName}
                    onChange={(e) => setNewCanvasName(e.target.value)}
                    placeholder="e.g. DSA Preparation Plan"
                    className="h-9 w-60 text-xs bg-background"
                  />
                </div>
              )}
            </div>

            {/* Submit Import */}
            <Button
              onClick={handleImportToCanvas}
              disabled={isImporting || parsedNodes.filter(n => selectedIds[n.id]).length === 0}
              className="w-full md:w-auto bg-primary hover:bg-emerald-700 text-primary-foreground font-mono text-xs gap-2 py-5"
            >
              <Compass className="w-4 h-4" /> Import {parsedNodes.filter(n => selectedIds[n.id]).length} Nodes to Canvas
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
