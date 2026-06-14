"use client";

import React, { useState } from "react";
import { Handle, Position, useReactFlow, NodeProps, Node } from "@xyflow/react";
import {
  Target,
  CheckSquare,
  Clock,
  FileText,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  Tag
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

// Define strict typing matching Mongoose canvas node structure
export type CustomNodeData = {
  nodeType: "goal" | "task" | "deadline" | "note";
  title: string;
  content?: string;
  status?: "todo" | "in-progress" | "done";
  priority?: "low" | "medium" | "high";
  progress?: number;
  dueDate?: string;
  warningThreshold?: number;
  tags?: string[];
  completedAt?: string;
  conflicts?: any[];
};

export type CustomNodeProps = NodeProps<Node<CustomNodeData>>;

function CustomNode({ id, data, selected }: CustomNodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form states for full edits
  const [editTitle, setEditTitle] = useState(data.title);
  const [editNodeType, setEditNodeType] = useState(data.nodeType);
  const [editContent, setEditContent] = useState(data.content || "");
  const [editStatus, setEditStatus] = useState(data.status || "todo");
  const [editPriority, setEditPriority] = useState(data.priority || "medium");
  const [editProgress, setEditProgress] = useState(data.progress || 0);
  const [editDueDate, setEditDueDate] = useState(data.dueDate || "");
  const [editWarningThreshold, setEditWarningThreshold] = useState(data.warningThreshold || 24);
  const [editTagsString, setEditTagsString] = useState((data.tags || []).join(", "));

  // Trigger partial inline edits (e.g. checkbox check, progress slider)
  const updateNodeData = (updatedFields: Partial<CustomNodeData>) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...updatedFields
              } as CustomNodeData
            }
          : n
      )
    );
  };

  const handleDelete = () => {
    setNodes((prevNodes) => prevNodes.filter((n) => n.id !== id));
    setEdges((prevEdges) => prevEdges.filter((e) => e.source !== id && e.target !== id));
    toast.success("Node deleted");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error("Title is required.");
      return;
    }

    const tagsArray = editTagsString
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const isNowCompleted = editStatus === "done" && data.status !== "done";
    const completedAt = isNowCompleted 
      ? new Date().toISOString() 
      : editStatus !== "done" 
        ? undefined 
        : data.completedAt;

    let progressVal = Number(editProgress);
    if (editNodeType === "goal") {
      progressVal = Math.max(0, Math.min(100, progressVal));
    }

    updateNodeData({
      nodeType: editNodeType,
      title: editTitle.trim(),
      content: editContent.trim(),
      status: editStatus as any,
      priority: editPriority as any,
      progress: progressVal,
      dueDate: editDueDate,
      warningThreshold: Number(editWarningThreshold),
      tags: tagsArray,
      completedAt
    });

    setIsEditOpen(false);
    toast.success("Node updated.");
  };

  // Helper to compute deadline alarms
  const getDeadlineState = () => {
    if (!data.dueDate) return { text: "No Date", color: "text-muted-foreground", urgency: "none" };
    
    const target = new Date(data.dueDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    
    if (diffMs < 0) {
      return { text: "Overdue", color: "text-urgent-text border-urgent-border bg-urgent-bg", urgency: "critical" };
    }

    const diffHours = diffMs / (1000 * 60 * 60);
    const threshold = data.warningThreshold ?? 24;

    if (diffHours <= threshold) {
      return {
        text: `${Math.round(diffHours)} hours left`,
        color: "text-deadline-text border-deadline-border bg-deadline-bg",
        urgency: "high"
      };
    }

    const diffDays = Math.ceil(diffHours / 24);
    return {
      text: `${diffDays} days left`,
      color: "text-goal-text border-goal-border bg-goal-bg",
      urgency: "low"
    };
  };

  const deadline = getDeadlineState();

  // Helper for priority colors
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "high":
        return <Badge className="bg-urgent-bg text-urgent-text border border-urgent-border text-[10px] py-0 px-1.5 font-mono select-none">High</Badge>;
      case "medium":
        return <Badge className="bg-task-bg text-task-text border border-task-border text-[10px] py-0 px-1.5 font-mono select-none">Medium</Badge>;
      default:
        return <Badge className="bg-goal-bg text-goal-text border border-goal-border text-[10px] py-0 px-1.5 font-mono select-none">Low</Badge>;
    }
  };

  // Node borders and headers styling based on type
  const typeConfigs = {
    goal: {
      border: selected 
        ? "border-goal-text shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
        : "border-goal-border hover:border-goal-text",
      headerBg: "bg-goal-header border-goal-border",
      iconColor: "text-goal-text",
      icon: Target,
      label: "Goal"
    },
    task: {
      border: selected 
        ? "border-task-text shadow-[0_0_12px_rgba(56,189,248,0.3)]" 
        : "border-task-border hover:border-task-text",
      headerBg: "bg-task-header border-task-border",
      iconColor: "text-task-text",
      icon: CheckSquare,
      label: "Task"
    },
    deadline: {
      border: selected 
        ? "border-deadline-text shadow-[0_0_12px_rgba(245,158,11,0.3)]" 
        : deadline.urgency === "critical"
          ? "border-urgent-border shadow-[0_0_8px_rgba(239,68,68,0.1)] hover:border-urgent-text"
          : deadline.urgency === "high"
            ? "border-deadline-border shadow-[0_0_8px_rgba(245,158,11,0.1)] hover:border-deadline-text"
            : "border-deadline-border hover:border-deadline-text",
      headerBg: "bg-deadline-header border-deadline-border",
      iconColor: "text-deadline-text",
      icon: Clock,
      label: "Deadline"
    },
    note: {
      border: selected 
        ? "border-note-text shadow-[0_0_12px_rgba(168,85,247,0.3)]" 
        : "border-note-border hover:border-note-text",
      headerBg: "bg-note-header border-note-border",
      iconColor: "text-note-text",
      icon: FileText,
      label: "Note"
    }
  };

  const config = typeConfigs[data.nodeType] || typeConfigs.note;
  const Icon = config.icon;

  return (
    <Card className={`w-72 bg-card/90 backdrop-blur-md border ${config.border} rounded-xl shadow-xl transition-all duration-200`}>
      {/* React Flow Connection Handles */}
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />

      {/* Node Header */}
      <div className={`p-3 border-b flex items-center justify-between rounded-t-xl ${config.headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
          <span className="text-[10px] font-bold tracking-wider font-mono uppercase text-muted-foreground">
            {config.label}
          </span>
          {data.conflicts && data.conflicts.length > 0 && (
            <Badge variant="outline" className="h-4 px-1 flex gap-0.5 border-urgent-border bg-urgent-bg text-urgent-text font-mono text-[8px] animate-pulse select-none">
              <AlertTriangle className="w-2.5 h-2.5" /> Alert
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 nodrag">
          {/* Edit Dialog Button */}
          <Dialog open={isEditOpen} onOpenChange={(open) => {
            if (open) {
              // Reset edit states to current node values
              setEditTitle(data.title);
              setEditNodeType(data.nodeType);
              setEditContent(data.content || "");
              setEditStatus(data.status || "todo");
              setEditPriority(data.priority || "medium");
              setEditProgress(data.progress || 0);
              setEditDueDate(data.dueDate || "");
              setEditWarningThreshold(data.warningThreshold || 24);
              setEditTagsString((data.tags || []).join(", "));
            }
            setIsEditOpen(open);
          }}>
            <DialogTrigger render={
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" />
            }>
              <Edit2 className="w-3.5 h-3.5" />
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground font-mono text-xs max-w-sm">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-primary text-base">Edit {config.label} Node</DialogTitle>
                  <DialogDescription className="text-[10px] text-muted-foreground">
                    Customize properties for your interconnected card.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="node-type" className="text-[10px]">Node Type</Label>
                    <Select value={editNodeType} onValueChange={(val) => val && setEditNodeType(val as any)}>
                      <SelectTrigger className="bg-background border-border text-xs font-sans h-8">
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

                  <div className="space-y-1">
                    <Label htmlFor="node-title" className="text-[10px]">Title</Label>
                    <Input
                      id="node-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="bg-background border-border text-foreground focus-visible:ring-primary font-sans text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="node-content" className="text-[10px]">Content / Description</Label>
                    <Textarea
                      id="node-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="bg-background border-border text-foreground focus-visible:ring-primary font-sans text-xs"
                    />
                  </div>

                  {/* Goal Variant progress and date */}
                  {editNodeType === "goal" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="goal-progress" className="text-[10px]">Progress (%)</Label>
                        <Input
                          id="goal-progress"
                          type="number"
                          min="0"
                          max="100"
                          value={editProgress}
                          onChange={(e) => setEditProgress(Number(e.target.value))}
                          className="bg-background border-border focus-visible:ring-primary font-sans text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="goal-due" className="text-[10px]">Target Date</Label>
                        <Input
                          id="goal-due"
                          type="date"
                          value={editDueDate ? editDueDate.split("T")[0] : ""}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="bg-background border-border focus-visible:ring-primary font-sans text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Task Variant status and priority */}
                  {editNodeType === "task" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="task-status" className="text-[10px]">Status</Label>
                        <Select value={editStatus} onValueChange={(val) => val && setEditStatus(val as any)}>
                          <SelectTrigger className="bg-background border-border text-xs font-sans">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-xs text-foreground font-mono">
                            <SelectItem value="todo">Todo</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="task-priority" className="text-[10px]">Priority</Label>
                        <Select value={editPriority} onValueChange={(val) => val && setEditPriority(val as any)}>
                          <SelectTrigger className="bg-background border-border text-xs font-sans">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border text-xs text-foreground font-mono">
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Deadline Variant date and threshold */}
                  {editNodeType === "deadline" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="deadline-due" className="text-[10px]">Due Date/Time</Label>
                        <Input
                          id="deadline-due"
                          type="datetime-local"
                          value={editDueDate ? editDueDate.substring(0, 16) : ""}
                          onChange={(e) => setEditDueDate(new Date(e.target.value).toISOString())}
                          className="bg-background border-border focus-visible:ring-primary font-sans text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="deadline-threshold" className="text-[10px]">Warn (Hours)</Label>
                        <Input
                          id="deadline-threshold"
                          type="number"
                          value={editWarningThreshold}
                          onChange={(e) => setEditWarningThreshold(Number(e.target.value))}
                          className="bg-background border-border focus-visible:ring-primary font-sans text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Note Variant tags */}
                  {editNodeType === "note" && (
                    <div className="space-y-1">
                      <Label htmlFor="note-tags" className="text-[10px]">Tags (Comma separated)</Label>
                      <Input
                        id="note-tags"
                        value={editTagsString}
                        onChange={(e) => setEditTagsString(e.target.value)}
                        placeholder="e.g. math, exam, draft"
                        className="bg-background border-border focus-visible:ring-primary font-sans text-xs"
                      />
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2 flex gap-1.5 justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditOpen(false)} className="hover:bg-muted/40 font-mono text-[10px]">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-[10px]">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Button */}
          <Button size="icon" variant="ghost" onClick={handleDelete} className="h-6 w-6 text-muted-foreground hover:text-urgent-text hover:bg-urgent-bg">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-4 space-y-3 select-text">
        <div>
          <h3 className="font-semibold text-xs text-foreground tracking-wide leading-tight break-words">
            {data.title || "Untitled"}
          </h3>
          {data.content && (
            <p className="text-[11px] text-muted-foreground mt-1.5 break-words whitespace-pre-wrap leading-relaxed">
              {data.content}
            </p>
          )}
        </div>

        {/* Dynamic conflict alerts rendering */}
        {data.conflicts && data.conflicts.length > 0 && (
          <div className="border border-urgent-border bg-urgent-bg p-2 rounded-lg space-y-1 nodrag">
            {data.conflicts.map((c: any, i: number) => (
              <div key={i} className="flex gap-1.5 items-start text-[9px] text-urgent-text leading-snug">
                <AlertTriangle className="w-3 h-3 text-urgent-text shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{c.message}</span>
                  <span className="block text-[8.5px] text-muted-foreground/80 italic mt-0.5">
                    {c.rescheduleSuggestion}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VARIANT-SPECIFIC FOOTER INFO */}
        
        {/* GOAL VARIANT RENDERING */}
        {data.nodeType === "goal" && (
          <div className="space-y-2 border-t border-border/40 pt-2.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-muted-foreground font-mono">Progress</span>
              <span className="font-bold font-mono text-goal-text">{data.progress ?? 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-goal-text rounded-full transition-all duration-300"
                style={{ width: `${data.progress ?? 0}%` }}
              />
            </div>
            {data.dueDate && (
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-mono">
                <Calendar className="w-3.5 h-3.5 text-goal-text" />
                <span>Target: {new Date(data.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        )}

        {/* TASK VARIANT RENDERING */}
        {data.nodeType === "task" && (
          <div className="flex items-center justify-between border-t border-border/40 pt-2.5 font-mono">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.status === "done"}
                onChange={(e) => {
                  const newStatus = e.target.checked ? "done" : "todo";
                  const completedAt = e.target.checked ? new Date().toISOString() : undefined;
                  updateNodeData({ status: newStatus, completedAt });
                  toast.success(`Task marked as ${newStatus}`);
                }}
                className="w-4 h-4 accent-primary rounded border-border cursor-pointer nodrag"
              />
              <span className={`text-[10px] font-mono ${data.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {data.status === "done" ? "Done" : data.status === "in-progress" ? "In Progress" : "Todo"}
              </span>
            </div>
            {getPriorityBadge(data.priority || "medium")}
          </div>
        )}

        {/* DEADLINE VARIANT RENDERING */}
        {data.nodeType === "deadline" && (
          <div className="border-t border-border/40 pt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-mono">Time Left</span>
              <Badge variant="outline" className={`text-[9px] font-mono border ${deadline.color}`}>
                {deadline.text}
              </Badge>
            </div>
            {data.dueDate && (
              <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-deadline-text" />
                <span>Due: {new Date(data.dueDate).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* NOTE VARIANT RENDERING */}
        {data.nodeType === "note" && data.tags && data.tags.length > 0 && (
          <div className="border-t border-border/40 pt-2.5 flex flex-wrap gap-1">
            {data.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-note-bg text-note-text border border-note-border text-[9px] font-mono py-0 px-1"
              >
                <Tag className="w-2.5 h-2.5 mr-0.5 inline-block shrink-0" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// React.memo optimization to skip rerendering unaffected nodes
const MemoizedCustomNode = React.memo(CustomNode, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.selected === nextProps.selected &&
    prevProps.data.title === nextProps.data.title &&
    prevProps.data.content === nextProps.data.content &&
    prevProps.data.status === nextProps.data.status &&
    prevProps.data.priority === nextProps.data.priority &&
    prevProps.data.progress === nextProps.data.progress &&
    prevProps.data.dueDate === nextProps.data.dueDate &&
    prevProps.data.warningThreshold === nextProps.data.warningThreshold &&
    prevProps.data.nodeType === nextProps.data.nodeType &&
    JSON.stringify(prevProps.data.tags) === JSON.stringify(nextProps.data.tags) &&
    JSON.stringify(prevProps.data.conflicts) === JSON.stringify(nextProps.data.conflicts)
  );
});

export default MemoizedCustomNode;
