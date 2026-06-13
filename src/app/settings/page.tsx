import React from "react";
import { Settings, Database, Keyboard, HelpCircle, HardDrive, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const isDbConnected = false;
  const connectionStateString = "Development Mode";
  const databaseName = "Local Storage (Sandbox)";
  const host = "Browser Cache";

  const shortcuts = [
    { keys: ["Double Click Pane"], desc: "Spawns note node at cursor" },
    { keys: ["Drag Handle", "Drop on Node"], desc: "Creates connection edge" },
    { keys: ["Click Node", "Delete / Backspace"], desc: "Deletes selected node" },
    { keys: ["Click Edge", "Delete / Backspace"], desc: "Deletes selected edge" },
    { keys: ["Scroll Wheel", "Pinch Zoom"], desc: "Zoom in/out of canvas" },
    { keys: ["Hold Space + Drag"], desc: "Pan across visual viewport" }
  ];

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 pb-32">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight font-mono text-emerald-400 flex items-center gap-3">
          <Settings className="w-8 h-8 text-emerald-500" /> Settings & Config
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review system database configuration state, key binds, and visual mapping parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Monitor Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" /> Storage Sandbox Status
            </CardTitle>
            <CardDescription className="text-xs">
              Diagnostics for active second brain storage providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-muted-foreground">Storage Adapter</span>
              <Badge className="bg-amber-950/45 text-amber-400 border border-amber-900/40">
                {connectionStateString}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-muted-foreground">Target Storage</span>
              <span className="text-foreground font-semibold">{databaseName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-muted-foreground">Host Sandbox</span>
              <span className="text-foreground truncate max-w-[180px]">{host}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Local Redundancy Engine</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active LocalStorage
              </span>
            </div>
          </CardContent>
          <CardFooter className="text-[10px] text-muted-foreground border-t border-border/40 pt-4">
            Currently running in pure client-side sandbox mode (MongoDB skipped).
          </CardFooter>
        </Card>

        {/* Shortcuts & Bindings Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-emerald-500" /> Canvas Key Binds
            </CardTitle>
            <CardDescription className="text-xs">
              List of interactive gestures supported in the visual canvas pane.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 font-mono text-xs">
            {shortcuts.map((s, index) => (
              <div key={index} className="flex items-center justify-between py-1 border-b border-border/20 last:border-b-0 pb-2">
                <span className="text-muted-foreground">{s.desc}</span>
                <div className="flex gap-1">
                  {s.keys.map((k, kIndex) => (
                    <kbd
                      key={kIndex}
                      className="px-1.5 py-0.5 rounded bg-background border border-border/80 text-[10px] font-sans text-foreground whitespace-nowrap shadow-inner font-mono text-emerald-400/90"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Details / Specifications */}
        <Card className="md:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="font-mono text-base text-emerald-400 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-500" /> System Specifications
            </CardTitle>
            <CardDescription className="text-xs">
              System software parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-muted-foreground">
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-emerald-500 font-bold mb-1">Stack version</span>
              Next.js 16 (React 19 App Router)
            </div>
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-emerald-500 font-bold mb-1">Canvas Engine</span>
              @xyflow/react v12.4+
            </div>
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-emerald-500 font-bold mb-1">Theme aesthetic</span>
              Silent Coder (Forest/Charcoal CSS)
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
