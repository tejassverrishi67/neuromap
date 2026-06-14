"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Settings, 
  Keyboard, 
  HardDrive, 
  ShieldCheck, 
  Download, 
  Upload, 
  Loader2,
  Sun,
  Moon,
  Monitor,
  Palette,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleClearData = () => {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("neuromap") || key === "theme")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      toast.success("All NeuroMap data has been successfully cleared.");
      setIsClearConfirmOpen(false);
      
      // Force page reload to home to reset state
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      toast.error("Failed to clear data.");
    }
  };

  const shortcuts = [
    { keys: ["Double Click Pane"], desc: "Spawns note node at cursor" },
    { keys: ["Drag Handle", "Drop on Node"], desc: "Creates connection edge" },
    { keys: ["Click Node", "Delete / Backspace"], desc: "Deletes selected node" },
    { keys: ["Click Edge", "Delete / Backspace"], desc: "Deletes selected edge" },
    { keys: ["Scroll Wheel", "Pinch Zoom"], desc: "Zoom in/out of canvas" },
    { keys: ["Hold Space + Drag"], desc: "Pan across visual viewport" }
  ];

  const handleExportAll = () => {
    try {
      const raw = localStorage.getItem("neuromap_canvases_store");
      const list = raw ? JSON.parse(raw) : [];
      if (list.length === 0) {
        toast.error("No canvases found to export.");
        return;
      }
      
      const backupData = {
        canvases: list,
        backupVersion: "1.0",
        backedUpAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neuromap_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("All canvases exported successfully!");
    } catch {
      toast.error("Failed to export backup");
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const backup = JSON.parse(text);
        
        let canvasesToImport: any[] = [];
        
        // Support both single canvas export and full backup export
        if (backup && Array.isArray(backup.canvases)) {
          canvasesToImport = backup.canvases;
        } else if (backup && typeof backup === "object" && backup.nodes && backup.edges) {
          // Single canvas export
          canvasesToImport = [backup];
        } else {
          throw new Error("Invalid file structure. Must be a canvas or backup JSON.");
        }
        
        // Validate each canvas structure
        const validCanvases = canvasesToImport.filter((c: any) => {
          return (
            c &&
            typeof c === "object" &&
            typeof c.name === "string" &&
            Array.isArray(c.nodes) &&
            Array.isArray(c.edges)
          );
        });
        
        if (validCanvases.length === 0) {
          throw new Error("No valid canvases found in import file.");
        }
        
        const raw = localStorage.getItem("neuromap_canvases_store");
        const currentList = raw ? JSON.parse(raw) : [];
        
        let importCount = 0;
        const mergedList = [...currentList];
        
        validCanvases.forEach((imported: any) => {
          // Handle name collision by appending (Imported)
          let finalName = imported.name;
          const duplicateNameExists = currentList.some((c: any) => c.name.toLowerCase() === finalName.toLowerCase());
          if (duplicateNameExists) {
            finalName = `${imported.name} (Imported)`;
          }
          
          // Guarantee unique ID
          const finalId = `local-imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          
          const cleanCanvas = {
            _id: finalId,
            name: finalName,
            description: imported.description || "",
            nodes: imported.nodes,
            edges: imported.edges,
            viewport: imported.viewport || { x: 0, y: 0, zoom: 1 },
            metadata: imported.metadata || {
              totalNodes: imported.nodes.length,
              totalGoals: imported.nodes.filter((n: any) => n.data?.nodeType === "goal").length,
              totalTasks: imported.nodes.filter((n: any) => n.data?.nodeType === "task").length,
              totalDeadlines: imported.nodes.filter((n: any) => n.data?.nodeType === "deadline").length,
              totalNotes: imported.nodes.filter((n: any) => n.data?.nodeType === "note").length,
            },
            lastActivity: new Date().toISOString(),
            lastOpenedAt: new Date().toISOString(),
            createdAt: imported.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          mergedList.push(cleanCanvas);
          importCount++;
        });
        
        localStorage.setItem("neuromap_canvases_store", JSON.stringify(mergedList));
        toast.success(`Successfully imported ${importCount} canvas(es)!`);
        
        // Reload page to re-fetch loaded canvases list
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err: any) {
        console.error(err);
        toast.error(`Import failed: ${err.message || "Invalid JSON schema"}`);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 space-y-6 md:space-y-8 pb-12">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight font-mono text-primary flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" /> Settings & Config
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review application configuration, key binds, and customize themes or clear workspace data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Danger Zone Card */}
        <Card className="bg-card/40 border-urgent-border backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="font-mono text-base text-urgent-text flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-urgent-text" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-xs">
              Permanently clear application workspaces and reset configurations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-normal">
              Clearing all data will permanently remove all your custom canvases, brain dumps, and node history from local cache and reset the application to its clean, empty first-launch state.
            </p>
          </CardContent>
          <CardFooter className="border-t border-urgent-border/30 pt-4">
            <Button
              onClick={() => setIsClearConfirmOpen(true)}
              className="w-full bg-urgent-bg border border-urgent-border text-urgent-text hover:bg-urgent-bg/85 font-mono text-xs gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear All Data
            </Button>
          </CardFooter>
        </Card>

        {/* Shortcuts & Bindings Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="font-mono text-base text-primary flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" /> Canvas Key Binds
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
                      className="px-1.5 py-0.5 rounded bg-background border border-border/80 text-[10px] font-sans text-foreground whitespace-nowrap shadow-inner font-mono text-primary/90"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Theme Preference Settings Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono text-base text-primary flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Theme Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Select your visual styling interface preference.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
            {[
              { id: "light", label: "Light Mode", icon: Sun, desc: "Clean gray & white layout" },
              { id: "dark", label: "Dark Mode", icon: Moon, desc: "Silent Coder default layout" },
              { id: "system", label: "System Sync", icon: Monitor, desc: "Adapts to system preferences" }
            ].map((tOption) => {
              const active = mounted && theme === tOption.id;
              const IconComp = tOption.icon;
              return (
                <button
                  key={tOption.id}
                  onClick={() => {
                    setTheme(tOption.id);
                    toast.success(`Theme set to ${tOption.label}`);
                  }}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between h-28 hover:scale-[1.01] transition-all font-mono group ${
                    active
                      ? "border-primary bg-accent text-accent-foreground shadow-lg shadow-primary/15"
                      : "border-border bg-background/30 hover:border-border/80 hover:bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <IconComp className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    {active && <Badge className="bg-goal-bg text-goal-text border border-goal-border font-mono text-[9px] px-1 py-0 select-none">Active</Badge>}
                  </div>
                  <div>
                    <span className="block text-xs font-bold font-sans mt-2">{tOption.label}</span>
                    <span className="block text-[9px] mt-0.5 opacity-80">{tOption.desc}</span>
                  </div>
                </button>
              );
            })}
          </CardContent>
          <CardFooter className="text-[10px] text-muted-foreground border-t border-border/40 pt-4">
            Theme preference is cached instantly and synchronized across all pages.
          </CardFooter>
        </Card>

        {/* Data Portability (Import/Export Backup) Card */}
        <Card className="bg-card/40 border-border backdrop-blur-sm shadow-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="font-mono text-base text-primary flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Data Portability & Backup
            </CardTitle>
            <CardDescription className="text-xs">
              Export all canvases to a backup file, or restore/import canvases from a previous JSON export.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <Button
              onClick={handleExportAll}
              variant="outline"
              className="w-full sm:w-auto font-mono text-xs border border-border/40 hover:border-primary/30 gap-2 h-9 px-4"
              title="Download all canvases as a JSON backup"
            >
              <Download className="w-4 h-4 text-primary" /> Export System Backup
            </Button>
            
            <div className="w-full sm:w-auto relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
                disabled={isImporting}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full sm:w-auto font-mono text-xs border border-border/40 hover:border-primary/30 gap-2 h-9 px-4"
                disabled={isImporting}
                title="Upload and restore canvases from a JSON backup file"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-primary" />
                    Import Canvas Backup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-[10px] text-muted-foreground border-t border-border/40 pt-4">
            Imports are validated for structural integrity to prevent corruption. Duplicate canvas names are automatically appended with &quot;(Imported)&quot;.
          </CardFooter>
        </Card>

        {/* System Details / Specifications */}
        <Card className="md:col-span-2 bg-card/40 border-border backdrop-blur-sm shadow-xl">
          <CardHeader>
            <CardTitle className="font-mono text-base text-primary flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" /> System Specifications
            </CardTitle>
            <CardDescription className="text-xs">
              System software parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-muted-foreground">
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-primary font-bold mb-1">Stack version</span>
              Next.js 16 (React 19 App Router)
            </div>
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-primary font-bold mb-1">Canvas Engine</span>
              @xyflow/react v12.4+
            </div>
            <div className="p-3 bg-background/50 border border-border/40 rounded-xl">
              <span className="block text-[10px] uppercase text-primary font-bold mb-1">Theme aesthetic</span>
              Silent Coder (Forest/Charcoal CSS)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent className="bg-card border-border text-foreground font-mono text-xs max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-urgent-text text-lg flex items-center gap-2">
              Confirm Data Reset
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 leading-normal font-sans text-xs">
            Are you absolutely sure you want to clear all your workspaces, mindmaps, and parsed thoughts? The application will reset back to a completely empty state.
          </div>
          <DialogFooter className="pt-2 flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsClearConfirmOpen(false)}
              className="hover:bg-muted/40 hover:text-foreground font-mono text-xs border border-transparent hover:border-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleClearData}
              className="bg-urgent-bg text-urgent-text border border-urgent-border hover:bg-urgent-bg/80 font-mono text-xs"
            >
              Reset All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
