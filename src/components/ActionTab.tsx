"use client";

import { useEffect, useRef, useState } from "react";
import { useOnViewportChange, useReactFlow } from "@xyflow/react";
import { useBlockCatalog } from "@/components/block-catalog";
import { useCanvasTool } from "@/components/canvas-tool";
import { Button } from "@/components/Button";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, ZoomProgress } from "@/components/ZoomSlider";
import { ZoomMenu } from "@/components/ZoomMenu";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  Broom,
  CaretDown,
  Cursor,
  Hand,
  MagnifyingGlass,
  Plus,
} from "@/components/icons";

type ZoomPhase = "off" | "open" | "closed";

const ZOOM_VISIBLE_MS = 1200;
const ZOOM_EXIT_MS = 480;
const SHOW_ZOOM_PROGRESS = false;

const zoomMotion = `
@keyframes zoom-progress-in {
  from { transform: translateY(16px); }
  to { transform: translateY(0); }
}
@keyframes zoom-progress-out {
  from { transform: translateY(0); }
  to { transform: translateY(16px); }
}
.zoom-progress-in { animation: zoom-progress-in 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.zoom-progress-out { animation: zoom-progress-out 480ms cubic-bezier(0.4, 0, 0.2, 1) both; }
.zoom-progress-fill { transition: width 420ms cubic-bezier(0.33, 1.25, 0.5, 1); }
@media (prefers-reduced-motion: reduce) {
  .zoom-progress-in, .zoom-progress-out { animation: none; transform: none; }
  .zoom-progress-fill { transition: none; }
}
`;

export function ActionTab() {
  const { tool, setTool } = useCanvasTool();
  const catalog = useBlockCatalog();
  const { zoomTo, fitView } = useReactFlow();
  const [zoom, setZoom] = useState(100);
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoomPhase, setZoomPhase] = useState<ZoomPhase>("off");
  const zoomRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<ZoomPhase>("off");
  const hideTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const revealRef = useRef<() => void>(() => {});
  const applyZoomRef = useRef<(next: number) => void>(() => {});
  const viewportReady = useRef(false);

  function revealZoom() {
    if (!SHOW_ZOOM_PROGRESS) return;
    window.clearTimeout(hideTimer.current ?? undefined);
    window.clearTimeout(exitTimer.current ?? undefined);
    phaseRef.current = "open";
    setZoomPhase("open");
    hideTimer.current = window.setTimeout(() => {
      phaseRef.current = "closed";
      setZoomPhase("closed");
      exitTimer.current = window.setTimeout(() => {
        if (phaseRef.current !== "closed") return;
        phaseRef.current = "off";
        setZoomPhase("off");
      }, ZOOM_EXIT_MS);
    }, ZOOM_VISIBLE_MS);
  }

  revealRef.current = revealZoom;

  function applyZoom(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(next)));
    void zoomTo(value / 100, { duration: 180 });
  }

  applyZoomRef.current = applyZoom;

  useOnViewportChange({
    onChange: ({ zoom: next }) => {
      const percent = Math.round(next * 100);
      const first = !viewportReady.current;
      viewportReady.current = true;
      setZoom((current) => {
        if (current === percent) return current;
        if (!first) revealRef.current();
        return percent;
      });
    },
  });

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!zoomRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.ctrlKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const zoomIn = event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
      const zoomOut = event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
      if (!zoomIn && !zoomOut) return;

      event.preventDefault();
      setZoom((current) => {
        applyZoomRef.current(zoomIn ? current + ZOOM_STEP : current - ZOOM_STEP);
        return current;
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(hideTimer.current ?? undefined);
      window.clearTimeout(exitTimer.current ?? undefined);
    };
  }, []);

  return (
    <div className="relative inline-flex">
      <style>{zoomMotion}</style>
      {SHOW_ZOOM_PROGRESS && zoomPhase !== "off" ? (
        <div
          className={`${zoomPhase === "closed" ? "zoom-progress-out" : "zoom-progress-in"} absolute right-0 bottom-[calc(100%+var(--spacing-1-5))] left-0 z-0 px-4`}
        >
          <ZoomProgress value={zoom} />
        </div>
      ) : null}
      <div
        role="toolbar"
        aria-label="Outils"
        className="relative z-10 inline-flex items-center gap-[var(--spacing-1)] rounded-full border-[0.5px] border-solid border-bo-2 bg-[var(--surface-su-sidebar)] p-[var(--spacing-2,8px)] shadow-[var(--shadow-light-xs)]"
      >
        <div ref={zoomRef} className="relative">
          {menuOpen ? (
            <div className="absolute bottom-[calc(100%+var(--spacing-1)+var(--spacing-2,8px)+0.5px)] left-0 z-20">
              <ZoomMenu
                zoom={zoom}
                onZoomIn={() => applyZoom(zoom + ZOOM_STEP)}
                onZoomOut={() => applyZoom(zoom - ZOOM_STEP)}
                onZoomTo={applyZoom}
                onFit={() => {
                  void fitView({ duration: 180, minZoom: MIN_ZOOM / 100, maxZoom: 1 });
                }}
              />
            </div>
          ) : null}
          <Button
            kind="button"
            tone="grey"
            className="tabular-nums"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            leadingIcon={<MagnifyingGlass />}
            trailingIcon={<CaretDown />}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="inline-grid">
              <span className="invisible col-start-1 row-start-1" aria-hidden="true">
                {MAX_ZOOM}%
              </span>
              <span className="col-start-1 row-start-1 text-center">{zoom}%</span>
            </span>
          </Button>
        </div>
        <Button
          kind="icon"
          tone={tool === "hand" ? "blue" : "grey"}
          selected={tool === "hand"}
          tooltip="Drag"
          hotkey="H"
          aria-pressed={tool === "hand"}
          aria-label="Drag"
          onClick={() => setTool("hand")}
        >
          <Hand />
        </Button>
        <Button
          kind="icon"
          tone={tool === "cursor" ? "blue" : "grey"}
          selected={tool === "cursor"}
          tooltip="Pointer"
          hotkey="V"
          aria-pressed={tool === "cursor"}
          aria-label="Pointer"
          onClick={() => setTool("cursor")}
        >
          <Cursor />
        </Button>
        <Button kind="button" tone="grey" leadingIcon={<Plus />} onClick={catalog.show}>
          Add block
        </Button>
        <Button kind="icon" tone="grey" tooltip="Undo" hotkey="Z" aria-label="Undo">
          <ArrowUUpLeft />
        </Button>
        <Button kind="icon" tone="grey" tooltip="Redo" hotkey="Y" aria-label="Redo">
          <ArrowUUpRight />
        </Button>
        <Button kind="icon" tone="grey" tooltip="Tidy up" hotkey="T" aria-label="Tidy up">
          <Broom />
        </Button>
      </div>
    </div>
  );
}
