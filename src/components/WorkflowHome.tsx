"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ActionTab } from "@/components/ActionTab";
import { BlockCatalogProvider } from "@/components/block-catalog";
import { CanvasToolProvider } from "@/components/canvas-tool";
import { FieldBackdrop } from "@/components/FieldBackdrop";
import { NewWorkflow } from "@/components/NewWorkflow";
import { EditorTabs, ProductSidebar, WorkflowHeader } from "@/components/ProductShell";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import type { WorkflowPreset } from "@/components/workflow-presets";

function ActionBarSlot() {
  const slot = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const slotEl = slot.current;
    const host = slotEl?.offsetParent as HTMLElement | null;
    if (!slotEl || !host) return;

    let panelObserver: ResizeObserver | null = null;
    let watched: Element | null = null;

    const place = () => {
      const panel = host.querySelector("[data-canvas-panel]");
      const bar = slotEl.firstElementChild as HTMLElement | null;
      const hostRect = host.getBoundingClientRect();
      const barWidth = bar?.offsetWidth ?? 0;
      const barHeight = bar?.offsetHeight ?? 36;
      let limit = hostRect.right - 12;
      if (panel) {
        const panelRect = panel.getBoundingClientRect();
        const barTop = hostRect.bottom - 12 - barHeight;
        if (panelRect.bottom > barTop - 8) limit = panelRect.left - 12;
      }
      const available = limit - hostRect.left;
      const centered = (available - barWidth) / 2;
      const maxLeft = Math.max(12, available - barWidth);
      slotEl.style.left = `${Math.max(12, Math.min(centered, maxLeft))}px`;
    };

    const watchPanel = () => {
      const panel = host.querySelector("[data-canvas-panel]");
      if (panel === watched) return;
      panelObserver?.disconnect();
      watched = panel;
      if (!panel) return;
      panelObserver = new ResizeObserver(place);
      panelObserver.observe(panel);
    };

    const hostObserver = new ResizeObserver(() => {
      watchPanel();
      place();
    });
    hostObserver.observe(host);
    watchPanel();
    place();
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      hostObserver.disconnect();
      panelObserver?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);

  return (
    <div ref={slot} className="pointer-events-none absolute bottom-3 z-10">
      <div className="pointer-events-auto">
        <ActionTab />
      </div>
    </div>
  );
}

export function WorkflowHome() {
  const [phase, setPhase] = useState<"compose" | "editor">("compose");
  const [preset, setPreset] = useState<WorkflowPreset | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [workflowName, setWorkflowName] = useState("Untitled");

  return (
    <div className="flex h-dvh w-full overflow-hidden rounded-[16px] border-[0.5px] border-solid border-bo-2 bg-[var(--surface-su-sidebar)]">
      <ProductSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col py-2 pr-2">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[6px] border-[0.5px] border-solid border-bo-2 bg-su-main">
          <WorkflowHeader name={workflowName} />
          {phase === "editor" ? (
            <CanvasToolProvider>
              <BlockCatalogProvider>
                <ReactFlowProvider>
                  <div className="relative min-h-0 flex-1">
                    <FieldBackdrop>
                      <div className="absolute inset-0">
                        <WorkflowCanvas
                          key={preset?.id ?? "scratch"}
                          revealed={revealed}
                          onReveal={() => setRevealed(true)}
                          onNameChange={setWorkflowName}
                          seed={
                            preset
                              ? {
                                  name: preset.name,
                                  description: preset.description,
                                  nodes: preset.nodes,
                                  edges: preset.edges,
                                  prompt: preset.prompt,
                                  lines: preset.lines,
                                }
                              : undefined
                          }
                        />
                      </div>
                      <div className="pointer-events-none absolute top-4 left-4 z-10">
                        <div className="pointer-events-auto">
                          <EditorTabs />
                        </div>
                      </div>
                      <ActionBarSlot />
                    </FieldBackdrop>
                  </div>
                </ReactFlowProvider>
              </BlockCatalogProvider>
            </CanvasToolProvider>
          ) : (
            <div className="min-h-0 flex-1">
              <NewWorkflow
                onStart={() => {
                  setPreset(null);
                  setRevealed(false);
                  setPhase("editor");
                }}
                onGenerate={(next) => {
                  setRevealed(false);
                  setPreset(next);
                  setPhase("editor");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
