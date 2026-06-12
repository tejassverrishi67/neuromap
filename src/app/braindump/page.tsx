"use client";

import React, { useState } from "react";
import { Inbox, Brain, Sparkles, Send, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function BrainDumpPage() {
  const [inputText, setInputText] = useState("");
  const [dumps, setDumps] = useState([
    {
      id: "1",
      text: "Need to finish building the Next.js visual flow canvas by Sunday morning and prepare slides for the final presentation. Also need to write the Mongoose schema for persistence.",
      date: "10 mins ago",
      parsed: false
    },
    {
      id: "2",
      text: "Read Chapter 4 of Alex Xu's system design book. Target SDE-2 promotion timeline is Q4 2026. Keep doing 2 mock interviews every week.",
      date: "Yesterday",
      parsed: true
    }
  ]);

  const handleSubmit = (e: React.FormEvent) => {
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

    setDumps([newDump, ...dumps]);
    setInputText("");
    toast.success("Thoughts logged to Brain Dump inbox.");
  };

  const handleDelete = (id: string) => {
    setDumps(dumps.filter((d) => d.id !== id));
    toast.success("Dump entry removed");
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-h-screen">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight font-mono text-emerald-400 flex items-center gap-3">
          <Inbox className="w-8 h-8 text-emerald-500" /> Brain Dump Inbox
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unload raw thoughts, journals, or notes. In Phase 2, AI will parse these inputs into canvas nodes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-500" /> Thoughts Unloader
            </CardTitle>
            <CardDescription className="text-xs">
              Type or paste anything on your mind. Free-form writing helps clear cognitive load.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Examples: 'Met with Sarah. Need to schedule Database assignment review by next Wednesday. Graph algorithms prep is going well, finished BFS questions.'..."
                rows={8}
                className="bg-background border-border text-foreground focus-visible:ring-emerald-500 font-sans text-sm resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="border-emerald-900/60 bg-emerald-950/20 text-emerald-400 font-mono text-[10px]">
                  Phase 2: AI Parsing Ready
                </Badge>
                <Button type="submit" className="bg-primary hover:bg-emerald-700 text-primary-foreground font-mono text-xs gap-2">
                  <Send className="w-4 h-4" /> Save Dump
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-emerald-950/15 border-t border-emerald-900/20 p-4 rounded-b-xl flex items-start gap-3 text-xs text-emerald-400/90 font-sans">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono text-[11px] block text-emerald-300">PHASE 2 PREVIEW: AI Visual Extraction</strong>
              Next phase will introduce an AI agent that scans this inbox, classifies tasks, deadlines, and note fragments, and generates node proposals to inject directly into your graphs.
            </div>
          </CardFooter>
        </Card>

        {/* History Panel */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" /> Dump History
            </CardTitle>
            <CardDescription className="text-xs">
              Review raw thought files currently logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 overflow-y-auto max-h-96 pr-1">
            {dumps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <span className="text-xs font-mono">Thought file empty</span>
              </div>
            ) : (
              dumps.map((dump) => (
                <div
                  key={dump.id}
                  className="p-3.5 rounded-xl border border-border bg-background/25 flex flex-col justify-between gap-3 text-xs"
                >
                  <p className="text-muted-foreground break-words leading-relaxed font-sans">
                    "{dump.text}"
                  </p>
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground/75 border-t border-border/40 pt-2">
                    <span>{dump.date}</span>
                    <div className="flex items-center gap-2">
                      {dump.parsed ? (
                        <Badge className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[9px] px-1 py-0">
                          Processed
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground text-[9px] px-1 py-0">
                          Pending AI
                        </Badge>
                      )}
                      <button
                        onClick={() => handleDelete(dump.id)}
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
    </div>
  );
}
