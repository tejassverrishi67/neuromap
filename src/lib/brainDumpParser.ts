export interface ParsedNode {
  id: string;
  nodeType: "goal" | "task" | "deadline" | "note";
  title: string;
  content: string;
  dueDate?: string; // ISO String
  status?: "todo" | "in-progress" | "done";
  priority?: "low" | "medium" | "high";
  warningThreshold?: number;
  tags?: string[];
  confidence: number; // 0.0 to 1.0
  sentenceIndex?: number; // Tracks parent sentence/clause index
}

/**
 * Calculates the date of the next occurrence of a given day of the week
 */
function getNextDayOfWeek(dayName: string): Date {
  const days: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };
  
  const targetDay = days[dayName.toLowerCase()];
  if (targetDay === undefined) return new Date();
  
  const resultDate = new Date();
  const today = resultDate.getDay();
  
  let steps = targetDay - today;
  if (steps <= 0) {
    steps += 7; // Target is next week's day
  }
  
  resultDate.setDate(resultDate.getDate() + steps);
  // Set to end of day
  resultDate.setHours(23, 59, 59, 999);
  return resultDate;
}

/**
 * Attempts to parse relative or absolute date descriptions into an ISO string
 */
function parseRelativeDate(text: string): Date | null {
  const cleaned = text.toLowerCase();
  
  if (cleaned.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0); // 6 PM tomorrow
    return d;
  }
  
  if (cleaned.includes("next week")) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(12, 0, 0, 0); // Noon next week
    return d;
  }
  
  if (cleaned.includes("next month")) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  // Check for days of the week: "by Sunday", "on Friday"
  const dayMatch = cleaned.match(/\b(by|on|before)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/);
  if (dayMatch) {
    return getNextDayOfWeek(dayMatch[2]);
  }
  
  // Generic week days if "by/on" is missing but day name is present (using word boundaries to avoid false substring matches like "money" or "friend")
  const weekDays = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "sun", "mon", "tue", "wed", "thu", "fri", "sat"
  ];
  for (const day of weekDays) {
    const rx = new RegExp(`\\b${day}\\b`, 'i');
    if (rx.test(cleaned)) {
      return getNextDayOfWeek(day);
    }
  }

  // Match absolute date format like "June 20", "20 June", "6/20/2026", "2026-06-20"
  const dateRegex = /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b|\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/;
  const match = cleaned.match(dateRegex);
  if (match) {
    try {
      const parsed = Date.parse(match[0]);
      if (!isNaN(parsed)) {
        return new Date(parsed);
      }
    } catch {
      // Ignore parsing errors
    }
  }
  
  return null;
}

/**
 * Splits the brain dump text into individual task/goal/note clauses
 */
function splitIntoClauses(text: string): string[] {
  if (!text) return [];
  
  // 1. First split by major line breaks and sentence enders
  const sentences = text
    .split(/(?:[.!?]|\r?\n)+/)
    .map(s => s.trim())
    .filter(Boolean);
    
  const clauses: string[] = [];
  
  // 2. Further split lists, or complex sentences using commas and coordinating conjunctions
  // e.g. "complete DSA before placements, and build my portfolio"
  // Split on commas followed by action words/conjunctions
  const splitPattern = /\s*(?:, and|, also|, then|,)\s+(?=i\b|we\b|need\b|want\b|complete\b|prepare\b|finish\b|update\b|do\b|study\b|write\b|make\b|start\b|go\b|check\b|refactor\b)/i;
  
  for (const sentence of sentences) {
    // If it is a bulleted list, don't split by commas too aggressively
    if (sentence.startsWith("-") || sentence.startsWith("*") || /^\d+\./.test(sentence)) {
      clauses.push(sentence.replace(/^[-*\d.\s]+/, "").trim());
      continue;
    }
    
    const parts = sentence.split(splitPattern).map(p => p.trim()).filter(Boolean);
    clauses.push(...parts);
  }
  
  return clauses;
}

/**
 * Clean clause by removing common prefix clutter
 */
function cleanClause(text: string): string {
  let cleaned = text;
  
  // Remove starting fillers/pronouns
  const fillers = [
    /^(?:i\s+)?need\s+to\s+/i,
    /^(?:i\s+)?want\s+to\s+/i,
    /^should\s+/i,
    /^please\s+/i,
    /^also\s+/i,
    /^and\s+/i,
    /^then\s+/i,
    /^to\s+/i,
    /^let's\s+/i,
    /^must\s+/i
  ];
  
  let changed = true;
  while (changed) {
    changed = false;
    for (const rx of fillers) {
      if (rx.test(cleaned)) {
        cleaned = cleaned.replace(rx, "");
        changed = true;
      }
    }
  }
  
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

export function parseBrainDump(text: string): ParsedNode[] {
  const clauses = splitIntoClauses(text);
  const parsedNodes: ParsedNode[] = [];
  
  // Current time references
  const now = new Date();
  
  clauses.forEach((rawClause, index) => {
    const cleaned = cleanClause(rawClause);
    if (cleaned.length < 3) return; // Skip trivial fragments
    
    const lowerText = rawClause.toLowerCase();
    
    // 1. Detect relative dates for deadline extraction
    const detectedDate = parseRelativeDate(lowerText);
    
    // 2. Identify type based on verbs, structure, and keywords
    const isGoalWord = /\b(goal|placement|placements|career|portfolio|roadmap|timeline|target|achieve|become|promotion|quarter|q[1-4]|semester)\b/i.test(lowerText);
    const isDeadlineWord = /\b(by|before|due|deadline|exam|midterm|test|quiz|submission|submit)\b/i.test(lowerText);
    const isTaskWord = /\b(complete|prepare|finish|build|do|study|write|implement|fix|read|make|refactor|design|code|develop|setup)\b/i.test(lowerText);
    const isNoteWord = /\b(note|remember|info|links|references|ideas|thoughts|meeting notes|contact)\b/i.test(lowerText);
    
    // Heuristic Classification
    if (detectedDate && isTaskWord) {
      // 1. Create Task Node
      let taskTitle = cleaned
        .replace(/\b(?:by|on|before|due)\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i, "")
        .replace(/\b(?:by|on|before|due)\s+next\s+week\b/i, "")
        .replace(/\b(?:by|on|before|due)\s+next\s+month\b/i, "")
        .replace(/\b(?:by|on|before|due)\s+tomorrow\b/i, "")
        .replace(/\bnext\s+week\b/i, "")
        .replace(/\bnext\s+month\b/i, "")
        .replace(/\btomorrow\b/i, "")
        .replace(/\s+/g, " ")
        .trim();
      
      // Capitalize first letter of taskTitle
      if (taskTitle.length > 0) {
        taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);
      }
      
      if (taskTitle.length > 60) {
        const cutoff = taskTitle.indexOf(" ", 50);
        if (cutoff !== -1) {
          taskTitle = taskTitle.substring(0, cutoff).trim();
        }
      }

      // Priority cues
      let taskPriority: "low" | "medium" | "high" = "medium";
      if (lowerText.includes("urgent") || lowerText.includes("asap") || lowerText.includes("important") || lowerText.includes("exam") || lowerText.includes("placement")) {
        taskPriority = "high";
      } else if (lowerText.includes("later") || lowerText.includes("someday") || lowerText.includes("low priority")) {
        taskPriority = "low";
      }

      // Status cues
      let taskStatus: "todo" | "in-progress" | "done" = "todo";
      if (lowerText.includes("completed") || lowerText.includes("done") || lowerText.includes("finished")) {
        taskStatus = "done";
      } else if (lowerText.includes("working on") || lowerText.includes("doing") || lowerText.includes("progress")) {
        taskStatus = "in-progress";
      }

      parsedNodes.push({
        id: `parsed-task-${index}-${Date.now()}`,
        nodeType: "task",
        title: taskTitle || "Untitled Task",
        content: `Task extracted from: "${rawClause}"`,
        status: taskStatus,
        priority: taskPriority,
        warningThreshold: 24,
        sentenceIndex: index,
        confidence: 0.88
      });

      // 2. Create Deadline Node
      let deadlineTitle = "Sunday Deadline"; // default fallback
      if (lowerText.includes("tomorrow")) {
        deadlineTitle = "Tomorrow Deadline";
      } else if (lowerText.includes("next week")) {
        deadlineTitle = "Next Week Deadline";
      } else if (lowerText.includes("next month")) {
        deadlineTitle = "Next Month Deadline";
      } else {
        const dayMatch = lowerText.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i);
        if (dayMatch) {
          const matchedDay = dayMatch[1].toLowerCase();
          const fullDayNames: Record<string, string> = {
            sun: "Sunday", sunday: "Sunday",
            mon: "Monday", monday: "Monday",
            tue: "Tuesday", tuesday: "Tuesday",
            wed: "Wednesday", wednesday: "Wednesday",
            thu: "Thursday", thursday: "Thursday",
            fri: "Friday", friday: "Friday",
            sat: "Saturday", saturday: "Saturday"
          };
          deadlineTitle = `${fullDayNames[matchedDay] || "Sunday"} Deadline`;
        } else {
          deadlineTitle = "Submissions Deadline";
        }
      }

      parsedNodes.push({
        id: `parsed-deadline-${index}-${Date.now()}-dl`,
        nodeType: "deadline",
        title: deadlineTitle,
        content: `Deadline for: "${taskTitle}"`,
        dueDate: detectedDate.toISOString(),
        warningThreshold: 24,
        sentenceIndex: index,
        confidence: 0.90
      });

    } else {
      // Single Node Extraction
      let nodeType: "goal" | "task" | "deadline" | "note" = "task";
      let title = cleaned;
      let content = "";
      let confidence = 0.5;
      let priority: "low" | "medium" | "high" = "medium";
      let status: "todo" | "in-progress" | "done" = "todo";
      let dueDate: string | undefined = undefined;
      let tags: string[] = [];

      if (detectedDate) {
        dueDate = detectedDate.toISOString();
      }

      if (isDeadlineWord && detectedDate) {
        nodeType = "deadline";
        confidence = 0.90;
        title = cleaned
          .replace(/\b(?:by|on|before|due)\s+(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i, "")
          .replace(/\b(?:by|on|before|due)\s+next\s+week\b/i, "")
          .replace(/\b(?:by|on|before|due)\s+next\s+month\b/i, "")
          .replace(/\b(?:by|on|before|due)\s+tomorrow\b/i, "")
          .replace(/\bnext\s+week\b/i, "")
          .replace(/\bnext\s+month\b/i, "")
          .replace(/\btomorrow\b/i, "")
          .replace(/\s+/g, " ")
          .trim();
        content = `Extracted from: "${rawClause}"`;
      } else if (isGoalWord && !isDeadlineWord && (lowerText.includes("before") || lowerText.includes("timeline") || lowerText.includes("target") || lowerText.includes("finish"))) {
        nodeType = "goal";
        confidence = 0.85;
        content = `Goal target extracted from thoughts.`;
      } else if (isTaskWord) {
        nodeType = "task";
        confidence = 0.88;
        if (lowerText.includes("urgent") || lowerText.includes("asap") || lowerText.includes("important") || lowerText.includes("exam") || lowerText.includes("placement")) {
          priority = "high";
        } else if (lowerText.includes("later") || lowerText.includes("someday") || lowerText.includes("low priority")) {
          priority = "low";
        }
        if (lowerText.includes("completed") || lowerText.includes("done") || lowerText.includes("finished")) {
          status = "done";
        } else if (lowerText.includes("working on") || lowerText.includes("doing") || lowerText.includes("progress")) {
          status = "in-progress";
        }
        content = "";
      } else if (isNoteWord || (!isGoalWord && !isTaskWord && !isDeadlineWord)) {
        nodeType = "note";
        confidence = 0.75;
        const tagMatches = lowerText.match(/\b(dsa|leetcode|hackathon|exam|dbms|portfolio|placement|academics|career|study|personal)\b/g);
        if (tagMatches) {
          tags = Array.from(new Set(tagMatches));
        }
      } else {
        nodeType = "task";
        confidence = 0.65;
      }

      if (title.length > 60) {
        const cutoff = title.indexOf(" ", 50);
        if (cutoff !== -1) {
          content = title.substring(cutoff).trim();
          title = title.substring(0, cutoff).trim();
        }
      }

      parsedNodes.push({
        id: `parsed-${nodeType}-${index}-${Date.now()}`,
        nodeType,
        title: title || "Untitled Item",
        content: content,
        dueDate,
        status,
        priority,
        warningThreshold: 24,
        tags: tags.length > 0 ? tags : undefined,
        sentenceIndex: index,
        confidence: Math.round(confidence * 100) / 100
      });
    }
  });
  
  return parsedNodes;
}

/**
 * Generates beautiful non-overlapping layout positions in columns by type
 */
export function generateNodeLayout(nodes: ParsedNode[]): any[] {
  const columnSpacing = 350; // horizontal spacing between columns
  const rowSpacing = 220;    // vertical spacing between nodes
  
  const columnMapping: Record<string, number> = {
    goal: 0,
    task: 1,
    deadline: 2,
    note: 3
  };
  
  // Track heights in each column
  const columnCounts: Record<string, number> = {
    goal: 0,
    task: 0,
    deadline: 0,
    note: 0
  };
  
  return nodes.map(parsed => {
    const colType = parsed.nodeType;
    const colIndex = columnMapping[colType];
    const rowIndex = columnCounts[colType];
    
    columnCounts[colType] += 1;
    
    const x = colIndex * columnSpacing;
    const y = rowIndex * rowSpacing;
    
    return {
      id: parsed.id,
      type: "customNode",
      position: { x, y },
      data: {
        nodeType: parsed.nodeType,
        title: parsed.title,
        content: parsed.content,
        status: parsed.status || "todo",
        priority: parsed.priority || "medium",
        progress: parsed.nodeType === "goal" ? 0 : undefined,
        dueDate: parsed.dueDate,
        warningThreshold: parsed.warningThreshold || 24,
        tags: parsed.tags || []
      }
    };
  });
}
