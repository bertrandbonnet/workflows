"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, useEdges, useNodeConnections, useNodes, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Button } from "@/components/Button";
import { EyeSlash, Lightning, Package, Plus, PlusSmall, Warning, WarningCircle } from "@/components/icons";
import { BlockGlyph, TriggerMenu, type BlockIconName, type BlockTone, type TriggerOption } from "@/components/TriggerMenu";

export type NodeStatus = "ok" | "configure" | "error" | "disabled";

export type BlockData = {
  title: string;
  summary: string;
  description?: string;
  frequency?: string;
  time?: string;
  timezone?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  config?: Record<string, string>;
  trigger?: boolean;
  input?: boolean;
  starter?: boolean;
  status?: NodeStatus;
  icon?: BlockIconName;
  tone?: BlockTone;
  loop?: boolean;
};

export const LOOP_PAD = 41;
export const LOOP_GAP = 48;
const LOOP_CARD_W = 240;
const LOOP_CARD_H = 64;

export function loopFrame(count: number, contentHeight = LOOP_CARD_H) {
  const slots = Math.max(count, 1);
  return {
    width: LOOP_PAD * 2 + slots * LOOP_CARD_W + (slots - 1) * LOOP_GAP,
    height: LOOP_PAD * 2 + Math.max(contentHeight, LOOP_CARD_H),
  };
}

export function loopChildPosition(index: number) {
  return { x: LOOP_PAD + index * (LOOP_CARD_W + LOOP_GAP), y: LOOP_PAD };
}

export function loopBlockData(): BlockData {
  return {
    title: "Loop",
    summary: "Repeat the blocks inside",
    input: true,
    status: "ok",
    icon: "repeat",
    tone: "purple",
    loop: true,
  };
}

export type BlockOutput = { id: string; label: string };

type SwitchCase = { id: string; label: string };

export function switchCases(raw: string | undefined): SwitchCase[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Array<Partial<SwitchCase>>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, index) => ({
          id: item.id || `case-${index + 1}`,
          label: typeof item.label === "string" ? item.label : `Case ${index + 1}`,
        }));
      }
    } catch {
      // Keep the default cases when the stored value is not a list.
    }
  }
  return [
    { id: "case-1", label: "Case 1" },
    { id: "case-2", label: "Case 2" },
  ];
}

export function edgeUsesOutput(
  edge: { sourceHandle?: string | null },
  outputId: string,
  outputs: BlockOutput[],
) {
  if (edge.sourceHandle) return edge.sourceHandle === outputId;
  return outputs[0]?.id === outputId;
}

export function blockOutputs(data: Pick<BlockData, "title" | "config">): BlockOutput[] | null {
  if (data.title === "If / else") {
    return [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ];
  }
  if (data.title === "Switch") {
    return [
      ...switchCases(data.config?.cases).map((item, index) => ({
        id: item.id,
        label: item.label.trim() || `Case ${index + 1}`,
      })),
      { id: "default", label: "Default" },
    ];
  }
  if (data.title === "Request approval") {
    return [
      { id: "approved", label: "Approved" },
      { id: "declined", label: "Declined" },
    ];
  }
  return null;
}

export function outputCenter(index: number, trigger: boolean) {
  return (trigger ? 20 : 0) + 64 + 4 + index * 28 + 14;
}

function asBlock(data: unknown): Pick<BlockData, "title" | "config" | "trigger"> {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const config = record.config;
  return {
    title: typeof record.title === "string" ? record.title : "",
    config: config && typeof config === "object" ? (config as Record<string, string>) : undefined,
    trigger: record.trigger === true,
  };
}

export function blockHeight(data: unknown) {
  const block = asBlock(data);
  const outputs = blockOutputs(block);
  return (block.trigger ? 20 : 0) + 64 + (outputs ? 8 + outputs.length * 28 : 0);
}

export function loopFrameFor(children: Array<{ data: unknown }>) {
  const contentHeight = children.reduce((max, child) => Math.max(max, blockHeight(child.data)), LOOP_CARD_H);
  return loopFrame(children.length, contentHeight);
}

const COLUMN_X = 200;
const STACK_GAP = 16;
const BRANCH_ELBOW = 64;

function placedHeight(node: { data: unknown; style?: { height?: unknown } }) {
  const styled = Number(node.style?.height);
  return styled > 0 ? styled : blockHeight(node.data);
}

export function placeBranchY(
  nodes: Array<{ position: { x: number; y: number }; data: unknown; style?: { height?: unknown } }>,
  x: number,
  alignedY: number,
  next: unknown,
  outputIndex: number,
  outputCount: number,
) {
  const mid = (outputCount - 1) / 2;
  const direction = outputIndex < mid ? -1 : outputIndex > mid ? 1 : 0;
  let y = alignedY + direction * BRANCH_ELBOW;
  const height = blockHeight(next);
  let guard = 0;
  while (guard++ < 24) {
    const blocker = nodes.find((node) => {
      if (Math.abs(node.position.x - x) >= COLUMN_X) return false;
      const top = node.position.y;
      const bottom = top + placedHeight(node);
      return y < bottom + STACK_GAP && y + height + STACK_GAP > top;
    });
    if (!blocker) return y;
    y =
      direction < 0
        ? blocker.position.y - STACK_GAP - height
        : blocker.position.y + placedHeight(blocker) + STACK_GAP;
  }
  return y;
}

export function blockDisconnected(
  data: BlockData,
  links: { incoming: boolean; outgoing: boolean; nested?: boolean },
) {
  if (links.nested || data.starter) return false;
  return data.trigger ? !links.outgoing : !links.incoming;
}

export type BlockNode = Node<BlockData, "block">;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "configure") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center text-[var(--orange-fg-accent,#d97040)]">
        <WarningCircle />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center text-[var(--red-fg-accent,#c92a2a)]">
        <Warning />
      </span>
    );
  }
  if (status === "disabled") {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center text-[var(--grey-fg-secondary,#78716c)]">
        <EyeSlash />
      </span>
    );
  }
  return null;
}

function NodeHandle({
  type,
  position,
  id,
  connected,
}: {
  type: "source" | "target";
  position: Position;
  id?: string;
  connected?: boolean;
}) {
  const connections = useNodeConnections(id ? { handleType: type, handleId: id } : { handleType: type });
  const filled = type === "source" && (connected || connections.length > 0);

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      className={cn(type === "target" ? "node-handle-target" : "node-handle", filled && "connected")}
    />
  );
}

function FloatingBlockMenu({
  anchorRef,
  offsetTop,
  offsetLeft = 40,
  menuRef,
  children,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  offsetTop: number;
  offsetLeft?: number;
  menuRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { getViewport, setViewport } = useReactFlow();
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const panned = useRef(false);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const zoom = anchor.offsetWidth > 0 ? rect.width / anchor.offsetWidth : 1;
      setBox({ top: rect.top + offsetTop * zoom, left: rect.right + offsetLeft * zoom });
    };
    place();
    const viewport = document.querySelector(".react-flow__viewport");
    const observer = viewport ? new MutationObserver(place) : null;
    observer?.observe(viewport as Element, { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorRef, offsetTop, offsetLeft]);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const pane = document.querySelector(".react-flow")?.getBoundingClientRect();
    if (!menu || !pane || !box || panned.current) return;
    const rect = menu.getBoundingClientRect();
    if (rect.width === 0) return;
    panned.current = true;
    const pad = 24;
    const toolbar = document.querySelector("[role='toolbar']")?.getBoundingClientRect();
    const panel = document.querySelector("[data-canvas-panel]")?.getBoundingClientRect();
    const blockedRight = panel && rect.bottom > panel.top && rect.top < panel.bottom ? panel.left : pane.right;
    const viewLeft = pane.left + pad;
    const viewTop = pane.top + pad;
    const viewRight = Math.min(pane.right, blockedRight) - pad;
    const toolbarTop = toolbar && toolbar.bottom > pane.top && toolbar.top < pane.bottom ? toolbar.top : pane.bottom;
    const viewBottom = Math.min(pane.bottom, toolbarTop) - pad;
    const viewHeight = viewBottom - viewTop;
    let shiftX = 0;
    let shiftY = 0;
    if (rect.left < viewLeft) shiftX = viewLeft - rect.left;
    else if (rect.right > viewRight) shiftX = viewRight - rect.right;
    if (rect.height > viewHeight) shiftY = viewTop - rect.top;
    else if (rect.top < viewTop) shiftY = viewTop - rect.top;
    else if (rect.bottom > viewBottom) shiftY = viewBottom - rect.bottom;
    if (shiftX === 0 && shiftY === 0) return;
    const viewport = getViewport();
    const zoom = viewport.zoom || 1;
    void setViewport(
      { x: viewport.x + shiftX / zoom, y: viewport.y + shiftY / zoom, zoom },
      { duration: 380, interpolate: "smooth" },
    );
  }, [box, getViewport, menuRef, setViewport]);

  if (!box) return null;
  return createPortal(
    <div
      ref={menuRef}
      className="nodrag nopan pointer-events-auto fixed z-50"
      style={{ top: box.top, left: box.left }}
    >
      {children}
    </div>,
    document.body,
  );
}

function cardChrome(status: NodeStatus, selected: boolean) {
  const disabled = status === "disabled";
  const error = status === "error";

  if (selected && disabled) {
    return "border-[0.5px] border-dashed border-[var(--blue-fg-accent,#1f74c6)] shadow-[inset_0_0_0_0.5px_var(--blue-fg-accent)]";
  }
  if (selected && error) {
    return "border-[0.5px] border-solid border-[var(--red-fg-accent,#c92a2a)] shadow-[inset_0_0_0_0.5px_var(--red-fg-accent)]";
  }
  if (selected) {
    return "border-[0.5px] border-solid border-[var(--blue-fg-accent,#1f74c6)] shadow-[inset_0_0_0_0.5px_var(--blue-fg-accent)]";
  }
  if (disabled) {
    return "border-[0.5px] border-dashed border-[var(--grey-bo-2,#e2dfdd)] group-hover:border-[var(--grey-bo-3,#dbd8d6)] group-hover:shadow-[var(--shadow-light-sm)]";
  }
  if (error) {
    return "border-[0.5px] border-solid border-[var(--red-fg-accent,#c92a2a)] group-hover:shadow-[var(--shadow-light-sm)]";
  }
  return "border-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] group-hover:border-[var(--grey-bo-3,#dbd8d6)] group-hover:shadow-[var(--shadow-light-sm)]";
}

export function LoopNode({ id, selected }: NodeProps<BlockNode>) {
  const nodes = useNodes();
  const edges = useEdges();
  const incoming = useNodeConnections({ handleType: "target" });
  const children = nodes.filter((node) => node.parentId === id);
  const empty = children.length === 0;
  const linked = !empty && incoming.length > 0;
  const childIds = new Set(children.map((node) => node.id));
  const joined = new Set<string>();
  for (const edge of edges) {
    if (childIds.has(edge.source) && childIds.has(edge.target)) {
      joined.add(edge.source);
      joined.add(edge.target);
    }
  }
  const animated =
    joined.size >= 2 && children.every((node) => !joined.has(node.id) || node.data.status !== "error");
  const frame = nodes.find((node) => node.id === id);
  const frameWidth = Number.parseFloat(String(frame?.style?.width ?? 0));
  const frameHeight = Number.parseFloat(String(frame?.style?.height ?? 0));
  const inset = 0.75;
  const pathWidth = Math.max(0, frameWidth - inset * 2);
  const pathHeight = Math.max(0, frameHeight - inset * 2);
  const radius = Math.min(15.25, pathWidth / 2, pathHeight / 2);
  const perimeter = 2 * (pathWidth + pathHeight - 4 * radius) + 2 * Math.PI * radius;
  const band = 80;
  const trail = [
    { length: 80, opacity: 0.14 },
    { length: 62, opacity: 0.18 },
    { length: 44, opacity: 0.24 },
    { length: 28, opacity: 0.32 },
    { length: 14, opacity: 0.42 },
  ].map((layer) => ({ ...layer, phase: layer.length - band }));
  const { addNodes, addEdges, setNodes, getNode } = useReactFlow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [travelDone, setTravelDone] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const buttonAnchor = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) setTravelDone(false);
  }, [animated]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as globalThis.Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function addInside(option: TriggerOption) {
    const nextId = crypto.randomUUID();
    if (option.title === "Loop") {
      const current = getNode(id);
      if (!current) return;
      const width = Number(current.style?.width ?? loopFrame(0).width);
      setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
      addNodes({
        id: nextId,
        type: "loop",
        position: { x: current.position.x + width + 80, y: current.position.y },
        style: loopFrame(0),
        selected: true,
        data: loopBlockData(),
      });
      addEdges({ id: `e-${id}-${nextId}`, source: id, target: nextId, type: "flow" });
      setMenuOpen(false);
      return;
    }
    setNodes((currentNodes) => [
      ...currentNodes.map((node) =>
        node.id === id
          ? { ...node, selected: false, style: loopFrame(1, blockHeight({ title: option.title, trigger: option.trigger })) }
          : { ...node, selected: false },
      ),
      {
        id: nextId,
        type: "block" as const,
        parentId: id,
        position: loopChildPosition(0),
        selected: true,
        data: {
          title: option.title,
          summary: option.description,
          input: true,
          status: "ok" as const,
          icon: option.icon,
          tone: option.tone,
          trigger: option.trigger,
        },
      },
    ]);
    setMenuOpen(false);
  }

  return (
    <div className="group relative box-border h-full w-full overflow-visible rounded-[16px] bg-[var(--grey-bg-1,#fafaf9)]">
      <span className="pointer-events-none absolute bottom-full left-0 z-0 flex translate-y-px items-start pl-3">
        <span className="inline-flex h-5 items-center gap-[2px] rounded-tl-[8px] rounded-tr-[8px] bg-[var(--blue-bg-3,#e3eaf1)] px-[6px] text-[var(--blue-fg-accent,#1f74c6)]">
          <img src="/block-icons/arrows-clockwise-blue.svg" width={12} height={12} alt="" />
          <span className="text-[12px] leading-4 font-medium tracking-[-0.12px]">Loop</span>
        </span>
      </span>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-[16px] border",
          linked ? "border-solid" : "border-dashed",
          selected ? "border-[var(--blue-fg-accent,#1f74c6)]" : "border-[var(--grey-bo-3,#dbd8d6)]",
        )}
      />
      {animated && !travelDone && frameWidth > 0 && perimeter > 80 ? (
        <svg
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width={frameWidth}
          height={frameHeight}
          aria-hidden
          onAnimationEnd={() => setTravelDone(true)}
        >
          {trail.map((layer) => (
            <rect
              key={layer.length}
              className="loop-stroke-travel"
              x={inset}
              y={inset}
              width={pathWidth}
              height={pathHeight}
              rx={radius}
              ry={radius}
              fill="none"
              stroke={selected ? "#9ec9ef" : "#1f74c6"}
              strokeOpacity={layer.opacity}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={`${layer.length} ${perimeter - layer.length}`}
              style={{
                ["--loop-travel" as string]: `${-perimeter}px`,
                ["--loop-phase" as string]: `${layer.phase}px`,
              }}
            />
          ))}
        </svg>
      ) : null}
      <Handle type="target" position={Position.Left} className="node-handle-target" />
      <Handle type="source" position={Position.Right} className="node-handle-target" />
      {empty ? (
        <div ref={anchorRef} className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div ref={buttonAnchor} className="relative">
            <div className="nodrag nopan pointer-events-auto">
              <Button
                kind="button"
                tone="grey"
                leadingIcon={<Plus />}
                aria-expanded={menuOpen}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((open) => !open);
                }}
              >
                Add block
              </Button>
            </div>
            {menuOpen ? (
              <FloatingBlockMenu anchorRef={buttonAnchor} offsetTop={0} menuRef={menuRef}>
                <TriggerMenu onSelect={addInside} />
              </FloatingBlockMenu>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkflowNode({ id, data, selected }: NodeProps<BlockNode>) {
  const { title, summary, trigger = false, input = false, starter = false, status: storedStatus = "ok", icon, tone } = data;
  const { addNodes, addEdges, getNode, getNodes, getViewport, setNodes } = useReactFlow();
  const outgoing = useNodeConnections({ handleType: "source" });
  const incoming = useNodeConnections({ handleType: "target" });
  const insideLoop = Boolean(getNode(id)?.parentId);
  const disconnected = blockDisconnected(data, {
    incoming: incoming.length > 0,
    outgoing: outgoing.length > 0,
    nested: insideLoop,
  });
  const status: NodeStatus =
    storedStatus === "error" || storedStatus === "disabled" ? storedStatus : disconnected ? "configure" : "ok";
  const disabled = status === "disabled";
  const terminal = title === "Stop";
  const outputs = blockOutputs(data);
  const [menuHandle, setMenuHandle] = useState<string | null>(null);
  const menuOpen = menuHandle !== null;
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as globalThis.Node;
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setMenuHandle(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuHandle(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function addTrigger(option: TriggerOption) {
    const current = getNode(id);
    const handleId = outputs && menuHandle ? menuHandle : undefined;
    if (!current) return;
    if (handleId && outputs) {
      if (outgoing.some((connection) => edgeUsesOutput(connection, handleId, outputs))) return;
    } else if (outgoing.length > 0) return;

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

    if (option.title === "Loop") {
      const anchor = current.parentId ? getNode(current.parentId) ?? current : current;
      const anchorWidth = anchor.type === "loop" ? Number(anchor.style?.width ?? loopFrame(0).width) : 0;
      setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
      addNodes({
        id: nextId,
        type: "loop",
        position: {
          x: anchor.position.x + (anchor.type === "loop" ? anchorWidth + 80 : 320),
          y: anchor.position.y,
        },
        style: loopFrame(0),
        selected: true,
        data: loopBlockData(),
      });
      addEdges({
        id: `e-${anchor.id}-${nextId}`,
        source: anchor.id,
        sourceHandle: anchor.id === id ? handleId : undefined,
        target: nextId,
        type: "flow",
      });
      setMenuHandle(null);
      return;
    }

    if (current.parentId) {
      const siblings = getNodes().filter((node) => node.parentId === current.parentId);
      const frame = loopFrameFor([...siblings, { data: blockData }]);
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === current.parentId
            ? { ...node, selected: false, style: frame }
            : { ...node, selected: false },
        ),
      );
      addNodes({
        id: nextId,
        type: "block",
        parentId: current.parentId,
        position: loopChildPosition(siblings.length),
        selected: true,
        data: blockData,
      });
      addEdges({
        id: `e-${id}-${nextId}`,
        source: id,
        sourceHandle: handleId,
        target: nextId,
        type: "flow",
      });
      setMenuHandle(null);
      return;
    }

    const nodeEl = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"]`);
    const cardEl = nodeEl?.querySelector<HTMLElement>("span.relative");
    const zoom = getViewport().zoom || 1;
    const cardShift =
      nodeEl && cardEl ? (cardEl.getBoundingClientRect().top - nodeEl.getBoundingClientRect().top) / zoom : 0;
    const outputIndex = handleId ? (outputs?.findIndex((output) => output.id === handleId) ?? -1) : -1;
    const position =
      outputIndex >= 0
        ? {
            x: current.position.x + 320,
            y: placeBranchY(
              getNodes(),
              current.position.x + 320,
              current.position.y + outputCenter(outputIndex, trigger) - (option.trigger ? 52 : 32),
              { title: option.title, trigger: option.trigger },
              outputIndex,
              outputs?.length ?? 0,
            ),
          }
        : { x: current.position.x + 320, y: current.position.y + cardShift };
    if (outputIndex < 0) {
      const taken = getNodes();
      while (taken.some((node) => Math.abs(node.position.x - position.x) < 200 && Math.abs(node.position.y - position.y) < 72)) {
        position.y += 96;
      }
    }
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
    addNodes({
      id: nextId,
      type: "block",
      position,
      selected: true,
      data: blockData,
    });
    addEdges({
      id: `e-${id}-${nextId}`,
      source: id,
      sourceHandle: handleId,
      target: nextId,
      type: "flow",
    });
    setMenuHandle(null);
  }

  return (
    <div ref={anchorRef} className={cn("group relative w-[240px]", selected && "is-selected")}>
      <style>{`
        .node-add.node-add {
          opacity: 0;
          transform: translate3d(-6px, 0, 0) scale(0.92);
          transition:
            opacity 240ms ease,
            transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
            background-color 160ms ease;
        }
        .group:hover .node-add.node-add,
        .group:focus-within .node-add.node-add,
        .node-add.node-add[aria-expanded="true"],
        .node-add.node-add.node-add-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        .react-flow__handle.node-handle {
          z-index: 1;
          width: 12px;
          height: 12px;
          min-width: 12px;
          min-height: 12px;
          border: 1px solid var(--blue-fg-accent, #1f74c6);
          border-radius: 6px;
          background: var(--surface-su-main, #fcfcfc);
          cursor: crosshair;
        }
        .react-flow__handle.node-handle.connected {
          background: var(--blue-fg-accent, #1f74c6);
        }
        .node-add-row.node-add-row {
          opacity: 0;
          transform: translate3d(-6px, 0, 0) scale(0.92);
          transition:
            opacity 240ms ease,
            transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
            background-color 160ms ease;
        }
        .output-row:hover .node-add-row,
        .node-add-row[aria-expanded="true"] {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        .react-flow__handle.node-handle-target {
          width: 1px;
          height: 1px;
          min-width: 1px;
          min-height: 1px;
          border: none;
          background: transparent;
          opacity: 0;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .node-add.node-add,
          .node-add-row.node-add-row { transition: none; }
        }
      `}</style>
      <div className="flex w-full cursor-grab flex-col items-start active:cursor-grabbing">
        {trigger ? (
          <span className="flex items-start pl-[var(--spacing-3,12px)]">
            <span className="inline-flex h-5 items-center gap-[2px] rounded-tl-[8px] rounded-tr-[8px] bg-[var(--blue-bg-3,#e3eaf1)] px-[6px] text-[var(--blue-fg-accent,#1f74c6)]">
              <Lightning />
              <span className="text-[12px] leading-4 font-medium tracking-[-0.12px]">Trigger</span>
            </span>
          </span>
        ) : null}
        <span
          className={cn(
            "block-card relative flex w-full flex-col rounded-[var(--rounded-lg,12px)] bg-[var(--surface-su-light-elevation,#ffffff)]",
            cardChrome(status, selected),
          )}
        >
          <span className="relative flex h-16 w-full items-start gap-[var(--spacing-2,8px)] p-[12px]">
            {icon && tone ? (
              <BlockGlyph icon={icon} tone={tone} trigger={trigger} className={disabled ? "opacity-50" : undefined} />
            ) : (
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-[var(--rounded-sm,6px)] bg-[var(--blue-bg-3,#e3eaf1)] text-[var(--blue-fg-accent,#1f74c6)]",
                  disabled && "opacity-50",
                )}
              >
                <Package />
              </span>
            )}
            <span className={cn("flex min-w-0 flex-1 flex-col gap-[2px]", disabled && "opacity-50")}>
              <span className="truncate text-[length:var(--text-bold-large-size,14px)] leading-[var(--text-bold-large-leading,20px)] font-medium tracking-[var(--text-bold-large-tracking,-0.015em)] text-[var(--grey-fg-primary,#44403c)]">
                {title}
              </span>
              <span className="flex w-full items-center gap-[var(--spacing-1,4px)]">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[length:var(--text-regular-base-size,13px)] leading-[var(--text-regular-base-leading,18px)] font-normal tracking-[var(--text-regular-base-tracking,-0.015em)]",
                    status === "configure" && "text-[var(--grey-fg-disabled,#c3bfbc)]",
                    status === "error" && "text-[var(--red-fg-accent,#c92a2a)]",
                    status !== "configure" && status !== "error" && "text-[var(--grey-fg-secondary,#78716c)]",
                  )}
                >
                  {summary}
                </span>
                <StatusIcon status={status} />
              </span>
            </span>
            {input || !trigger ? <NodeHandle type="target" position={Position.Left} /> : null}
            {outputs || terminal ? null : <NodeHandle type="source" position={Position.Right} />}
          </span>
          {outputs ? (
            <span className="flex w-full flex-col border-t-[0.5px] border-solid border-[var(--grey-bo-1,#eeeceb)] py-1">
              {outputs.map((output) => {
                const connected = outgoing.some((connection) => edgeUsesOutput(connection, output.id, outputs));
                return (
                  <span
                    key={output.id}
                    className="output-row relative flex h-7 w-full items-center justify-end pr-3.5 pl-3.5"
                  >
                    <span
                      className={cn(
                        "min-w-0 truncate text-[12px] leading-4 font-normal tracking-[-0.18px] text-[var(--grey-fg-secondary,#78716c)]",
                        disabled && "opacity-50",
                      )}
                    >
                      {output.label}
                    </span>
                    <NodeHandle type="source" position={Position.Right} id={output.id} connected={connected} />
                    {connected ? null : (
                      <span className="nodrag nopan pointer-events-auto absolute top-1/2 left-[calc(100%-8px)] z-0 flex h-7 -translate-y-1/2 items-center pr-4 pl-6">
                        <button
                          type="button"
                          aria-label={`Add next from ${output.label}`}
                          aria-expanded={menuHandle === output.id}
                          className="nodrag nopan node-add-row flex size-5 origin-left cursor-pointer items-center justify-center rounded-[10px] bg-[var(--blue-fg-accent,#1f74c6)] text-white hover:bg-[var(--blue-bg-accent-hover,#1960a2)]"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuHandle((current) => (current === output.id ? null : output.id));
                          }}
                        >
                          <PlusSmall />
                        </button>
                      </span>
                    )}
                  </span>
                );
              })}
            </span>
          ) : null}
        </span>
      </div>
      <div className="contents">
        {terminal || outputs || outgoing.length > 0 ? null : (
          <span
            data-add-bridge
            className={cn(
              "nodrag nopan pointer-events-auto absolute left-[calc(100%-8px)] z-0 flex h-24 -translate-y-1/2 items-center pr-4 pl-6",
              trigger ? "top-[52px]" : "top-8",
            )}
          >
            <button
              type="button"
              aria-label="Add next"
              aria-expanded={menuOpen}
              className={cn(
                "nodrag nopan node-add flex size-5 origin-left cursor-pointer items-center justify-center rounded-[10px] bg-[var(--blue-fg-accent,#1f74c6)] text-white hover:bg-[var(--blue-bg-accent-hover,#1960a2)]",
                starter && "node-add-visible",
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setMenuHandle((current) => (current === "" ? null : ""));
              }}
            >
              <PlusSmall />
            </button>
          </span>
        )}
        {menuOpen ? (
          <FloatingBlockMenu
            anchorRef={anchorRef}
            offsetTop={
              outputs
                ? outputCenter(Math.max(0, outputs.findIndex((output) => output.id === menuHandle)), trigger) - 14
                : trigger
                  ? 20
                  : 0
            }
            menuRef={menuRef}
          >
            <TriggerMenu onSelect={addTrigger} />
          </FloatingBlockMenu>
        ) : null}
      </div>
    </div>
  );
}
