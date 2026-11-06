"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReactFlow, useStoreApi, type Edge, type Node } from "@xyflow/react";

type Snap = { nodes: Node[]; edges: Edge[] };

const HistoryActionsContext = createContext<{
  undo: () => void;
  redo: () => void;
  adopt: () => void;
} | null>(null);

const HistoryStateContext = createContext({ canUndo: false, canRedo: false });

function capture(nodes: Node[], edges: Edge[]): Snap {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      data: structuredClone(node.data),
      ...(node.parentId ? { parentId: node.parentId } : {}),
      ...(node.style ? { style: structuredClone(node.style) } : {}),
      ...(node.selected ? { selected: true } : {}),
      ...(node.className ? { className: node.className } : {}),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      type: edge.type,
    })),
  };
}

function fingerprint(snap: Snap) {
  return JSON.stringify({
    nodes: snap.nodes.map(({ selected: _selected, className: _className, ...node }) => node),
    edges: snap.edges,
  });
}

function withoutConnectedStarters(nodes: Node[], edges: Edge[]) {
  const linked = new Set(edges.map((edge) => edge.source));
  if (!nodes.some((node) => Boolean((node.data as { starter?: boolean }).starter) && linked.has(node.id))) {
    return null;
  }
  return nodes.map((node) =>
    (node.data as { starter?: boolean }).starter && linked.has(node.id)
      ? { ...node, data: { ...node.data, starter: false } }
      : node,
  );
}

function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function CanvasHistoryProvider({ children }: { children: ReactNode }) {
  const store = useStoreApi();
  const { setNodes, setEdges } = useReactFlow();
  const setNodesRef = useRef(setNodes);
  const setEdgesRef = useRef(setEdges);
  setNodesRef.current = setNodes;
  setEdgesRef.current = setEdges;
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });
  const api = useRef({ undo: () => {}, redo: () => {}, adopt: () => {} });

  useEffect(() => {
    const past: Snap[] = [];
    const future: Snap[] = [];
    let present = capture(store.getState().nodes, store.getState().edges);
    let drag = false;
    let applying = false;
    let burst = 0;

    const sync = () => {
      const next = { canUndo: past.length > 0, canRedo: future.length > 0 };
      setFlags((current) => (current.canUndo === next.canUndo && current.canRedo === next.canRedo ? current : next));
    };

    const restore = (snap: Snap) => {
      window.clearTimeout(burst);
      burst = 0;
      drag = false;
      applying = true;
      present = snap;
      setNodesRef.current(snap.nodes);
      setEdgesRef.current(snap.edges);
      sync();
      queueMicrotask(() => {
        applying = false;
        const state = store.getState();
        const stripped = withoutConnectedStarters(state.nodes, state.edges);
        if (!stripped) {
          present = capture(state.nodes, state.edges);
          return;
        }
        applying = true;
        setNodesRef.current(stripped);
        queueMicrotask(() => {
          applying = false;
          present = capture(store.getState().nodes, store.getState().edges);
        });
      });
    };

    api.current = {
      undo: () => {
        const snap = past.pop();
        if (!snap) return;
        future.push(present);
        restore(snap);
      },
      redo: () => {
        const snap = future.pop();
        if (!snap) return;
        past.push(present);
        restore(snap);
      },
      adopt: () => {
        window.clearTimeout(burst);
        burst = 0;
        drag = false;
        applying = true;
        past.length = 0;
        future.length = 0;
        present = capture(store.getState().nodes, store.getState().edges);
        sync();
        queueMicrotask(() => {
          applying = false;
          present = capture(store.getState().nodes, store.getState().edges);
        });
      },
    };

    const unsubscribe = store.subscribe((state, prev) => {
      if (state.nodes === prev.nodes && state.edges === prev.edges) return;
      if (applying) return;
      const stripped = withoutConnectedStarters(state.nodes, state.edges);
      if (stripped) {
        applying = true;
        setNodesRef.current(stripped);
        queueMicrotask(() => {
          applying = false;
        });
      }
      const next = capture(stripped ?? state.nodes, state.edges);
      const dragging = state.nodes.some((node) => node.dragging);
      if (fingerprint(next) === fingerprint(present)) {
        present = next;
        if (!dragging) drag = false;
        return;
      }
      if (dragging) {
        if (!drag) {
          window.clearTimeout(burst);
          burst = 0;
          past.push(present);
          if (past.length > 100) past.shift();
          future.length = 0;
          drag = true;
          sync();
        }
        present = next;
        return;
      }
      if (drag) {
        present = next;
        drag = false;
        return;
      }
      if (!burst) {
        past.push(present);
        if (past.length > 100) past.shift();
        future.length = 0;
        sync();
        burst = window.setTimeout(() => {
          burst = 0;
        }, 80);
      }
      present = next;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || isEditable(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      if (!command) return;
      const key = event.key.toLowerCase();
      const undo = key === "z" && !event.shiftKey;
      const redo = (key === "z" && event.shiftKey) || key === "y";
      if (!undo && !redo) return;
      event.preventDefault();
      if (undo) api.current.undo();
      else api.current.redo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(burst);
    };
  }, [store]);

  const actions = useMemo(
    () => ({
      undo: () => api.current.undo(),
      redo: () => api.current.redo(),
      adopt: () => api.current.adopt(),
    }),
    [],
  );

  return (
    <HistoryActionsContext.Provider value={actions}>
      <HistoryStateContext.Provider value={flags}>{children}</HistoryStateContext.Provider>
    </HistoryActionsContext.Provider>
  );
}

export function useCanvasHistory() {
  const actions = useContext(HistoryActionsContext);
  const state = useContext(HistoryStateContext);
  if (!actions) throw new Error("useCanvasHistory must be used within CanvasHistoryProvider");
  return { ...actions, ...state };
}

export function useCanvasHistoryActions() {
  const actions = useContext(HistoryActionsContext);
  if (!actions) throw new Error("useCanvasHistory must be used within CanvasHistoryProvider");
  return actions;
}
