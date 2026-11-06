"use client";

import { FormEvent, useLayoutEffect, useRef, useState } from "react";
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/Button";
import { Plus } from "@/components/icons";
import { EditorTabs } from "@/components/ProductShell";
import { TemplatePanel } from "@/components/TemplatePanel";
import { WORKFLOW_PRESETS, type WorkflowPreset } from "@/components/workflow-presets";

export function NewWorkflow({
  onStart,
  onGenerate,
}: {
  onStart: () => void;
  onGenerate: (preset: WorkflowPreset) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState(false);
  const [reserve, setReserve] = useState(0);
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = host.current;
    if (!root || !catalog) {
      setReserve(0);
      return;
    }
    const place = () => {
      const panel = root.querySelector("[data-canvas-panel]");
      setReserve(panel ? Math.round(panel.getBoundingClientRect().width) + 24 : 0);
    };
    const observer = new ResizeObserver(place);
    const panel = root.querySelector("[data-canvas-panel]");
    if (panel) observer.observe(panel);
    place();
    return () => observer.disconnect();
  }, [catalog]);

  function fill(preset: WorkflowPreset) {
    setActiveId(preset.id);
    setPrompt(preset.prompt);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const preset = WORKFLOW_PRESETS.find((item) => item.id === activeId && item.prompt === prompt);
    if (preset) onGenerate(preset);
    else onStart();
  }

  return (
    <div ref={host} className="relative h-full">
      <div className="pointer-events-none absolute inset-0">
        <ReactFlowProvider>
          <ReactFlow
            nodes={[]}
            edges={[]}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            preventScrolling
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={12}
              color="rgb(145 145 154 / 75%)"
              bgColor="var(--surface-su-body)"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div className="pointer-events-none absolute top-4 left-4 z-10">
        <div className="pointer-events-auto">
          <EditorTabs />
        </div>
      </div>
      {catalog ? (
        <TemplatePanel
          presets={WORKFLOW_PRESETS}
          activeId={activeId}
          onClose={() => setCatalog(false)}
          onPick={fill}
        />
      ) : null}
      <div
        className="relative z-10 flex h-full items-center justify-center"
        style={reserve ? { paddingRight: reserve } : undefined}
      >
        <div className="flex flex-col items-center gap-12">
          <form
            onSubmit={submit}
            className="flex flex-col items-center overflow-hidden rounded-[12px] border-[0.5px] border-solid border-bo-3 bg-[var(--grey-bg-2)] shadow-[var(--shadow-light-sm)]"
          >
            <div className="flex h-[100px] w-full flex-col items-end justify-end gap-2 rounded-[12px] border-[0.5px] border-solid border-bo-3 bg-su-light-elevation p-3 shadow-[0_-8px_12px_-4px_rgba(28,25,23,0.02)]">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe your workflow..."
                aria-label="Describe your workflow"
                rows={2}
                className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-5 font-normal tracking-[-0.015em] text-fg-primary outline-none placeholder:text-[var(--grey-fg-tertiary)]"
              />
              <Button kind="icon" tone="blue" type="submit" aria-label="Start" className="!size-6">
                <img src="/shell/arrow-up.svg" width={14} height={14} alt="" />
              </Button>
            </div>
            <div className="flex items-center gap-2 p-2">
              {WORKFLOW_PRESETS.slice(0, 3).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => fill(preset)}
                  className="flex cursor-pointer items-center gap-1 rounded-[10px] border-[0.5px] border-solid border-bo-2 bg-white py-1 pr-2 pl-1 drop-shadow-[0_1px_1px_rgba(28,25,23,0.02)] outline-none hover:border-[var(--grey-bo-3-hover,#cfccc8)] hover:bg-[var(--grey-bg-2,#f8f7f7)] focus:outline-none focus-visible:outline-none"
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-[6px] p-1"
                    style={{ backgroundColor: preset.tint }}
                  >
                    <img src={preset.icon} width={16} height={16} alt="" />
                  </span>
                  <span className="text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] whitespace-nowrap text-fg-secondary">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </form>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setCatalog(true)}
              className="cursor-pointer text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary outline-none"
            >
              Browse all templates
            </button>
            <span className="text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-[var(--grey-fg-tertiary)]">
              or
            </span>
            <Button tone="grey" type="button" leadingIcon={<Plus />} onClick={onStart}>
              Start from scratch
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
