export interface ConflictInfo {
  nodeId: string;
  type: "same-day-overload" | "overlapping-priorities" | "task-bottleneck";
  severity: "high" | "medium";
  message: string;
  rescheduleSuggestion: string;
}

/**
 * Normalizes a date to YYYY-MM-DD for calendar day comparisons
 */
function getLocalDateString(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export function detectDeadlineConflicts(nodes: any[], edges: any[]): Record<string, ConflictInfo[]> {
  const conflictsMap: Record<string, ConflictInfo[]> = {};
  
  // Filter out deadline nodes with valid due dates
  const deadlineNodes = nodes.filter(
    (n) => n.data?.nodeType === "deadline" && n.data?.dueDate
  );
  
  if (deadlineNodes.length === 0) return conflictsMap;
  
  // 1. Detect Same-day deadline overload
  // Group deadlines by normalized local date string
  const dateGroups: Record<string, any[]> = {};
  deadlineNodes.forEach((node) => {
    const dateStr = getLocalDateString(node.data.dueDate);
    if (!dateStr) return;
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = [];
    }
    dateGroups[dateStr].push(node);
  });
  
  Object.entries(dateGroups).forEach(([dateStr, group]) => {
    if (group.length > 1) {
      // Overload detected!
      group.forEach((node) => {
        if (!conflictsMap[node.id]) conflictsMap[node.id] = [];
        conflictsMap[node.id].push({
          nodeId: node.id,
          type: "same-day-overload",
          severity: "high",
          message: `Same-day deadline overload: ${group.length} deadlines scheduled on ${new Date(dateStr).toLocaleDateString()}`,
          rescheduleSuggestion: `Move this deadline by 1-2 days to balance your cognitive workload.`
        });
      });
    }
  });
  
  // 2. Detect Overlapping priorities (High priority deadlines due within 48 hours of each other)
  // Sort deadlines by date to perform O(N log N) sliding window search
  const sortedDeadlines = [...deadlineNodes].sort((a, b) => {
    return new Date(a.data.dueDate).getTime() - new Date(b.data.dueDate).getTime();
  });
  
  for (let i = 0; i < sortedDeadlines.length; i++) {
    const nodeA = sortedDeadlines[i];
    const timeA = new Date(nodeA.data.dueDate).getTime();
    
    for (let j = i + 1; j < sortedDeadlines.length; j++) {
      const nodeB = sortedDeadlines[j];
      const timeB = new Date(nodeB.data.dueDate).getTime();
      const diffMs = timeB - timeA; // since sorted, timeB is always >= timeA
      const diffHours = diffMs / (1000 * 60 * 60);
      
      // Since deadlines are sorted, once we see a difference > 48h, all subsequent elements will also be > 48h
      if (diffHours > 48) break;
      
      const isHighA = nodeA.data.priority === "high" || nodeA.data.warningThreshold <= 24;
      const isHighB = nodeB.data.priority === "high" || nodeB.data.warningThreshold <= 24;
      
      if (isHighA || isHighB) {
        if (!conflictsMap[nodeA.id]) conflictsMap[nodeA.id] = [];
        if (!conflictsMap[nodeB.id]) conflictsMap[nodeB.id] = [];
        
        conflictsMap[nodeA.id].push({
          nodeId: nodeA.id,
          type: "overlapping-priorities",
          severity: "medium",
          message: `Overlapping priority: due within ${Math.round(diffHours)} hours of "${nodeB.data.title || 'Untitled'}"`,
          rescheduleSuggestion: `Reschedule one of these deadlines to create a buffer period.`
        });
        
        conflictsMap[nodeB.id].push({
          nodeId: nodeB.id,
          type: "overlapping-priorities",
          severity: "medium",
          message: `Overlapping priority: due within ${Math.round(diffHours)} hours of "${nodeA.data.title || 'Untitled'}"`,
          rescheduleSuggestion: `Reschedule one of these deadlines to create a buffer period.`
        });
      }
    }
  }
  
  // 3. Detect Bottlenecks: Too many tasks before a deadline
  // A deadline node has >= 3 uncompleted tasks connected to it
  deadlineNodes.forEach((node) => {
    // Find edges connected to this deadline
    const connectedEdges = edges.filter(
      (e) => e.source === node.id || e.target === node.id
    );
    
    // Find the other nodes in these edges
    const connectedNodeIds = connectedEdges.map((e) =>
      e.source === node.id ? e.target : e.source
    );
    
    // Filter these nodes to only uncompleted tasks
    const uncompletedTasks = nodes.filter(
      (n) =>
        connectedNodeIds.includes(n.id) &&
        n.data?.nodeType === "task" &&
        n.data?.status !== "done"
    );
    
    if (uncompletedTasks.length >= 3) {
      if (!conflictsMap[node.id]) conflictsMap[node.id] = [];
      conflictsMap[node.id].push({
        nodeId: node.id,
        type: "task-bottleneck",
        severity: "high",
        message: `Task bottleneck: ${uncompletedTasks.length} uncompleted tasks are blocked before this deadline.`,
        rescheduleSuggestion: `Complete or delegate some tasks: "${uncompletedTasks.slice(0, 2).map(t => t.data.title).join('", "')}"...`
      });
    }
  });
  
  return conflictsMap;
}
