import type { Edge, Node } from "@xyflow/react";
import {
  blockDisconnected,
  blockHeight,
  blockOutputs,
  edgeUsesOutput,
  loopChildPosition,
  loopFrameFor,
  type BlockData,
} from "@/components/WorkflowNode";

const NODE_W = 240;
const GAP_X = 80;
const GAP_Y = 16;
const COMPONENT_GAP = 48;

type Laid = { pos: Map<string, number>; top: number; bottom: number };

type GraphNode = Node<Record<string, unknown>>;

function isTrigger(node: GraphNode) {
  return node.data.trigger === true;
}

function cardOffset(node: GraphNode) {
  return node.type === "loop" || !isTrigger(node) ? 0 : 20;
}

function childrenIn(node: GraphNode, nodes: GraphNode[]) {
  return nodes.filter((item) => item.parentId === node.id);
}

function sizeOf(node: GraphNode, nodes: GraphNode[]) {
  if (node.type === "loop") {
    const frame = loopFrameFor(childrenIn(node, nodes));
    return { w: frame.width, h: frame.height };
  }
  return { w: NODE_W, h: blockHeight(node.data) };
}

export function nodesOverlap(nodes: GraphNode[]) {
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "";
    const group = groups.get(key);
    if (group) group.push(node);
    else groups.set(key, [node]);
  }
  for (const group of groups.values()) {
    for (let index = 0; index < group.length; index += 1) {
      const current = group[index];
      const currentSize = sizeOf(current, nodes);
      for (let otherIndex = index + 1; otherIndex < group.length; otherIndex += 1) {
        const other = group[otherIndex];
        const otherSize = sizeOf(other, nodes);
        const overlaps =
          current.position.x < other.position.x + otherSize.w &&
          other.position.x < current.position.x + currentSize.w &&
          current.position.y < other.position.y + otherSize.h &&
          other.position.y < current.position.y + currentSize.h;
        if (overlaps) return true;
      }
    }
  }
  return false;
}

function ownerId(id: string, byId: Map<string, GraphNode>) {
  const node = byId.get(id);
  if (node?.parentId && byId.has(node.parentId)) return node.parentId;
  return id;
}

function outputsOf(node: GraphNode) {
  const title = node.data.title;
  if (typeof title !== "string") return null;
  const config = node.data.config;
  return blockOutputs({
    title,
    config: config && typeof config === "object" ? (config as Record<string, string>) : undefined,
  });
}

function handleIndex(node: GraphNode, handle: string | null | undefined) {
  const outputs = outputsOf(node);
  if (!outputs?.length) return 0;
  if (!handle) return 0;
  const index = outputs.findIndex((output) => output.id === handle);
  return index < 0 ? outputs.length : index;
}

function loopOrder(loopId: string, nodes: GraphNode[], edges: Edge[]) {
  const kids = nodes.filter((node) => node.parentId === loopId);
  const ids = new Set(kids.map((node) => node.id));
  const inside = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const incoming = new Set(inside.map((edge) => edge.target));
  const ordered: GraphNode[] = [];
  const seen = new Set<string>();
  const starts = kids
    .filter((node) => !incoming.has(node.id))
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  const queue = starts.length > 0 ? starts : [...kids].sort((a, b) => a.position.x - b.position.x);
  const pending = [...queue];
  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || seen.has(current.id)) continue;
    seen.add(current.id);
    ordered.push(current);
    const nextIds = inside.filter((edge) => edge.source === current.id).map((edge) => edge.target);
    for (const nextId of nextIds) {
      const next = kids.find((node) => node.id === nextId);
      if (next && !seen.has(next.id)) pending.push(next);
    }
  }
  for (const kid of [...kids].sort((a, b) => a.position.x - b.position.x)) {
    if (!seen.has(kid.id)) ordered.push(kid);
  }
  return ordered;
}

export function tidyNodes<T extends GraphNode>(nodes: T[], edges: Edge[]): { nodes: T[]; bounds: { top: number; left: number; height: number } } | null {
  if (nodes.length === 0) return null;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const topLevel = nodes.filter((node) => !node.parentId || !byId.has(node.parentId));
  const topIds = new Set(topLevel.map((node) => node.id));

  const topEdges: Array<{ source: string; target: string; sourceHandle?: string | null }> = [];
  for (const edge of edges) {
    const source = ownerId(edge.source, byId);
    const target = ownerId(edge.target, byId);
    if (source === target || !topIds.has(source) || !topIds.has(target)) continue;
    if (topEdges.some((item) => item.source === source && item.target === target && item.sourceHandle === edge.sourceHandle)) continue;
    topEdges.push({ source, target, sourceHandle: edge.sourceHandle });
  }

  const predecessors = (id: string) => {
    const list: string[] = [];
    for (const edge of topEdges) {
      if (edge.target === id && edge.source !== id && !list.includes(edge.source)) list.push(edge.source);
    }
    return list;
  };

  const rank = new Map<string, number>();
  const ranking = new Set<string>();
  const rankOf = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    if (ranking.has(id)) return 0;
    ranking.add(id);
    const preds = predecessors(id);
    const value = preds.length === 0 ? 0 : Math.max(...preds.map((parent) => rankOf(parent) + 1));
    ranking.delete(id);
    rank.set(id, value);
    return value;
  };
  for (const node of topLevel) rankOf(node.id);

  const treeParent = (id: string) => {
    const preds = predecessors(id);
    if (preds.length === 0) return null;
    return preds.reduce((best, parent) => {
      const rankDelta = rankOf(parent) - rankOf(best);
      if (rankDelta !== 0) return rankDelta > 0 ? parent : best;
      const parentEdge = topEdges.find((edge) => edge.source === parent && edge.target === id);
      const bestEdge = topEdges.find((edge) => edge.source === best && edge.target === id);
      const parentNode = byId.get(parent);
      const bestNode = byId.get(best);
      const handleDelta =
        handleIndex(parentNode ?? byId.get(id)!, parentEdge?.sourceHandle) -
        handleIndex(bestNode ?? byId.get(id)!, bestEdge?.sourceHandle);
      if (handleDelta !== 0) return handleDelta < 0 ? parent : best;
      const parentY = parentNode?.position.y ?? 0;
      const bestY = bestNode?.position.y ?? 0;
      return parentY < bestY ? parent : best;
    });
  };

  const childrenOf = (id: string) => {
    const source = byId.get(id);
    return topEdges
      .filter((edge) => edge.source === id && treeParent(edge.target) === id)
      .sort((a, b) => {
        const handleDelta = handleIndex(source!, a.sourceHandle) - handleIndex(source!, b.sourceHandle);
        if (handleDelta !== 0) return handleDelta;
        return (byId.get(a.target)?.position.y ?? 0) - (byId.get(b.target)?.position.y ?? 0);
      })
      .map((edge) => edge.target)
      .filter((target, index, list) => list.indexOf(target) === index);
  };

  const heightOf = (id: string) => sizeOf(byId.get(id)!, nodes).h;

  const boundsOf = (pos: Map<string, number>, self: string): { top: number; bottom: number } => {
    let top = 0;
    let bottom = heightOf(self);
    for (const [id, y] of pos) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + heightOf(id));
    }
    return { top, bottom };
  };

  const relLayout = (id: string, stack: Set<string>): Laid => {
    if (stack.has(id) || !byId.has(id)) return { pos: new Map(), top: 0, bottom: 0 };
    stack.add(id);
    const node = byId.get(id)!;
    const pos = new Map<string, number>([[id, 0]]);
    const kids = childrenOf(id).filter((kid) => !stack.has(kid));
    if (kids.length === 0) {
      stack.delete(id);
      return { pos, top: 0, bottom: heightOf(id) };
    }
    if (kids.length === 1) {
      const child = relLayout(kids[0], stack);
      const childNode = byId.get(kids[0]);
      if (childNode && child.pos.has(kids[0])) {
        const childY = child.pos.get(kids[0]) ?? 0;
        const shift =
          node.type === "loop" || childNode.type === "loop"
            ? heightOf(id) / 2 - (childY + heightOf(kids[0]) / 2)
            : cardOffset(node) - (childY + cardOffset(childNode));
        for (const [childId, y] of child.pos) pos.set(childId, y + shift);
      }
      stack.delete(id);
      return { pos, ...boundsOf(pos, id) };
    }

    const laid = kids.map((kid) => ({ id: kid, laid: relLayout(kid, stack) })).filter((item) => item.laid.pos.size > 0);
    const total =
      laid.reduce((sum, item) => sum + (item.laid.bottom - item.laid.top), 0) + GAP_Y * Math.max(laid.length - 1, 0);
    const anchor = node.type === "loop" ? heightOf(id) / 2 : cardOffset(node) + 32;
    let cursor = anchor - total / 2;
    for (const item of laid) {
      const shift = cursor - item.laid.top;
      for (const [childId, y] of item.laid.pos) pos.set(childId, y + shift);
      cursor += item.laid.bottom - item.laid.top + GAP_Y;
    }
    stack.delete(id);
    return { pos, ...boundsOf(pos, id) };
  };

  const yOf = new Map<string, number>();
  const placed = new Set<string>();
  const roots = topLevel
    .filter((node) => treeParent(node.id) === null)
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
  let cursor = 0;
  const placeRoot = (id: string) => {
    if (placed.has(id)) return;
    const laid = relLayout(id, new Set());
    const shift = cursor - laid.top;
    for (const [nodeId, y] of laid.pos) {
      if (placed.has(nodeId)) continue;
      yOf.set(nodeId, y + shift);
      placed.add(nodeId);
    }
    cursor = (laid.pos.size > 0 ? laid.bottom : heightOf(id)) + shift + COMPONENT_GAP;
  };
  for (const root of roots) placeRoot(root.id);
  for (const node of [...topLevel].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)) {
    placeRoot(node.id);
  }

  const xOf = new Map<string, number>();
  const placingX = new Set<string>();
  const xFor = (id: string): number => {
    const known = xOf.get(id);
    if (known !== undefined) return known;
    if (placingX.has(id)) return 0;
    placingX.add(id);
    const preds = predecessors(id);
    const value =
      preds.length === 0 ? 0 : Math.max(...preds.map((parent) => xFor(parent) + sizeOf(byId.get(parent)!, nodes).w + GAP_X));
    placingX.delete(id);
    xOf.set(id, value);
    return value;
  };
  for (const node of topLevel) xFor(node.id);

  const descendantCache = new Map<string, Set<string>>();
  const descendants = (id: string, trail = new Set<string>()): Set<string> => {
    const known = descendantCache.get(id);
    if (known) return known;
    if (trail.has(id)) return new Set();
    trail.add(id);
    const into = new Set<string>();
    for (const kid of childrenOf(id)) {
      into.add(kid);
      for (const nested of descendants(kid, trail)) into.add(nested);
    }
    descendantCache.set(id, into);
    return into;
  };

  const box = (id: string) => {
    const size = sizeOf(byId.get(id)!, nodes);
    return { id, x: xOf.get(id) ?? 0, y: yOf.get(id) ?? 0, w: size.w, h: size.h };
  };
  const shiftDown = (id: string, delta: number) => {
    yOf.set(id, (yOf.get(id) ?? 0) + delta);
    for (const kid of descendants(id)) yOf.set(kid, (yOf.get(kid) ?? 0) + delta);
  };

  for (let guard = 0; guard < 24; guard += 1) {
    const extra = new Map<string, number>();
    const boxes = topLevel.map((node) => box(node.id)).sort((a, b) => a.y - b.y || a.x - b.x);
    for (let index = 0; index < boxes.length; index += 1) {
      for (let earlier = 0; earlier < index; earlier += 1) {
        const above = boxes[earlier];
        const below = boxes[index];
        const xOverlap = above.x < below.x + below.w + GAP_Y && below.x < above.x + above.w + GAP_Y;
        const push = above.y + above.h + GAP_Y - below.y;
        if (xOverlap && push > 0.5) extra.set(below.id, Math.max(extra.get(below.id) ?? 0, push));
      }
    }
    if (extra.size === 0) break;
    const shifted = [...extra.keys()];
    const lead = shifted.filter((id) => !shifted.some((other) => other !== id && descendants(other).has(id)));
    for (const id of lead) shiftDown(id, extra.get(id) ?? 0);
  }

  const childOrder = new Map<string, number>();
  for (const node of topLevel) {
    if (node.type !== "loop") continue;
    loopOrder(node.id, nodes, edges).forEach((child, index) => childOrder.set(child.id, index));
  }

  let changed = false;
  const next = nodes.map((node) => {
    const index = childOrder.get(node.id);
    if (index !== undefined) {
      const position = loopChildPosition(index);
      if (Math.abs(node.position.x - position.x) > 0.5 || Math.abs(node.position.y - position.y) > 0.5) changed = true;
      return { ...node, position };
    }
    if (!topIds.has(node.id)) return node;
    const position = { x: Math.round(xOf.get(node.id) ?? 0), y: Math.round(yOf.get(node.id) ?? 0) };
    if (Math.abs(node.position.x - position.x) > 0.5 || Math.abs(node.position.y - position.y) > 0.5) changed = true;
    if (node.type !== "loop") return { ...node, position };
    const frame = loopFrameFor(childrenIn(node, nodes));
    const width = Number(node.style?.width ?? 0);
    const height = Number(node.style?.height ?? 0);
    if (Math.abs(width - frame.width) > 0.5 || Math.abs(height - frame.height) > 0.5) changed = true;
    return { ...node, position, style: { ...node.style, width: frame.width, height: frame.height } };
  });

  if (!changed) return null;

  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  for (const node of next) {
    if (node.parentId && byId.has(node.parentId)) continue;
    const size = sizeOf(node, next);
    top = Math.min(top, node.position.y);
    bottom = Math.max(bottom, node.position.y + size.h);
    left = Math.min(left, node.position.x);
  }
  return { nodes: next, bounds: { top, left, height: Math.max(bottom - top, 0) } };
}

function linksOf(node: GraphNode, edges: Edge[]) {
  return {
    incoming: edges.some((edge) => edge.target === node.id),
    outgoing: edges.some((edge) => edge.source === node.id),
    nested: Boolean(node.parentId),
  };
}

export function blocksNeedFix(nodes: GraphNode[], edges: Edge[]) {
  return nodes.some((node) => {
    if (node.data.status === "disabled") return false;
    if (node.data.status === "error" || node.data.status === "configure") return true;
    return blockDisconnected(node.data as BlockData, linksOf(node, edges));
  });
}

function freeOutputs(node: GraphNode, edges: Edge[]) {
  if (node.data.title === "Stop") return [];
  const outputs = outputsOf(node);
  const fromNode = edges.filter((edge) => edge.source === node.id);
  if (!outputs) return fromNode.length > 0 ? [] : [undefined];
  return outputs.filter((output) => !fromNode.some((edge) => edgeUsesOutput(edge, output.id, outputs))).map((output) => output.id);
}

function reaches(edges: Edge[], from: string, to: string, seen = new Set<string>()): boolean {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  return edges.some((edge) => edge.source === from && reaches(edges, edge.target, to, seen));
}

function connectGroup(nodes: GraphNode[], edges: Edge[]) {
  const ids = new Set(nodes.map((node) => node.id));
  const local = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const added: Edge[] = [];
  const current = () => [...local, ...added];
  const targets = nodes
    .filter((node) => node.data.trigger !== true && node.data.starter !== true && !current().some((edge) => edge.target === node.id))
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);

  for (const target of targets) {
    const sources = nodes
      .filter((node) => node.id !== target.id && freeOutputs(node, current()).length > 0 && !reaches(current(), target.id, node.id))
      .sort((a, b) => {
        const aSide = a.position.x <= target.position.x + 8 ? 0 : 1;
        const bSide = b.position.x <= target.position.x + 8 ? 0 : 1;
        if (aSide !== bSide) return aSide - bSide;
        const aDistance = Math.hypot(a.position.x - target.position.x, a.position.y - target.position.y);
        const bDistance = Math.hypot(b.position.x - target.position.x, b.position.y - target.position.y);
        return aDistance - bDistance;
      });
    const source = sources[0];
    if (!source) continue;
    const handle = freeOutputs(source, current())[0];
    added.push({
      id: `e-${source.id}-${target.id}${handle ? `-${handle}` : ""}`,
      source: source.id,
      target: target.id,
      sourceHandle: handle,
      type: "flow",
    });
  }
  return added;
}

function graphBounds(nodes: GraphNode[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) continue;
    const size = sizeOf(node, nodes);
    top = Math.min(top, node.position.y);
    bottom = Math.max(bottom, node.position.y + size.h);
    left = Math.min(left, node.position.x);
  }
  return { top: Number.isFinite(top) ? top : 0, left: Number.isFinite(left) ? left : 0, height: Number.isFinite(top) ? Math.max(bottom - top, 0) : 0 };
}

export function repairWorkflow<T extends GraphNode>(nodes: T[], edges: Edge[]) {
  if (!blocksNeedFix(nodes, edges)) return null;
  const groups = new Map<string, T[]>();
  for (const node of nodes) {
    const key = node.parentId ?? "";
    const group = groups.get(key) ?? [];
    group.push(node);
    groups.set(key, group);
  }
  const added = [...groups.values()].flatMap((group) => connectGroup(group, edges));
  const nextEdges = [...edges, ...added];
  let statusChanged = false;
  const cleared = nodes.map((node) => {
    const status = node.data.status;
    if (status !== "error" && status !== "configure") return node;
    if (blockDisconnected(node.data as BlockData, linksOf(node, nextEdges))) return node;
    statusChanged = true;
    return { ...node, data: { ...node.data, status: "ok" } };
  });
  if (added.length === 0 && !statusChanged) return null;
  const laid = tidyNodes(cleared, nextEdges);
  return { nodes: laid?.nodes ?? cleared, edges: nextEdges, bounds: laid?.bounds ?? graphBounds(cleared) };
}
