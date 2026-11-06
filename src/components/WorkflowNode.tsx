"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
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
  trigger?: boolean;
  input?: boolean;
  status?: NodeStatus;
  icon?: BlockIconName;
  tone?: BlockTone;
  loop?: boolean;
};

export const LOOP_PAD = 41;
export const LOOP_GAP = 48;
const LOOP_CARD_W = 240;
const LOOP_CARD_H = 64;

export function loopFrame(count: number) {
  const slots = Math.max(count, 1);
  return {
    width: LOOP_PAD * 2 + slots * LOOP_CARD_W + (slots - 1) * LOOP_GAP,
    height: LOOP_PAD * 2 + LOOP_CARD_H,
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

function NodeHandle({ type, position }: { type: "source" | "target"; position: Position }) {
  const connections = useNodeConnections({ handleType: type });

  return (
    <Handle
      type={type}
      position={position}
      className={cn(
        type === "target" ? "node-handle-target" : "node-handle",
        type === "source" && connections.length > 0 && "connected",
      )}
    />
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
  const { addNodes, addEdges, setNodes, getNode, getViewport, setViewport } = useReactFlow();
  const [menuOpen, setMenuOpen] = useState(false);
  const [travelDone, setTravelDone] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) setTravelDone(false);
  }, [animated]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!anchorRef.current?.contains(event.target as globalThis.Node)) setMenuOpen(false);
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

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const pane = menu?.closest(".react-flow")?.getBoundingClientRect();
    if (!menu || !pane) return;

    const rect = menu.getBoundingClientRect();
    const pad = 24;
    const toolbar = document.querySelector("[role='toolbar']")?.getBoundingClientRect();
    const panel = document.querySelector("[data-canvas-panel]")?.getBoundingClientRect();
    const blockedRight = panel && rect.bottom > panel.top && rect.top < panel.bottom ? panel.left : pane.right;
    const viewLeft = pane.left + pad;
    const viewTop = pane.top + pad;
    const viewRight = Math.min(pane.right, blockedRight) - pad;
    const toolbarTop = toolbar && toolbar.bottom > pane.top && toolbar.top < pane.bottom ? toolbar.top : pane.bottom;
    const viewBottom = Math.min(pane.bottom, toolbarTop) - pad;
    let shiftX = 0;
    let shiftY = 0;
    if (rect.left < viewLeft) shiftX = viewLeft - rect.left;
    else if (rect.right > viewRight) shiftX = viewRight - rect.right;
    if (rect.top < viewTop) shiftY = viewTop - rect.top;
    else if (rect.bottom > viewBottom) shiftY = viewBottom - rect.bottom;
    if (shiftX === 0 && shiftY === 0) return;
    const viewport = getViewport();
    const zoom = viewport.zoom || 1;
    void setViewport(
      { x: viewport.x + shiftX / zoom, y: viewport.y + shiftY / zoom, zoom },
      { duration: 380, interpolate: "smooth" },
    );
  }, [menuOpen, getViewport, setViewport]);

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
      ...currentNodes.map((node) => (node.id === id ? { ...node, selected: false, style: loopFrame(1) } : { ...node, selected: false })),
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
          <div className="relative">
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
              <div
                ref={menuRef}
                className="nodrag nopan pointer-events-auto absolute top-0 left-[calc(100%+40px)] z-30"
              >
                <TriggerMenu onSelect={addInside} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkflowNode({ id, data, selected }: NodeProps<BlockNode>) {
  const { title, summary, trigger = false, input = false, status: storedStatus = "ok", icon, tone } = data;
  const { addNodes, addEdges, getNode, getNodes, getViewport, setViewport, setNodes } = useReactFlow();
  const outgoing = useNodeConnections({ handleType: "source" });
  const incoming = useNodeConnections({ handleType: "target" });
  const insideLoop = Boolean(getNode(id)?.parentId);
  const disconnected = insideLoop ? false : trigger ? outgoing.length === 0 : incoming.length === 0;
  const status: NodeStatus =
    storedStatus === "error" || storedStatus === "disabled" ? storedStatus : disconnected ? "configure" : "ok";
  const disabled = status === "disabled";
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!anchorRef.current?.contains(event.target as globalThis.Node)) setMenuOpen(false);
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

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const pane = menu?.closest(".react-flow")?.getBoundingClientRect();
    if (!menu || !pane) return;

    const rect = menu.getBoundingClientRect();
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
      {
        x: viewport.x + shiftX / zoom,
        y: viewport.y + shiftY / zoom,
        zoom,
      },
      { duration: 380, interpolate: "smooth" },
    );
  }, [menuOpen, getViewport, setViewport]);

  function addTrigger(option: TriggerOption) {
    const current = getNode(id);
    if (!current || outgoing.length > 0) return;

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
      addEdges({ id: `e-${anchor.id}-${nextId}`, source: anchor.id, target: nextId, type: "flow" });
      setMenuOpen(false);
      return;
    }

    if (current.parentId) {
      const count = getNodes().filter((node) => node.parentId === current.parentId).length;
      const frame = loopFrame(count + 1);
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
        position: loopChildPosition(count),
        selected: true,
        data: blockData,
      });
      addEdges({ id: `e-${id}-${nextId}`, source: id, target: nextId, type: "flow" });
      setMenuOpen(false);
      return;
    }

    const nodeEl = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"]`);
    const cardEl = nodeEl?.querySelector<HTMLElement>("span.relative");
    const zoom = getViewport().zoom || 1;
    const cardShift =
      nodeEl && cardEl ? (cardEl.getBoundingClientRect().top - nodeEl.getBoundingClientRect().top) / zoom : 0;
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
    addNodes({
      id: nextId,
      type: "block",
      position: {
        x: current.position.x + 320,
        y: current.position.y + cardShift,
      },
      selected: true,
      data: blockData,
    });
    addEdges({ id: `e-${id}-${nextId}`, source: id, target: nextId, type: "flow" });
    setMenuOpen(false);
  }

  return (
    <div className={cn("group relative w-[240px]", selected && "is-selected")}>
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
        .node-add.node-add[aria-expanded="true"] {
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
          .node-add.node-add { transition: none; }
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
            "relative flex h-16 w-full items-start gap-[var(--spacing-2,8px)] rounded-[var(--rounded-lg,12px)] bg-[var(--surface-su-light-elevation,#ffffff)] p-[12px]",
            cardChrome(status, selected),
          )}
        >
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
          <NodeHandle type="source" position={Position.Right} />
        </span>
      </div>
      {outgoing.length === 0 ? (
      <div ref={anchorRef} className="contents">
        <span
          data-add-bridge
          className={cn(
            "nodrag nopan pointer-events-auto absolute left-[calc(100%-8px)] z-0 flex h-24 -translate-y-1/2 items-center pl-6 pr-4",
            trigger ? "top-[52px]" : "top-8",
          )}
        >
          <button
            type="button"
            aria-label="Add next"
            aria-expanded={menuOpen}
            className="nodrag nopan node-add flex size-5 origin-left cursor-pointer items-center justify-center rounded-[10px] bg-[var(--blue-fg-accent,#1f74c6)] text-white hover:bg-[var(--blue-bg-accent-hover,#1960a2)]"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <PlusSmall />
          </button>
        </span>
        {menuOpen ? (
          <div
            ref={menuRef}
            className={cn("absolute left-[calc(100%+40px)] z-30", trigger ? "top-5" : "top-0")}
          >
            <TriggerMenu onSelect={addTrigger} />
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
