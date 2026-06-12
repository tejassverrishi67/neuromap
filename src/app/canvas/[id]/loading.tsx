import React from "react";
import { Loader2, BrainCircuit } from "lucide-react";

export default function CanvasLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen text-foreground select-none">
      <div className="flex flex-col items-center space-y-4">
        {/* Pulsing Brain Logo */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
          <BrainCircuit className="w-8 h-8 text-emerald-400" />
        </div>
        <div className="flex items-center gap-2 font-mono text-sm text-emerald-400">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Synchronizing Brain Nodes...</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono">
          Loading canvas parameters & layout state
        </p>
      </div>
    </div>
  );
}
