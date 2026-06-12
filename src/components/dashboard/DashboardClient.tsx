"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Target,
  CheckSquare,
  Clock,
  FileText,
  Trash2,
  ExternalLink,
  BookOpen,
  Calendar,
  Sparkles,
  Trophy,
  Loader2,
  Workflow
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createCanvas, deleteCanvas, getCanvases } from "@/lib/storage";

interface CanvasData {
  _id: string;
  name: string;
  description: string;
  metadata: {
    totalNodes: number;
    totalGoals: number;
    totalTasks: number;
    totalDeadlines: number;
    totalNotes: number;
  };
  lastActivity: string | null;
  updatedAt: string | null;
}

interface DashboardClientProps {
  initialCanvases?: CanvasData[];
}

export default function DashboardClient({ initialCanvases }: DashboardClientProps) {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasData[]>(initialCanvases || []);
  const [isLoading, setIsLoading] = useState(!initialCanvases || initialCanvases.length === 0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [newCanvasDesc, setNewCanvasDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const [canvasToDelete, setCanvasToDelete] = useState<CanvasData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Async dashboard data retrieve on client mount to never block initial layout rendering
  useEffect(() => {
    async function loadDashboard() {
      try {
        const list = await getCanvases();
        setCanvases(list as any[]);
      } catch (err) {
        console.error("Failed to load dashboard data dynamically:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Aggregate stats across all canvases
  const totalCanvases = canvases.length;
  const stats = canvases.reduce(
    (acc, curr) => {
      acc.nodes += curr.metadata?.totalNodes || 0;
      acc.goals += curr.metadata?.totalGoals || 0;
      acc.tasks += curr.metadata?.totalTasks || 0;
      acc.deadlines += curr.metadata?.totalDeadlines || 0;
      acc.notes += curr.metadata?.totalNotes || 0;
      return acc;
    },
    { nodes: 0, goals: 0, tasks: 0, deadlines: 0, notes: 0 }
  );

  const handleCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanvasName.trim()) {
      toast.error("Please enter a name for the canvas.");
      return;
    }

    startTransition(async () => {
      try {
        const created = await createCanvas(
          newCanvasName.trim(),
          newCanvasDesc.trim(),
          selectedTemplate || undefined
        );
        if (created) {
          toast.success(`Canvas "${created.name}" created successfully!`);
          setIsCreateOpen(false);
          setNewCanvasName("");
          setNewCanvasDesc("");
          setSelectedTemplate(null);
          router.push(`/canvas/${created._id}`);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to create canvas. MongoDB is currently offline.");
      }
    });
  };

  const handleDeleteCanvas = async () => {
    if (!canvasToDelete) return;
    const canvasId = canvasToDelete._id;
    const canvasName = canvasToDelete.name;

    startTransition(async () => {
      try {
        const success = await deleteCanvas(canvasId);
        if (success) {
          toast.success(`Canvas "${canvasName}" deleted.`);
          setCanvases(canvases.filter((c) => c._id !== canvasId));
          setCanvasToDelete(null);
        } else {
          toast.error("Could not find canvas to delete.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete canvas.");
      }
    });
  };

  const openCreateDialog = (templateName: string | null = null) => {
    setSelectedTemplate(templateName);
    setNewCanvasName(templateName ? `My ${templateName}` : "New Brain Map");
    setNewCanvasDesc(templateName ? `Workspace created from the ${templateName} template.` : "");
    setIsCreateOpen(true);
  };

  const formatActivityDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-h-screen">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-mono text-emerald-400">
              Visual Second Brain
            </h1>
            <Badge className="bg-amber-950/45 text-amber-400 border border-amber-900/40 font-mono text-[10px] py-0.5 px-2.5 shrink-0 select-none">
              Development Mode - Local Storage
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Map out ideas, link milestones, track tasks, and configure your goals.
          </p>
        </div>
        <Button
          onClick={() => openCreateDialog(null)}
          className="bg-primary hover:bg-emerald-700 text-primary-foreground font-mono font-medium self-start md:self-auto gap-2"
        >
          <Plus className="w-4 h-4" /> Create Canvas
        </Button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1: Aggregated Counts */}
        <Card className="md:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-emerald-400 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-emerald-500" /> Brain Metrics
            </CardTitle>
            <CardDescription className="text-xs">
              Aggregate nodes and metrics across all of your dynamic visual canvases.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
            {[
              { label: "Canvases", val: isLoading ? "-" : totalCanvases },
              { label: "Goals", val: isLoading ? "-" : stats.goals },
              { label: "Tasks", val: isLoading ? "-" : stats.tasks },
              { label: "Deadlines", val: isLoading ? "-" : stats.deadlines }
            ].map((st, idx) => (
              <div
                key={idx}
                className="bg-background/50 border border-border/80 rounded-xl p-4 flex flex-col items-center justify-center text-center"
              >
                <span className={`text-2xl font-bold font-mono text-emerald-400 ${isLoading ? "animate-pulse" : ""}`}>
                  {st.val}
                </span>
                <span className="text-xs text-muted-foreground mt-1">{st.label}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground border-t border-border/40 pt-4 mt-2">
            {isLoading ? "Synchronizing database metrics..." : `Total of ${stats.nodes} interconnected nodes mapping your second brain database.`}
          </CardFooter>
        </Card>

        {/* Stat Card 2: Quick Info */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Active Nodes
            </CardTitle>
            <CardDescription className="text-xs">
              Categorized composition of your second brain elements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Goals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="w-3.5 h-3.5 text-emerald-500" /> Goals
                </span>
                <span>{isLoading ? "-" : stats.goals}</span>
              </div>
              <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${!isLoading && stats.nodes ? (stats.goals / stats.nodes) * 100 : 0}%` }}
                />
              </div>
            </div>
            {/* Tasks */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckSquare className="w-3.5 h-3.5 text-sky-500" /> Tasks
                </span>
                <span>{isLoading ? "-" : stats.tasks}</span>
              </div>
              <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${!isLoading && stats.nodes ? (stats.tasks / stats.nodes) * 100 : 0}%` }}
                />
              </div>
            </div>
            {/* Deadlines */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Deadlines
                </span>
                <span>{isLoading ? "-" : stats.deadlines}</span>
              </div>
              <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${!isLoading && stats.nodes ? (stats.deadlines / stats.nodes) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-[11px] text-muted-foreground border-t border-border/40 pt-4">
            Notes represent the remaining {isLoading ? "-" : stats.notes} nodes.
          </CardFooter>
        </Card>

        {/* Card 3: Templates Quick Actions */}
        <Card className="md:col-span-1 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-emerald-400 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-500" /> Quick Templates
            </CardTitle>
            <CardDescription className="text-xs">
              Instantiate standard canvas schemas instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Career Roadmap", desc: "SDE placement & resume milestones", icon: Trophy, color: "text-emerald-500 bg-emerald-950/45" },
              { name: "DSA Tracker", desc: "Algorithmic study nodes & LC status", icon: Target, color: "text-sky-500 bg-sky-950/45" },
              { name: "Semester Planner", desc: "Academics assignments & office hours", icon: Calendar, color: "text-amber-500 bg-amber-950/45" },
              { name: "Hackathon Planner", desc: "Build MVP checklist & pitches", icon: Sparkles, color: "text-purple-500 bg-purple-950/45" }
            ].map((t) => (
              <button
                key={t.name}
                onClick={() => openCreateDialog(t.name)}
                className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-emerald-500/30 bg-background/30 hover:bg-background/80 transition-all duration-200 flex items-center gap-3 group"
              >
                <div className={`p-2 rounded-lg ${t.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  <t.icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-semibold font-mono text-foreground tracking-wide">{t.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{t.desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
          <CardFooter className="text-[11px] text-muted-foreground border-t border-border/40 pt-4">
            Click to launch and personalize canvas.
          </CardFooter>
        </Card>

        {/* Card 4: Recent Canvases */}
        <Card className="md:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-emerald-400 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-500" /> Recent Canvases
            </CardTitle>
            <CardDescription className="text-xs">
              Load, review, or delete your saved second brain visual nodes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {isLoading ? (
              <div className="space-y-3 pr-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 w-full rounded-xl bg-background/20 border border-border/60 animate-pulse flex items-center justify-between p-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 w-1/3 bg-muted rounded"></div>
                      <div className="h-2.5 w-1/2 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : canvases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                <Workflow className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
                <div>
                  <h4 className="text-sm font-semibold">No canvases found</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Get started by creating a blank canvas or launching a roadmap template above.
                  </p>
                </div>
                <Button onClick={() => openCreateDialog(null)} variant="outline" size="sm" className="border-border hover:border-emerald-950 font-mono text-xs">
                  Create First Canvas
                </Button>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
                {canvases.map((canvas) => (
                  <div
                    key={canvas._id}
                    className="p-4 rounded-xl border border-border/80 hover:border-emerald-500/20 bg-background/25 hover:bg-background/60 transition-all duration-200 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">{canvas.name}</h3>
                        {canvas.metadata?.totalNodes > 0 && (
                          <Badge variant="secondary" className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 font-mono text-[9px] px-1.5 py-0">
                            {canvas.metadata.totalNodes} Nodes
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {canvas.description || "No description provided."}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-mono">
                        <span>Activity: {formatActivityDate(canvas.lastActivity || canvas.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/canvas/${canvas._id}`)}
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/20 border border-transparent hover:border-emerald-900/30 transition-all"
                        title="Open Canvas"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCanvasToDelete(canvas)}
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-950/25 border border-transparent hover:border-red-950/45 transition-all"
                        title="Delete Canvas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CREATE CANVAS DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground font-mono text-sm max-w-md">
          <form onSubmit={handleCreateCanvas} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-emerald-400 text-lg">
                {selectedTemplate ? `Launch Template: ${selectedTemplate}` : "Create New Canvas"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set up a title and context description for your visual mapping database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="canvas-name" className="text-xs">Canvas Name</Label>
                <Input
                  id="canvas-name"
                  value={newCanvasName}
                  onChange={(e) => setNewCanvasName(e.target.value)}
                  placeholder="e.g. Q3 Projects Mindmap"
                  required
                  disabled={isPending}
                  className="bg-background border-border text-foreground focus-visible:ring-emerald-500 font-sans"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canvas-desc" className="text-xs">Description</Label>
                <Textarea
                  id="canvas-desc"
                  value={newCanvasDesc}
                  onChange={(e) => setNewCanvasDesc(e.target.value)}
                  placeholder="Optional description of key deliverables..."
                  disabled={isPending}
                  rows={3}
                  className="bg-background border-border text-foreground focus-visible:ring-emerald-500 font-sans"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
                disabled={isPending}
                className="hover:bg-muted/40 hover:text-foreground font-mono text-xs border border-transparent hover:border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-primary hover:bg-emerald-700 text-primary-foreground font-mono text-xs"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Initializing...
                  </>
                ) : (
                  "Create Canvas"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={!!canvasToDelete} onOpenChange={(open) => !open && setCanvasToDelete(null)}>
        <DialogContent className="bg-card border-border text-foreground font-mono text-sm max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400 text-lg flex items-center gap-2">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete the canvas{" "}
              <strong className="text-foreground">"{canvasToDelete?.name}"</strong>? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCanvasToDelete(null)}
              disabled={isPending}
              className="hover:bg-muted/40 font-mono text-xs border border-transparent hover:border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteCanvas}
              disabled={isPending}
              className="bg-red-950 hover:bg-red-800 text-red-200 border border-red-800/60 font-mono text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Deleting...
                </>
              ) : (
                "Delete Canvas"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
