import { ICanvasNode, ICanvasEdge } from "@/models/Canvas";

export interface CanvasTemplate {
  name: string;
  description: string;
  nodes: any[];
  edges: ICanvasEdge[];
}

// Helper to generate dynamic ISO strings for dates
const relativeDate = (daysOffset: number, hoursOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(d.getHours() + hoursOffset);
  return d.toISOString();
};

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
          dueDate: relativeDate(180)
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
          dueDate: relativeDate(90),
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
  "Placement Preparation": {
    name: "Placement Preparation",
    description: "Organize your algorithmic study plan, tracking progress on LeetCode questions and weekly contest ratings.",
    nodes: [
      {
        id: "goal-1",
        type: "customNode",
        position: { x: 350, y: 50 },
        data: {
          nodeType: "goal",
          title: "Solve 300 LC Questions",
          content: "Complete 150 Easy, 120 Medium, and 30 Hard questions across key patterns (trees, graphs, DP, intervals).",
          progress: 45,
          dueDate: relativeDate(90)
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
        position: { x: 350, y: 250 },
        data: {
          nodeType: "task",
          title: "Dynamic Programming Patterns",
          content: "Understand Grid DP, Knapsack, Interval, and Digit DP. Focus on state transitions.",
          status: "in-progress",
          priority: "high"
        }
      },
      {
        id: "task-3",
        type: "customNode",
        position: { x: 650, y: 250 },
        data: {
          nodeType: "task",
          title: "System Design Mock Interviews",
          content: "Conduct 5 mock interviews on key architectures (URL shortener, rate limiter, chat application).",
          status: "todo",
          priority: "medium"
        }
      },
      {
        id: "task-4",
        type: "customNode",
        position: { x: 950, y: 250 },
        data: {
          nodeType: "task",
          title: "Behavioral Prep & STAR Method",
          content: "Structure 8 core behavioral questions using the STAR framework. Align with leadership principles.",
          status: "todo",
          priority: "low"
        }
      },
      {
        id: "deadline-1",
        type: "customNode",
        position: { x: 350, y: 450 },
        data: {
          nodeType: "deadline",
          title: "Weekly Contest Target: <2000",
          content: "Participate in 3 consecutive contests and keep rank below 2000.",
          dueDate: relativeDate(30),
          warningThreshold: 24
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 350, y: 620 },
        data: {
          nodeType: "note",
          title: "Algorithm Cheat Sheets",
          content: "DP Memoization:\nInitialize memo array with -1.\nDFS helper state representation: dfs(index, count).\nSpace optimization templates.",
          tags: ["leetcode", "dsa", "notes"]
        }
      },
      {
        id: "note-2",
        type: "customNode",
        position: { x: 650, y: 620 },
        data: {
          nodeType: "note",
          title: "Mock Platforms",
          content: "Use Pramp and Interviewing.io for scheduling technical mock interviews.",
          tags: ["study", "mocks"]
        }
      }
    ],
    edges: [
      { id: "e-goal-task1", source: "goal-1", target: "task-1" },
      { id: "e-goal-task2", source: "goal-1", target: "task-2" },
      { id: "e-goal-task3", source: "goal-1", target: "task-3" },
      { id: "e-goal-task4", source: "goal-1", target: "task-4" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" },
      { id: "e-task2-note1", source: "task-2", target: "note-1" },
      { id: "e-task3-note2", source: "task-3", target: "note-2" }
    ]
  },
  "Semester Planning": {
    name: "Semester Planning",
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
          dueDate: relativeDate(45)
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
        id: "task-3",
        type: "customNode",
        position: { x: 750, y: 250 },
        data: {
          nodeType: "task",
          title: "Database Systems Term Project",
          content: "Designed and built relational schema with Node + PostgreSQL backend and indexes.",
          status: "done",
          priority: "medium"
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
          dueDate: relativeDate(15),
          warningThreshold: 48
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 50, y: 430 },
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
      { id: "e-goal-task3", source: "goal-1", target: "task-3" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" },
      { id: "e-task1-note1", source: "task-1", target: "note-1" }
    ]
  },
  "Hackathon Planning": {
    name: "Hackathon Planning",
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
          dueDate: relativeDate(3)
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
        id: "task-3",
        type: "customNode",
        position: { x: 750, y: 250 },
        data: {
          nodeType: "task",
          title: "Design Slide Pitch & Video Demo",
          content: "Create interactive Figma slide templates. Record a high-resolution 2-minute demo video.",
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
          title: "Devpost Submission Deadline",
          content: "Upload video demo (max 2 min), repository link, and project overview description.",
          dueDate: relativeDate(0, 12), // due in 12 hours
          warningThreshold: 24
        }
      },
      {
        id: "note-1",
        type: "customNode",
        position: { x: 750, y: 430 },
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
      { id: "e-goal-task3", source: "goal-1", target: "task-3" },
      { id: "e-goal-deadline1", source: "goal-1", target: "deadline-1" },
      { id: "e-task3-note1", source: "task-3", target: "note-1" }
    ]
  }
};
