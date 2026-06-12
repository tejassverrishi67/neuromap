import { ICanvasNode, ICanvasEdge } from "@/models/Canvas";

export interface CanvasTemplate {
  name: string;
  description: string;
  nodes: any[];
  edges: ICanvasEdge[];
}

export const templates: Record<string, CanvasTemplate> = {
  "Career Roadmap": {
    name: "Career Roadmap",
    description: "Plan your trajectory into Tier-1 tech roles with milestones, learning tasks, and resume guidelines.",
    nodes: [
      {
        id: "goal-1",
        type: "customNode",
        position: { x: 250, y: 50 },
        data: {
          nodeType: "goal",
          title: "SDE-2 at Tier-1 Tech",
          content: "Achieve mid-to-senior software engineer placement with target CTC & domain specialization by Q4 2026.",
          progress: 20,
          dueDate: "2026-12-31"
        }
      },
      {
        id: "task-1",
        type: "customNode",
        position: { x: 50, y: 250 },
        data: {
          nodeType: "task",
          title: "System Design Mastery",
          content: "Read Alex Xu's System Design Interview Volume 1 & 2. Complete 10 mock interviews.",
          status: "in-progress",
          priority: "high"
        }
      },
      {
        id: "task-2",
        type: "customNode",
        position: { x: 450, y: 250 },
        data: {
          nodeType: "task",
          title: "Open Source Contributions",
          content: "Find 2 active repositories in Next.js or Go ecosystems and submit 3 pull requests.",
          status: "todo",
          priority: "medium"
        }
      },
      {
        id: "deadline-1",
        type: "customNode",
        position: { x: 250, y: 430 },
        data: {
          nodeType: "deadline",
          title: "Portfolio & Resume Refactor",
          content: "Refactor portfolio site and tailor resume with key impact metrics.",
          dueDate: "2026-09-01T00:00:00.000Z",
          warningThreshold: 72
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 750, y: 120 },
        data: {
          nodeType: "note",
          title: "Career Resources Hub",
          content: "Useful links:\n- roadmap.sh/system-design\n- pramp.com for mocks\n- techinterviewhandbook.org",
          tags: ["career", "links", "study"]
        }
      }
    ],
    edges: [
      { id: "e-goal-task1", source: "goal-1", target: "task-1" },
      { id: "e-goal-task2", source: "goal-1", target: "task-2" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" }
    ]
  },
  "DSA Tracker": {
    name: "DSA Tracker",
    description: "Organize your algorithmic study plan, tracking progress on LeetCode questions and weekly contest ratings.",
    nodes: [
      {
        id: "goal-1",
        type: "customNode",
        position: { x: 250, y: 50 },
        data: {
          nodeType: "goal",
          title: "Solve 300 LC Questions",
          content: "Complete 150 Easy, 120 Medium, and 30 Hard questions across key patterns (trees, graphs, DP, intervals).",
          progress: 45,
          dueDate: "2026-08-31"
        }
      },
      {
        id: "task-1",
        type: "customNode",
        position: { x: 50, y: 250 },
        data: {
          nodeType: "task",
          title: "Graph Algorithms",
          content: "Study BFS, DFS, Dijkstra, Bellman-Ford, and Union-Find patterns. Solve 15 Medium/Hard questions.",
          status: "done",
          priority: "high"
        }
      },
      {
        id: "task-2",
        type: "customNode",
        position: { x: 450, y: 250 },
        data: {
          nodeType: "task",
          title: "Dynamic Programming Patterns",
          content: "Understand Grid DP, Knapsack, Interval, and Digit DP. Focus on state transitions.",
          status: "in-progress",
          priority: "high"
        }
      },
      {
        id: "deadline-1",
        type: "customNode",
        position: { x: 250, y: 430 },
        data: {
          nodeType: "deadline",
          title: "Weekly Contest Target: <2000",
          content: "Participate in 3 consecutive contests and keep rank below 2000.",
          dueDate: "2026-07-15T10:00:00.000Z",
          warningThreshold: 24
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 750, y: 120 },
        data: {
          nodeType: "note",
          title: "Algorithm Cheat Sheets",
          content: "DP Memoization:\nInitialize memo array with -1.\nDFS helper state representation: dfs(index, count).\nSpace optimization templates.",
          tags: ["leetcode", "dsa", "notes"]
        }
      }
    ],
    edges: [
      { id: "e-goal-task1", source: "goal-1", target: "task-1" },
      { id: "e-goal-task2", source: "goal-1", target: "task-2" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" }
    ]
  },
  "Semester Planner": {
    name: "Semester Planner",
    description: "Manage academic assignments, midterms, projects, and office hours to maintain high performance.",
    nodes: [
      {
        id: "goal-1",
        type: "customNode",
        position: { x: 250, y: 50 },
        data: {
          nodeType: "goal",
          title: "Maintain 9.0+ CGPA",
          content: "Target straight-A grades. Maximize project scores and actively clear queries during office hours.",
          progress: 60,
          dueDate: "2026-07-30"
        }
      },
      {
        id: "task-1",
        type: "customNode",
        position: { x: 50, y: 250 },
        data: {
          nodeType: "task",
          title: "Operating Systems Assignment",
          content: "Implement a custom thread scheduler in C/C++. Fix race conditions using mutexes.",
          status: "in-progress",
          priority: "high"
        }
      },
      {
        id: "task-2",
        type: "customNode",
        position: { x: 450, y: 250 },
        data: {
          nodeType: "task",
          title: "Machine Learning Theory Prep",
          content: "Revise backpropagation derivation, Support Vector Machine math, and K-Means clustering.",
          status: "todo",
          priority: "high"
        }
      },
      {
        id: "deadline-1",
        type: "customNode",
        position: { x: 250, y: 430 },
        data: {
          nodeType: "deadline",
          title: "Final Term Project Submission",
          content: "Submit clean repository, documentation, and 5-page report for Database Systems project.",
          dueDate: "2026-06-30T18:00:00.000Z",
          warningThreshold: 48
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 750, y: 120 },
        data: {
          nodeType: "note",
          title: "Professor Contact Info",
          content: "OS Office Hours:\n- Tue/Thu 4-5pm (Room 402)\n- Email: os-prof@uni.edu\n\nML Office Hours:\n- Mon/Wed 2-3:30pm (Room 511)",
          tags: ["academics", "schedule"]
        }
      }
    ],
    edges: [
      { id: "e-goal-task1", source: "goal-1", target: "task-1" },
      { id: "e-goal-task2", source: "goal-1", target: "task-2" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" }
    ]
  },
  "Hackathon Planner": {
    name: "Hackathon Planner",
    description: "Organize feature scoping, rapid prototyping, and submission timelines for high-pressure hackathons.",
    nodes: [
      {
        id: "goal-1",
        type: "customNode",
        position: { x: 250, y: 50 },
        data: {
          nodeType: "goal",
          title: "Deliver Working MVP",
          content: "Build fully functional Next.js + React Flow MVP with persistence and zero console errors.",
          progress: 15,
          dueDate: "2026-06-14"
        }
      },
      {
        id: "task-1",
        type: "customNode",
        position: { x: 50, y: 250 },
        data: {
          nodeType: "task",
          title: "Setup & DB Connections",
          content: "Install Tailwind v4, shadcn templates. Setup Mongoose schema and test actions.",
          status: "done",
          priority: "high"
        }
      },
      {
        id: "task-2",
        type: "customNode",
        position: { x: 450, y: 250 },
        data: {
          nodeType: "task",
          title: "Implement Flow Editor",
          content: "Create React Flow canvas, setup custom single node template, double persistence (DB + localStorage).",
          status: "in-progress",
          priority: "high"
        }
      },
      {
        id: "deadline-1",
        type: "customNode",
        position: { x: 250, y: 430 },
        data: {
          nodeType: "deadline",
          title: "Devpost Submission Deadline",
          content: "Upload video demo (max 2 min), repository link, and project overview description.",
          dueDate: "2026-06-14T09:00:00.000Z",
          warningThreshold: 12
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 750, y: 120 },
        data: {
          nodeType: "note",
          title: "Pitch Slide Outline",
          content: "1. Headline hook\n2. Problem Statement\n3. Solution (Show Canvas + Persistence)\n4. Tech Stack details\n5. Future Vision (Phase 2 AI Second Brain)",
          tags: ["hackathon", "pitch", "slides"]
        }
      }
    ],
    edges: [
      { id: "e-goal-task1", source: "goal-1", target: "task-1" },
      { id: "e-goal-task2", source: "goal-1", target: "task-2" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" }
    ]
  }
};
