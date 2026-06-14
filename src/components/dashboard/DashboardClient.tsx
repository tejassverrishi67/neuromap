"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
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
import { createCanvas, deleteCanvas, getCanvases, CanvasData } from "@/lib/storage";

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

  // Dynamic productivity insights computation
  const analytics = useMemo(() => {
    let goalsCount = 0;
    let activeGoalsCount = 0;
    let completedTasksCount = 0;
    let totalTasksCount = 0;
    let upcomingDeadlinesCount = 0;
    let totalGoalProgress = 0;
    
    let highPriorityTasks = 0;
    let mediumPriorityTasks = 0;
    let lowPriorityTasks = 0;

    const nowStr = new Date().toISOString();

    canvases.forEach(c => {
      const nodes = c.nodes || [];
      nodes.forEach((n: any) => {
        if (n.data?.nodeType === "goal") {
          goalsCount++;
          const progress = n.data?.progress || 0;
          totalGoalProgress += progress;
          if (progress < 100) {
            activeGoalsCount++;
          }
        } else if (n.data?.nodeType === "task") {
          totalTasksCount++;
          const priority = n.data?.priority || "medium";
          if (priority === "high") highPriorityTasks++;
          else if (priority === "medium") mediumPriorityTasks++;
          else lowPriorityTasks++;

          if (n.data?.status === "done") {
            completedTasksCount++;
          }
        } else if (n.data?.nodeType === "deadline") {
          if (n.data?.dueDate && n.data.dueDate > nowStr) {
            upcomingDeadlinesCount++;
          }
        }
      });
    });

    const taskCompletionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
    const avgGoalProgress = goalsCount > 0 ? totalGoalProgress / goalsCount : 0;
    const productivityScore = totalTasksCount > 0 || goalsCount > 0
      ? Math.round(taskCompletionRate * 0.55 + avgGoalProgress * 0.45)
      : 0;

    return {
      activeGoals: activeGoalsCount,
      completedTasks: completedTasksCount,
      totalTasks: totalTasksCount,
      upcomingDeadlines: upcomingDeadlinesCount,
      productivityScore,
      highPriorityTasks,
      mediumPriorityTasks,
      lowPriorityTasks
    };
  }, [canvases]);

  // Compute daily task completions over the last 7 days
  const weeklyCompletionData = useMemo(() => {
    const dailyCounts = Array(7).fill(0);
    const dayLabels = Array(7).fill("");
    const now = new Date();
    
    // 1. Gather all completion timestamps in a single pass
    const completedTimestamps: number[] = [];
    canvases.forEach((c) => {
      (c.nodes || []).forEach((n: any) => {
        if (n.data?.nodeType === "task" && n.data?.status === "done") {
          const compDateStr = n.data.completedAt || c.updatedAt || c.lastActivity;
          if (compDateStr) {
            completedTimestamps.push(new Date(compDateStr).getTime());
          }
        }
      });
    });
    
    // 2. Map timestamps to the 7-day buckets
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      dayLabels[i] = d.toLocaleDateString("en-US", { weekday: "short" });
      
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayStartMs = dayStart.getTime();
      
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const dayEndMs = dayEnd.getTime();
      
      completedTimestamps.forEach((ts) => {
        if (ts >= dayStartMs && ts <= dayEndMs) {
          dailyCounts[i]++;
        }
      });
    }
    
    return { labels: dayLabels, counts: dailyCounts };
  }, [canvases]);

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
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 pb-12 overflow-y-auto h-full">
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
              { name: "Placement Preparation", desc: "Algorithmic study nodes & LC status", icon: Target, color: "text-sky-500 bg-sky-950/45" },
              { name: "Semester Planning", desc: "Academics assignments & office hours", icon: Calendar, color: "text-amber-500 bg-amber-950/45" },
              { name: "Hackathon Planning", desc: "Build MVP checklist & pitches", icon: Sparkles, color: "text-purple-500 bg-purple-950/45" }
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

      {/* PRODUCTIVITY INSIGHTS PANEL SECTION */}
      <div className="border-t border-border pt-6 mt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight font-mono text-emerald-400">
            Productivity Analytics & Insights
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Productivity Score Circular Gauge */}
          <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <CardHeader className="pb-1">
              <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
                Productivity Score
              </CardTitle>
              <CardDescription className="text-xs">
                Weighted performance gauge computed across all active milestone nodes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Radial Progress Arc */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-muted fill-none"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (isLoading ? 0 : analytics.productivityScore) / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold font-mono text-emerald-400">
                    {isLoading ? "-" : `${analytics.productivityScore}%`}
                  </span>
                  <span className="block text-[8px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5">
                    efficiency
                  </span>
                </div>
              </div>

              {/* Sub Metrics list */}
              <div className="w-full grid grid-cols-3 gap-2 text-center text-xs font-mono border-t border-border/40 pt-4 mt-2">
                <div>
                  <span className="text-emerald-400 font-bold block">{isLoading ? "-" : analytics.activeGoals}</span>
                  <span className="text-[9px] text-muted-foreground">Active Goals</span>
                </div>
                <div className="border-x border-border/40">
                  <span className="text-sky-400 font-bold block">{isLoading ? "-" : analytics.completedTasks}</span>
                  <span className="text-[9px] text-muted-foreground">Tasks Done</span>
                </div>
                <div>
                  <span className="text-amber-400 font-bold block">{isLoading ? "-" : analytics.upcomingDeadlines}</span>
                  <span className="text-[9px] text-muted-foreground">Near Alerts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SVG Weekly Completion Trend Bar Chart */}
          <Card className="lg:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
                Weekly Completion Rate
              </CardTitle>
              <CardDescription className="text-xs">
                Quantity of canvas task nodes marked completed over the trailing 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end justify-center py-4">
              {isLoading ? (
                <div className="h-40 w-full flex items-center justify-center text-xs font-mono text-muted-foreground">
                  Analyzing database metrics...
                </div>
              ) : (
                <div className="w-full">
                  {/* Clean Pure-SVG Bar Chart */}
                  <svg className="w-full h-40" viewBox="0 0 320 160">
                    {/* Horizontal Guideline lines */}
                    <line x1="10" y1="20" x2="310" y2="20" stroke="oklch(0.22 0.02 250)" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="10" y1="60" x2="310" y2="60" stroke="oklch(0.22 0.02 250)" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="10" y1="100" x2="310" y2="100" stroke="oklch(0.22 0.02 250)" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="10" y1="130" x2="310" y2="130" stroke="oklch(0.22 0.02 250)" strokeWidth="1" />
                    
                    {/* Bars map */}
                    {(() => {
                      const maxVal = Math.max(...weeklyCompletionData.counts, 1);
                      return weeklyCompletionData.counts.map((count, i) => {
                        const barWidth = 24;
                        const spacing = 42;
                        const x = 20 + i * spacing;
                        const maxBarHeight = 100;
                        const height = (count / maxVal) * maxBarHeight;
                        const y = 130 - height;
                        
                        return (
                          <g key={i} className="group">
                            {/* Bar Count Tooltip background */}
                            <rect
                              x={x - 4}
                              y={y - 20}
                              width={barWidth + 8}
                              height="16"
                              rx="4"
                              className="fill-emerald-950 stroke-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                            {/* Tooltip Count Text */}
                            <text
                              x={x + barWidth / 2}
                              y={y - 8}
                              textAnchor="middle"
                              className="fill-emerald-400 font-mono text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {count}
                            </text>
                            {/* The Bar shape */}
                            <rect
                              x={x}
                              y={y}
                              width={barWidth}
                              height={Math.max(height, 4)} // guarantee visibility
                              rx="6"
                              className="fill-emerald-500 hover:fill-emerald-400 transition-all duration-300 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            />
                            {/* Week Label */}
                            <text
                              x={x + barWidth / 2}
                              y="148"
                              textAnchor="middle"
                              className="fill-muted-foreground font-mono text-[9px]"
                            >
                              {weeklyCompletionData.labels[i]}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Priority Stack Summary Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div>
              <h3 className="font-mono text-sm font-bold text-emerald-400">Task Priority Distribution</h3>
              <p className="text-[10.5px] text-muted-foreground">Visual weight allocation of active canvas task items.</p>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] bg-background/50">
              {isLoading ? "-" : `${analytics.totalTasks} Total Tasks`}
            </Badge>
          </div>

          {isLoading ? (
            <div className="h-6 w-full bg-background/30 rounded-lg animate-pulse" />
          ) : (
            <div className="space-y-4">
              {/* Stack Bar */}
              {(() => {
                const total = analytics.highPriorityTasks + analytics.mediumPriorityTasks + analytics.lowPriorityTasks;
                const pctHigh = total > 0 ? (analytics.highPriorityTasks / total) * 100 : 0;
                const pctMed = total > 0 ? (analytics.mediumPriorityTasks / total) * 100 : 0;
                const pctLow = total > 0 ? (analytics.lowPriorityTasks / total) * 100 : 0;

                return (
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                      {pctHigh > 0 && (
                        <div
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${pctHigh}%` }}
                          title={`High Priority: ${analytics.highPriorityTasks}`}
                        />
                      )}
                      {pctMed > 0 && (
                        <div
                          className="h-full bg-sky-500 transition-all duration-500"
                          style={{ width: `${pctMed}%` }}
                          title={`Medium Priority: ${analytics.mediumPriorityTasks}`}
                        />
                      )}
                      {pctLow > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${pctLow}%` }}
                          title={`Low Priority: ${analytics.lowPriorityTasks}`}
                        />
                      )}
                    </div>

                    {/* Legend Labels */}
                    <div className="grid grid-cols-3 gap-2 text-[10.5px] font-mono">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                        <span className="text-muted-foreground">High:</span>
                        <span className="text-foreground font-bold">{analytics.highPriorityTasks}</span>
                        <span className="text-muted-foreground text-[9px]">({Math.round(pctHigh)}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-2.5 h-2.5 bg-sky-500 rounded-sm" />
                        <span className="text-muted-foreground">Medium:</span>
                        <span className="text-foreground font-bold">{analytics.mediumPriorityTasks}</span>
                        <span className="text-muted-foreground text-[9px]">({Math.round(pctMed)}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                        <span className="text-muted-foreground">Low:</span>
                        <span className="text-foreground font-bold">{analytics.lowPriorityTasks}</span>
                        <span className="text-muted-foreground text-[9px]">({Math.round(pctLow)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
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
