"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  SelectionMode,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasHistoryActions } from "@/components/canvas-history";
import { useBlockCatalog } from "@/components/block-catalog";
import { useCanvasTool } from "@/components/canvas-tool";
import { SidePanel, isScheduleBlock, type AttentionItem, type WorkflowDetails } from "@/components/SidePanel";
import type { TriggerOption } from "@/components/TriggerMenu";
import { MAX_ZOOM, MIN_ZOOM } from "@/components/ZoomSlider";
import {
  LoopNode,
  WorkflowNode,
  blockDisconnected,
  blockHeight,
  blockOutputs,
  edgeUsesOutput,
  loopBlockData,
  loopChildPosition,
  loopFrame,
  loopFrameFor,
  placeBranchY,
  outputCenter,
  type BlockData,
} from "@/components/WorkflowNode";
import { WorkflowConnectionLine, WorkflowEdge, workflowEdgeCss } from "@/components/WorkflowEdge";

type CanvasNode = Node<BlockData, "block" | "loop">;

const nodeTypes = { block: WorkflowNode, loop: LoopNode };
const edgeTypes = { flow: WorkflowEdge, loop: WorkflowEdge };
const PANEL_CLEARANCE = 24;

function absoluteX(node: Node<BlockData>, nodes: Node<BlockData>[]) {
  let x = node.position.x;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = nodes.find((item) => item.id === parentId);
    if (!parent) break;
    x += parent.position.x;
    parentId = parent.parentId;
  }
  return x;
}

type BlockClip = { nodes: CanvasNode[]; edges: Edge[] };

let blockClipboard: BlockClip | null = null;
let pasteCount = 0;

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function nodeBox(node: CanvasNode) {
  if (node.type === "loop") {
    const width = Number(node.style?.width ?? 0);
    const height = Number(node.style?.height ?? 0);
    return { w: width || 322, h: height || 146 };
  }
  return { w: 240, h: blockHeight(node.data) };
}

function sameParent(a: { parentId?: string }, b: { parentId?: string }) {
  return (a.parentId ?? "") === (b.parentId ?? "");
}

function boxesOverlap(
  a: { position: { x: number; y: number } },
  aSize: { w: number; h: number },
  b: { position: { x: number; y: number } },
  bSize: { w: number; h: number },
) {
  return a.position.x < b.position.x + bSize.w && a.position.x + aSize.w > b.position.x && a.position.y < b.position.y + bSize.h && a.position.y + aSize.h > b.position.y;
}

function copyBlocks(selected: CanvasNode[], nodes: CanvasNode[], edges: Edge[]): BlockClip {
  const ids = new Set(selected.map((node) => node.id));
  const copied = nodes.filter((node) => ids.has(node.id) || (node.parentId ? ids.has(node.parentId) : false));
  const copiedIds = new Set(copied.map((node) => node.id));
  return {
    nodes: copied.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: structuredClone(node.data),
      ...(node.parentId ? { parentId: node.parentId } : {}),
      ...(node.style ? { style: structuredClone(node.style) } : {}),
    })),
    edges: edges
      .filter((edge) => copiedIds.has(edge.source) && copiedIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
      })),
  };
}

function pasteBlocks(clip: BlockClip, existing: CanvasNode[], generation: number) {
  const copiedIds = new Set(clip.nodes.map((node) => node.id));
  const idMap = new Map(clip.nodes.map((node) => [node.id, crypto.randomUUID()]));
  const roots = clip.nodes.filter((node) => !node.parentId || !copiedIds.has(node.parentId));
  let minX = Infinity;
  let maxRight = -Infinity;
  for (const node of roots) {
    const box = nodeBox(node);
    minX = Math.min(minX, node.position.x);
    maxRight = Math.max(maxRight, node.position.x + box.w);
  }
  const step = Math.max(maxRight - minX, 240) + 80;
  let shiftX = step * generation;
  let shiftY = 0;
  const shifted = () =>
    roots.map((node) => ({
      parentId: node.parentId && copiedIds.has(node.parentId) ? undefined : node.parentId,
      position: { x: node.position.x + shiftX, y: node.position.y + shiftY },
      box: nodeBox(node),
    }));
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const next = shifted();
    const hit = next.some((node) =>
      existing.some((other) => sameParent(node, other) && boxesOverlap(node, node.box, other, nodeBox(other))),
    );
    if (!hit) break;
    shiftY += 96;
  }
  const nodes = clip.nodes.map((node) => {
    const parentCopied = Boolean(node.parentId && copiedIds.has(node.parentId));
    const parentId = parentCopied ? idMap.get(node.parentId!) : node.parentId;
    return {
      id: idMap.get(node.id)!,
      type: node.type,
      position: parentCopied ? { x: node.position.x, y: node.position.y } : { x: node.position.x + shiftX, y: node.position.y + shiftY },
      data: { ...node.data, starter: false },
      ...(parentId ? { parentId } : {}),
      ...(node.style ? { style: structuredClone(node.style) } : {}),
      selected: !parentCopied,
    };
  });
  const edges = clip.edges.flatMap((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return [];
    const handle = edge.sourceHandle ? `-${edge.sourceHandle}` : "";
    return [{ id: `e-${source}-${target}${handle}`, source, target, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle, type: edge.type ?? "flow" }];
  });
  return { nodes, edges };
}

function terminalNode(nodes: Node<BlockData>[], edges: Edge[]) {
  const outgoing = new Set(edges.map((edge) => edge.source));
  const open = nodes.filter((node) => !outgoing.has(node.id));
  const pool = open.length > 0 ? open : nodes;
  return pool.reduce((best, node) => (absoluteX(node, nodes) > absoluteX(best, nodes) ? node : best));
}

function blockIssue(data: BlockData, disconnected: boolean) {
  const stored = data.status ?? "ok";
  if (stored === "disabled") return "This block is disabled";
  if (stored === "error") return data.summary.trim() || "This block has an error";
  if (disconnected) return "This block is not connected";
  if (stored === "configure") return "This block needs to be configured";
  return null;
}

function KeepInView({
  nodeCount,
  selectedId,
  collapsed,
}: {
  nodeCount: number;
  selectedId: string | null;
  collapsed: boolean;
}) {
  const { getViewport, setViewport } = useReactFlow();

  useLayoutEffect(() => {
    let frame = 0;
    let tries = 0;

    const tick = () => {
      if (!selectedId) return;
      const panel = document.querySelector("[data-canvas-panel]")?.getBoundingClientRect();
      const blocks = [...document.querySelectorAll<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(selectedId)}"]`)];
      if (!panel || blocks.length === 0 || blocks.some((block) => block.getBoundingClientRect().width === 0)) {
        if (tries++ < 12) frame = requestAnimationFrame(tick);
        return;
      }

      const limit = panel.left - PANEL_CLEARANCE;
      let shiftX = 0;
      for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        const overlaps = rect.bottom > panel.top && rect.top < panel.bottom && rect.right > limit;
        if (overlaps) shiftX = Math.min(shiftX, limit - rect.right);
      }

      const focusSelected = () => {
        if (!selectedId) return;
        document
          .querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(selectedId)}"]`)
          ?.focus({ preventScroll: true });
      };
      focusSelected();

      if (shiftX === 0) return;
      const viewport = getViewport();
      const zoom = viewport.zoom || 1;
      void setViewport(
        { x: viewport.x + shiftX / zoom, y: viewport.y, zoom },
        { duration: 380, interpolate: "smooth" },
      ).then(focusSelected);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [nodeCount, selectedId, collapsed, getViewport, setViewport]);

  return null;
}

const initialNodes: Node<BlockData, "block">[] = [
  {
    id: "quote-signed",
    type: "block",
    position: { x: 0, y: 0 },
    data: {
      title: "Quote signed",
      summary: "Any amount",
      trigger: true,
      status: "ok",
    },
  },
];

const initialEdges: Edge[] = [];

export function WorkflowCanvas({
  seed,
  revealed = false,
  onReveal,
  onNameChange,
}: {
  revealed?: boolean;
  onReveal?: () => void;
  onNameChange?: (name: string) => void;
  seed?: {
    name: string;
    description: string;
    nodes: Node<BlockData, "block" | "loop">[];
    edges: Edge[];
    prompt?: string;
    lines?: string[];
  };
}) {
  const { tool } = useCanvasTool();
  const { open: catalogOpen, show: showCatalog, hide: hideCatalog } = useBlockCatalog();
  const branchRef = useRef<string | undefined>(undefined);
  const { getViewport, setViewport } = useReactFlow();
  const { adopt } = useCanvasHistoryActions();
  const selecting = tool === "cursor";
  const staged = Boolean(seed?.lines?.length);
  const centerFirstBlock = Boolean(seed && !staged && seed.nodes.length === 1);
  const centerNodeRef = useRef(centerFirstBlock ? seed?.nodes[0] : null);
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(staged ? [] : (seed?.nodes ?? initialNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(staged ? [] : (seed?.edges ?? initialEdges));
  const [collapsed, setCollapsed] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowDetails>({
    name: seed?.name ?? "Overdue invoice reminders",
    description: seed?.description ?? "Remind customers when an invoice is late",
  });
  const onNameChangeRef = useRef(onNameChange);
  onNameChangeRef.current = onNameChange;
  useEffect(() => {
    onNameChangeRef.current?.(workflow.name);
  }, [workflow.name]);
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge(connection, current));
    },
    [setEdges],
  );
  useEffect(() => {
    const current = seedRef.current;
    if (!revealed || !current?.lines?.length) return;
    setNodes(current.nodes);
    setEdges(current.edges);
    adopt();
    const frame = requestAnimationFrame(() => {
      const pane = document.querySelector(".react-flow")?.getBoundingClientRect();
      const y = pane ? Math.max(48, (pane.height - 64) / 2) : 120;
      void setViewport({ x: 72, y, zoom: 1 }, { duration: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [revealed, setNodes, setEdges, setViewport, adopt]);
  useEffect(() => {
    const node = centerNodeRef.current;
    if (!node) return;
    let frame = 0;
    let tries = 0;
    const place = () => {
      const pane = document.querySelector(".react-flow")?.getBoundingClientRect();
      const panel = document.querySelector("[data-canvas-panel]")?.getBoundingClientRect();
      if (!pane || pane.width === 0 || !panel || panel.width === 0) {
        if (tries++ < 12) frame = requestAnimationFrame(place);
        return;
      }
      const openRight = panel.height > pane.height * 0.5 ? panel.left - pane.left : pane.width;
      const height = blockHeight(node.data);
      void setViewport({ x: openRight / 2 - 120, y: (pane.height - height) / 2, zoom: 1 }, { duration: 0 });
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [setViewport]);
  const onPaneClick = useCallback(() => {
    setNodes((current) => current.map((node) => (node.selected ? { ...node, selected: false } : node)));
    hideCatalog();
  }, [setNodes, hideCatalog]);
  const selected = nodes.filter((node) => node.selected);
  const active = selected.length === 1 ? selected[0] : null;
  const attention = useMemo<AttentionItem[]>(() => {
    return nodes.flatMap((node) => {
      const incoming = edges.some((edge) => edge.target === node.id);
      const outgoing = edges.some((edge) => edge.source === node.id);
      const stored = node.data.status;
      if (stored === "disabled") return [];
      const disconnected = blockDisconnected(node.data, {
        incoming,
        outgoing,
        nested: Boolean(node.parentId),
      });
      const tone = stored === "error" ? "error" : stored === "configure" || disconnected ? "configure" : null;
      if (!tone) return [];
      return [
        {
          id: node.id,
          data: node.data,
          tone,
          detail: stored === "error" || stored === "configure" ? node.data.summary : "Not connected",
        },
      ];
    });
  }, [nodes, edges]);
  const updateBlock = useCallback(
    (patch: Partial<BlockData>) => {
      if (!active) return;
      setNodes((current) =>
        current.map((node) => {
          if (node.id !== active.id) return node;
          const data = { ...node.data, ...patch };
          if (isScheduleBlock(data) && (patch.frequency !== undefined || patch.time !== undefined || patch.timezone !== undefined)) {
            if (data.frequency && data.time) data.summary = `${data.frequency} at ${data.time}`;
          }
          return { ...node, data };
        }),
      );
      if (patch.config && "cases" in patch.config) {
        const outputs = blockOutputs({ ...active.data, ...patch });
        const ids = new Set(outputs?.map((output) => output.id));
        setEdges((current) =>
          current.filter(
            (edge) => edge.source !== active.id || !edge.sourceHandle || ids.has(edge.sourceHandle),
          ),
        );
      }
    },
    [active, setNodes, setEdges],
  );
  const selectBlock = useCallback(
    (id: string) => {
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          selected: node.id === id,
          className: node.id === id ? "attention-focus" : undefined,
        })),
      );
    },
    [setNodes],
  );
  useEffect(() => {
    setNodes((current) => {
      if (!current.some((node) => node.className === "attention-focus" && node.id !== active?.id)) return current;
      return current.map((node) =>
        node.className === "attention-focus" && node.id !== active?.id ? { ...node, className: undefined } : node,
      );
    });
  }, [active?.id, setNodes]);
  useEffect(() => {
    if (catalogOpen) setCollapsed(false);
  }, [catalogOpen]);
  const selectedId = active?.id ?? null;
  const selectedBefore = useRef(selectedId);
  useEffect(() => {
    if (selectedId && selectedId !== selectedBefore.current) setCollapsed(false);
    selectedBefore.current = selectedId;
  }, [selectedId]);
  const onNodeClick = useCallback(() => setCollapsed(false), []);
  useEffect(() => {
    hideCatalog();
  }, [active?.id, hideCatalog]);
  useEffect(() => {
    const loops = nodes.filter((node) => node.type === "loop");
    if (loops.length === 0) return;

    let nextNodes = nodes;
    let nodesChanged = false;
    let nextEdges = edges;
    let edgesChanged = false;

    for (const loop of loops) {
      const children = nextNodes
        .filter((node) => node.parentId === loop.id)
        .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
      const frame = loopFrameFor(children);
      const width = Number.parseFloat(String(loop.style?.width ?? 0));
      const height = Number.parseFloat(String(loop.style?.height ?? 0));
      if (Math.abs(width - frame.width) < 0.5 && Math.abs(height - frame.height) < 0.5) continue;

      nodesChanged = true;
      const indexById = new Map(children.map((child, index) => [child.id, index]));
      nextNodes = nextNodes.map((node) => {
        if (node.id === loop.id) return { ...node, style: { ...node.style, width: frame.width, height: frame.height } };
        const index = indexById.get(node.id);
        if (index === undefined) return node;
        return { ...node, position: loopChildPosition(index) };
      });
      for (let index = 0; index < children.length - 1; index += 1) {
        const source = children[index].id;
        const target = children[index + 1].id;
        if (nextEdges.some((edge) => edge.source === source && edge.target === target)) continue;
        edgesChanged = true;
        nextEdges = [...nextEdges, { id: `e-${source}-${target}`, source, target, type: "flow" }];
      }
    }

    if (nodesChanged) setNodes(nextNodes);
    if (edgesChanged) setEdges(nextEdges);
  }, [nodes, edges, setNodes, setEdges]);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || isTypingTarget(event.target)) return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "c" && key !== "v") return;
      if (key === "c") {
        const selected = nodesRef.current.filter((node) => node.selected);
        if (selected.length === 0 || window.getSelection()?.toString()) return;
        event.preventDefault();
        blockClipboard = copyBlocks(selected, nodesRef.current, edgesRef.current);
        pasteCount = 0;
        return;
      }
      if (!blockClipboard) return;
      event.preventDefault();
      pasteCount += 1;
      const result = pasteBlocks(blockClipboard, nodesRef.current, pasteCount);
      setNodes((current) => [...current.map((node) => (node.selected ? { ...node, selected: false } : node)), ...result.nodes]);
      if (result.edges.length > 0) setEdges((current) => [...current, ...result.edges]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setNodes, setEdges]);
  const addBlock = useCallback(
    (option: TriggerOption) => {
      const source = active ?? terminalNode(nodes, edges);
      const nextId = crypto.randomUUID();
      const blockData = {
        title: option.title,
        summary: option.description,
        input: true,
        status: "ok" as const,
        icon: option.icon,
        tone: option.tone,
        trigger: option.trigger,
      };
      const loopId = source.type === "loop" ? source.id : source.parentId;
      const outputs = blockOutputs(source.data);
      const requested = branchRef.current;
      branchRef.current = undefined;
      const sourceHandle = outputs
        ? outputs.some((output) => output.id === requested)
          ? requested
          : (outputs.find(
              (output) => !edges.some((edge) => edge.source === source.id && edgeUsesOutput(edge, output.id, outputs)),
            )?.id ?? outputs[0]?.id)
        : undefined;

      if (option.title === "Loop") {
        const anchor = source.parentId ? (nodes.find((node) => node.id === source.parentId) ?? source) : source;
        const anchorWidth = anchor.type === "loop" ? Number(anchor.style?.width ?? loopFrame(0).width) : 0;
        setNodes((current) => [
          ...current.map((node) => ({ ...node, selected: false, className: undefined })),
          {
            id: nextId,
            type: "loop" as const,
            position: {
              x: anchor.position.x + (anchor.type === "loop" ? anchorWidth + 80 : 320),
              y: anchor.position.y,
            },
            style: loopFrame(0),
            selected: true,
            data: loopBlockData(),
          },
        ]);
        const fromSource = anchor.id === source.id;
        setEdges((current) => [
          ...current.filter(
            (edge) => edge.source !== anchor.id || (fromSource && sourceHandle ? edge.sourceHandle !== sourceHandle : false),
          ),
          {
            id: `e-${anchor.id}-${nextId}`,
            source: anchor.id,
            sourceHandle: fromSource ? sourceHandle : undefined,
            target: nextId,
            type: "flow",
          },
        ]);
        hideCatalog();
        return;
      }

      if (loopId) {
        const siblings = nodes.filter((node) => node.parentId === loopId);
        const frame = loopFrameFor([...siblings, { data: blockData }]);
        const tail = [...siblings].reverse().find((node) => !edges.some((edge) => edge.source === node.id));
        setNodes((current) => [
          ...current.map((node) =>
            node.id === loopId
              ? { ...node, selected: false, className: undefined, style: frame }
              : { ...node, selected: false, className: undefined },
          ),
          {
            id: nextId,
            type: "block" as const,
            parentId: loopId,
            position: loopChildPosition(siblings.length),
            selected: true,
            data: blockData,
          },
        ]);
        setEdges((current) =>
          tail
            ? [
                ...current.filter((edge) => edge.source !== tail.id),
                { id: `e-${tail.id}-${nextId}`, source: tail.id, target: nextId, type: "flow" },
              ]
            : current,
        );
        hideCatalog();
        return;
      }

      const zoom = getViewport().zoom || 1;
      const nodeEl = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(source.id)}"]`);
      const cardEl = nodeEl?.querySelector<HTMLElement>("span.relative");
      const cardShift =
        nodeEl && cardEl ? (cardEl.getBoundingClientRect().top - nodeEl.getBoundingClientRect().top) / zoom : 0;
      const outputIndex = sourceHandle ? outputs!.findIndex((output) => output.id === sourceHandle) : -1;
      let x = source.position.x + 320;
      let y =
        outputIndex >= 0
          ? source.position.y + outputCenter(outputIndex, Boolean(source.data.trigger)) - (option.trigger ? 52 : 32)
          : source.position.y + cardShift;
      if (outputIndex >= 0) {
        y = placeBranchY(nodes, x, y, { title: option.title, trigger: option.trigger }, outputIndex, outputs!.length);
      } else {
        while (nodes.some((node) => Math.abs(node.position.x - x) < 200 && Math.abs(node.position.y - y) < 40)) x += 320;
      }
      setNodes((current) => [
        ...current.map((node) => ({ ...node, selected: false, className: undefined })),
        {
          id: nextId,
          type: "block" as const,
          position: { x, y },
          selected: true,
          data: blockData,
        },
      ]);
      setEdges((current) => [
        ...current.filter(
          (edge) => edge.source !== source.id || (sourceHandle ? !edgeUsesOutput(edge, sourceHandle, outputs!) : false),
        ),
        { id: `e-${source.id}-${nextId}`, source: source.id, sourceHandle, target: nextId, type: "flow" },
      ]);
      hideCatalog();
    },
    [active, nodes, edges, getViewport, setNodes, setEdges, hideCatalog],
  );

  return (
    <div className="absolute inset-0">
      <style>{`${workflowEdgeCss}
        .react-flow.tool-pointer .react-flow__pane,
        .react-flow.tool-pointer .react-flow__pane.selection,
        .react-flow.tool-pointer .react-flow__node,
        .react-flow.tool-pointer .react-flow__node.selectable,
        .react-flow.tool-pointer .react-flow__node.draggable,
        .react-flow.tool-pointer .react-flow__node.draggable.dragging,
        .react-flow.tool-pointer .react-flow__nodesselection-rect,
        .react-flow.tool-pointer .cursor-grab,
        .react-flow.tool-pointer .cursor-grab:active {
          cursor: default;
        }
        .react-flow.tool-pointer .react-flow__node:hover,
        .react-flow.tool-pointer .react-flow__node:hover .cursor-grab,
        .react-flow.tool-pointer .react-flow__node button,
        .react-flow.tool-pointer .react-flow__edge.selectable:hover {
          cursor: pointer;
        }
        .react-flow.tool-pointer .react-flow__handle {
          cursor: crosshair;
        }
        .react-flow.tool-hand .react-flow__node {
          pointer-events: all !important;
          cursor: grab;
        }
        .react-flow.tool-hand .react-flow__node:active,
        .react-flow.tool-hand .cursor-grab:active {
          cursor: grabbing;
        }
        .react-flow__node:focus,
        .react-flow__node:focus-visible,
        .react-flow__nodesselection-rect,
        .react-flow__nodesselection-rect:focus,
        .react-flow__nodesselection-rect:focus-visible {
          outline: none;
        }
        .react-flow__nodesselection-rect {
          border: none;
          background: transparent;
        }
        .react-flow__node {
          overflow: visible;
        }
        .react-flow__node.attention-focus .block-card {
          outline: none;
          border-color: #95c3ee !important;
          box-shadow: 0 0 0 2px #95c3ee !important;
        }
        @keyframes loop-stroke-travel {
          from { stroke-dashoffset: var(--loop-phase, 0px); }
          to { stroke-dashoffset: calc(var(--loop-phase, 0px) + var(--loop-travel)); }
        }
        .loop-stroke-travel {
          animation: loop-stroke-travel 3s linear 1 forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .loop-stroke-travel { animation: none; }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={!staged && !centerFirstBlock}
        fitViewOptions={{ minZoom: 1, maxZoom: 1 }}
        minZoom={MIN_ZOOM / 100}
        maxZoom={MAX_ZOOM / 100}
        panOnScroll
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        panOnDrag={!selecting}
        selectionOnDrag={selecting}
        selectionMode={SelectionMode.Partial}
        nodesDraggable
        nodesConnectable={selecting}
        elementsSelectable
        deleteKeyCode={["Backspace", "Delete"]}
        colorMode="light"
        className={selecting ? "tool-pointer bg-transparent" : "tool-hand bg-transparent"}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "flow" }}
        connectionLineComponent={WorkflowConnectionLine}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          color="rgb(145 145 154 / 75%)"
          bgColor="var(--surface-su-body)"
        />
        <KeepInView nodeCount={nodes.length} selectedId={active?.id ?? null} collapsed={collapsed} />
      </ReactFlow>
      <SidePanel
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((open) => !open)}
        workflow={workflow}
        onWorkflowChange={(patch) => setWorkflow((current) => ({ ...current, ...patch }))}
        attention={attention}
        onSelectBlock={selectBlock}
        block={active ? { id: active.id, data: active.data } : null}
        issue={
          active
            ? blockIssue(
                active.data,
                blockDisconnected(active.data, {
                  incoming: edges.some((edge) => edge.target === active.id),
                  outgoing: edges.some((edge) => edge.source === active.id),
                  nested: Boolean(active.parentId),
                }),
              )
            : null
        }
        onBlockChange={updateBlock}
        catalog={catalogOpen}
        nextLabel={
          active
            ? (nodes.find((node) => node.id === edges.find((edge) => edge.source === active.id && !edge.sourceHandle)?.target)?.data
                .title ?? null)
            : null
        }
        nextByOutput={
          active && blockOutputs(active.data)
            ? Object.fromEntries(
                blockOutputs(active.data)!.map((output) => [
                  output.id,
                  nodes.find(
                    (node) =>
                      node.id ===
                      edges.find(
                        (edge) =>
                          edge.source === active.id && edgeUsesOutput(edge, output.id, blockOutputs(active.data)!),
                      )?.target,
                  )?.data.title ?? null,
                ]),
              )
            : null
        }
        onOpenCatalog={(outputId) => {
          branchRef.current = outputId;
          showCatalog();
        }}
        onCloseCatalog={hideCatalog}
        onPickBlock={addBlock}
        assistant={
          seed?.prompt && seed.lines?.length ? { prompt: seed.prompt, lines: seed.lines } : null
        }
        onAssistantDone={onReveal}
      />
    </div>
  );
}
