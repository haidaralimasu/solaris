export type CallNode = {
  programId: string;
  programName: string | null;
  depth: number;
  status: "success" | "failed" | "unknown";
  failReason?: string;
  computeUnits?: number;
  logs: string[];
  children: CallNode[];
};

export function buildCallTrace(
  logs: string[],
  getProgramName: (id: string) => string | null
): CallNode[] {
  const roots: CallNode[] = [];
  const stack: CallNode[] = [];

  const top = () => stack[stack.length - 1] ?? null;

  for (const line of logs) {
    // Program X invoke [N]
    const invokeMatch = line.match(/^Program (\S+) invoke \[(\d+)\]$/);
    if (invokeMatch) {
      const [, programId, depthStr] = invokeMatch;
      const depth = parseInt(depthStr, 10);
      const node: CallNode = {
        programId,
        programName: getProgramName(programId),
        depth,
        status: "unknown",
        logs: [],
        children: [],
      };
      if (depth === 1) {
        roots.push(node);
      } else {
        top()?.children.push(node);
      }
      stack.push(node);
      continue;
    }

    // Program X consumed N of M compute units
    const cuMatch = line.match(
      /^Program (\S+) consumed (\d+) of (\d+) compute units$/
    );
    if (cuMatch) {
      const [, , usedStr] = cuMatch;
      const t = top();
      if (t) t.computeUnits = parseInt(usedStr, 10);
      continue;
    }

    // Program X success
    const successMatch = line.match(/^Program (\S+) success$/);
    if (successMatch) {
      const node = stack.pop();
      if (node) node.status = "success";
      continue;
    }

    // Program X failed: reason
    const failedMatch = line.match(/^Program (\S+) failed: (.+)$/);
    if (failedMatch) {
      const [, , reason] = failedMatch;
      const node = stack.pop();
      if (node) {
        node.status = "failed";
        node.failReason = reason;
      }
      continue;
    }

    // Regular log line — attach to current frame
    const t = top();
    if (t && !line.startsWith("Program ")) {
      t.logs.push(line);
    }
  }

  return roots;
}
