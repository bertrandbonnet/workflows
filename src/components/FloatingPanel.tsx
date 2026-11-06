"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const PANEL_WIDTH = 360;
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 560;

function clampPanelWidth(width: number) {
  const max = Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, window.innerWidth - 80));
  return Math.min(max, Math.max(PANEL_MIN_WIDTH, width));
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function FloatingPanel({
  label,
  collapsed = false,
  initialWidth = PANEL_WIDTH,
  children,
}: {
  label: string;
  collapsed?: boolean;
  initialWidth?: number;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(initialWidth);
  const [handleOn, setHandleOn] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [handleY, setHandleY] = useState<number | null>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    const clamp = () => setWidth((current) => clampPanelWidth(current));
    window.addEventListener("resize", clamp);
    clamp();
    return () => window.removeEventListener("resize", clamp);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging]);

  function trackHandle(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    setHandleY(Math.min(Math.max(y, 12), Math.max(12, rect.height - 12)));
  }

  function onResizeDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone; the move handler still tracks the drag.
    }
    drag.current = { x: event.clientX, width };
    setDragging(true);
    setHandleOn(true);
    trackHandle(event);
  }

  function onResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setWidth(clampPanelWidth(drag.current.width + drag.current.x - event.clientX));
    trackHandle(event);
  }

  function onResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setHandleY(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    setHandleOn(inside);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 32 : 16;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth((current) => clampPanelWidth(current + step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth((current) => clampPanelWidth(current - step));
    }
  }

  return (
    <aside
      data-canvas-panel
      aria-label={label}
      style={collapsed ? undefined : { width }}
      className={cn("absolute top-3 right-3 z-20", collapsed ? "h-fit w-[240px]" : "bottom-3")}
    >
      <div
        className={cn(
          "relative z-10 flex min-h-0 flex-col overflow-hidden rounded-[12px] border-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] bg-[var(--surface-su-light-elevation,#ffffff)] shadow-[var(--shadow-light-sm)]",
          collapsed ? "h-fit" : "h-full",
        )}
      >
        {children}
      </div>
      {collapsed ? null : (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuemin={PANEL_MIN_WIDTH}
          aria-valuemax={PANEL_MAX_WIDTH}
          aria-valuenow={Math.round(width)}
          tabIndex={0}
          onPointerEnter={() => setHandleOn(true)}
          onPointerLeave={() => {
            if (!drag.current) setHandleOn(false);
          }}
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          onKeyDown={onResizeKey}
          className="absolute inset-y-0 -left-6 z-0 w-8 cursor-col-resize touch-none outline-none"
        >
          <span
            className="pointer-events-none absolute left-6 h-6 w-1 rounded-full bg-[var(--grey-bo-3-hover,#cfccc8)] transition-transform duration-200 ease-out"
            style={{
              top: handleY == null ? "50%" : handleY,
              transform:
                handleOn || dragging
                  ? "translate(calc(-50% - 10px), -50%)"
                  : "translate(calc(-50% + 8px), -50%)",
            }}
          />
        </div>
      )}
    </aside>
  );
}
