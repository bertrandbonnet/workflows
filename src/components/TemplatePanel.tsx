"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FloatingPanel } from "@/components/FloatingPanel";
import { MagnifyingGlass, X } from "@/components/icons";
import { TEMPLATE_FAMILIES, type WorkflowPreset } from "@/components/workflow-presets";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const FILLED_ICON: Record<string, string> = {
  overdue: "/card-icons/clock-fill.svg",
  renewal: "/card-icons/call-bell-fill.svg",
  recovery: "/card-icons/wallet-fill.svg",
  quote: "/card-icons/file-text-fill.svg",
  welcome: "/card-icons/users-three-fill.svg",
  trial: "/card-icons/calendar-blank-fill.svg",
  paid: "/card-icons/checks-fill.svg",
  usage: "/card-icons/chart-line-fill.svg",
  approval: "/card-icons/notepad-fill.svg",
  cancel: "/card-icons/arrows-clockwise-fill.svg",
};

function StepIcon({ name }: { name: string }) {
  return (
    <img
      src={`/block-icons/${name}.svg`}
      width={16}
      height={16}
      alt=""
      className="block size-4 max-w-none shrink-0"
      style={{ width: 16, height: 16, filter: "url(#template-step-grey)" }}
    />
  );
}

export function TemplateCard({
  preset,
  selected,
  onClick,
}: {
  preset: WorkflowPreset;
  selected: boolean;
  onClick: () => void;
}) {
  const steps = preset.nodes.slice(0, 5);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex h-full w-full cursor-pointer flex-col items-start gap-[10px] rounded-[12px] border-[0.5px] border-solid bg-su-light-elevation p-3 text-left shadow-none outline-none transition-shadow duration-150 hover:shadow-[var(--shadow-light-sm)]",
        selected ? "border-bo-3" : "border-bo-2",
      )}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-[6px] p-1"
        style={{ backgroundColor: preset.tint }}
      >
        <img
          src={FILLED_ICON[preset.id] ?? preset.icon}
          width={16}
          height={16}
          alt=""
          className="block size-4 max-w-none shrink-0"
          style={{ width: 16, height: 16 }}
        />
      </span>
      <span className="w-full text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary">
        {preset.name}
      </span>
      <span className="w-full text-[length:var(--text-regular-base-size)] leading-[var(--text-regular-base-leading)] font-normal tracking-[var(--text-regular-base-tracking)] text-fg-secondary">
        {preset.card}
      </span>
      <span className="mt-auto flex items-center">
        {steps.map((step, index) => (
          <span key={step.id} className="flex items-center">
            {index > 0 ? (
              <span className="w-[15px] border-t-[0.5px] border-dashed border-bo-2" />
            ) : null}
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] border-[0.5px] border-dashed border-bo-2 bg-[var(--grey-bg-1,#fafaf9)]">
              <StepIcon name={step.data.icon ?? "clock"} />
            </span>
          </span>
        ))}
      </span>
    </button>
  );
}

export function TemplatePanel({
  presets,
  activeId,
  onClose,
  onPick,
}: {
  presets: WorkflowPreset[];
  activeId: string | null;
  onClose: () => void;
  onPick: (preset: WorkflowPreset) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? presets.filter((preset) =>
        [preset.name, preset.label, preset.card, preset.description].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
    : presets;
  const groups = TEMPLATE_FAMILIES.map((item) => ({
    ...item,
    presets: visible.filter((preset) => preset.family === item.id),
  })).filter((group) => group.presets.length > 0);

  return (
    <FloatingPanel label="Templates" initialWidth={360}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id="template-step-grey" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.470588 0 0 0 0 0.443137 0 0 0 0 0.423529 0 0 0 1 0"
          />
        </filter>
      </svg>
      <div className="flex items-start gap-2 border-b-[0.5px] border-solid border-bo-2 p-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-[15px] leading-[22px] font-medium tracking-[-0.225px] text-black">Templates</p>
          <p className="truncate text-[length:var(--text-regular-base-size)] leading-[var(--text-regular-base-leading)] font-normal tracking-[var(--text-regular-base-tracking)] text-fg-secondary">
            Start from a ready-made workflow
          </p>
        </div>
        <Button kind="icon" tone="grey" aria-label="Close" onClick={onClose} className="!size-6">
          <X />
        </Button>
      </div>
      <div className="shrink-0 px-3 py-3">
        <label className="flex h-7 items-center gap-[6px] rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-[var(--grey-bg-action,#ffffff)] px-2 text-[var(--grey-fg-secondary,#78716c)] shadow-[var(--shadow-light-sm)] focus-within:border-[var(--grey-bo-3-hover,#cfccc8)]">
          <MagnifyingGlass />
          <input
            value={query}
            placeholder="Search templates..."
            aria-label="Search templates"
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] font-normal tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)] outline-none placeholder:text-[var(--grey-fg-tertiary,#999390)]"
          />
        </label>
      </div>
      <div className="h-[0.5px] w-full shrink-0 bg-[var(--grey-bo-2,#e2dfdd)]" role="separator" />
      <div className="@container flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-3 pb-4">
        {groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-2">
            <p className="text-[12px] leading-4 font-normal tracking-[-0.18px] text-fg-secondary">
              {group.label}
            </p>
            <div className="grid grid-cols-1 items-stretch gap-3 @min-[420px]:grid-cols-2">
              {group.presets.map((preset) => (
                <TemplateCard
                  key={preset.id}
                  preset={preset}
                  selected={preset.id === activeId}
                  onClick={() => onPick(preset)}
                />
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] leading-4 text-[var(--grey-fg-tertiary,#999390)]">
            No templates
          </p>
        ) : null}
      </div>
    </FloatingPanel>
  );
}
