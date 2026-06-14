"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Inbox, 
  Workflow, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  BrainCircuit,
  LayoutGrid,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? resolvedTheme : "dark";

  const toggleTheme = () => {
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Brain Dump",
      href: "/braindump",
      icon: Inbox,
    },
    {
      name: "Eisenhower",
      href: "/eisenhower",
      icon: LayoutGrid,
    },
    {
      name: "Visual Canvas",
      href: "/canvas/new", // Default action leads to new/latest but highlight matches subpaths
      matchHref: "/canvas",
      icon: Workflow,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const isActive = (item: typeof menuItems[0]) => {
    if (item.matchHref) {
      return pathname.startsWith(item.matchHref);
    }
    return pathname === item.href;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen border-r border-border bg-card/65 backdrop-blur-md transition-all duration-300 relative select-none",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-border gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-goal-bg border border-goal-border text-goal-text animate-pulse">
            <BrainCircuit className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg tracking-wider text-primary font-mono">
              NeuroMap
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Active = isActive(item);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  Active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105", Active ? "text-primary" : "text-muted-foreground")} />
                {!isCollapsed && <span>{item.name}</span>}

                {/* Tooltip when collapsed */}
                {isCollapsed && (
                  <div className="absolute left-14 hidden group-hover:block z-50 bg-popover border border-border px-2 py-1 rounded text-xs text-foreground whitespace-nowrap shadow-lg">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Toggle and Theme Buttons */}
        <div className={cn("p-3 border-t border-border flex items-center justify-between", isCollapsed && "flex-col gap-2 justify-center")}>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
            aria-label="Toggle theme"
            title={currentTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {currentTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            )}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-all"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-t border-border flex justify-around items-center px-2 z-40">
        {menuItems.map((item) => {
          const Active = isActive(item);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-lg gap-0.5 text-[10px] font-medium transition-colors",
                Active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", Active ? "text-primary" : "text-muted-foreground")} />
              <span>{item.name}</span>
            </Link>
          );
        })}
        {/* Mobile Theme Toggle quick action */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center w-16 h-12 rounded-lg gap-0.5 text-[10px] font-medium transition-colors text-muted-foreground"
          aria-label="Toggle theme"
        >
          {currentTheme === "dark" ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
          <span>Theme</span>
        </button>
      </nav>
    </>
  );
}
