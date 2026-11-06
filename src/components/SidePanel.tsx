"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { FloatingPanel } from "@/components/FloatingPanel";
import { TabSelector } from "@/components/TabSelector";
import { ArrowLeft, CaretDown, Package, Sparkle, Warning, WarningCircle } from "@/components/icons";
import { BlockGlyph, TriggerMenu, type BlockTone, type TriggerOption } from "@/components/TriggerMenu";
import { AssistantThread } from "@/components/WorkflowBuild";
import type { BlockData } from "@/components/WorkflowNode";

export type WorkflowDetails = {
  name: string;
  description: string;
};

export type AttentionItem = {
  id: string;
  data: BlockData;
  tone: "error" | "configure";
  detail: string;
};

const FREQUENCIES = ["Every weekday", "Every day", "Every week"];
const AI_PROVIDERS = [
  { value: "openai", label: "ChatGPT", icon: "/block-icons/chatgpt.svg" },
  { value: "anthropic", label: "Anthropic", icon: "/block-icons/anthropic.svg" },
  { value: "mistral", label: "Mistral", icon: "/block-icons/mistral.svg" },
  { value: "deepseek", label: "DeepSeek", icon: "/block-icons/deepseek.svg" },
];
const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { value: "o3", label: "o3" },
  ],
  anthropic: [
    { value: "claude-opus-4", label: "Claude Opus 4" },
    { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "claude-haiku-3.5", label: "Claude Haiku 3.5" },
  ],
  mistral: [
    { value: "mistral-large", label: "Mistral Large" },
    { value: "mistral-small", label: "Mistral Small" },
    { value: "codestral", label: "Codestral" },
  ],
  deepseek: [
    { value: "deepseek-v3", label: "DeepSeek V3" },
    { value: "deepseek-r1", label: "DeepSeek R1" },
    { value: "deepseek-coder", label: "DeepSeek Coder" },
  ],
};
const TIMEZONES = ["Europe/Paris", "Europe/London", "America/New_York", "UTC"];

const TONE_GROUP: Record<BlockTone, string> = {
  purple: "Logic",
  orange: "Time",
  yellow: "Data",
  pink: "Communication",
  turquoise: "Billing",
  grey: "Integration",
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function isScheduleBlock(data: BlockData) {
  return data.icon === "clock" || data.icon === "calendar-blank" || data.icon === "hourglass";
}

function runsLabel(frequency: string, time: string, timezone: string) {
  if (!frequency || !time || !timezone) return null;
  if (frequency === "Every weekday") return `Runs Mon - Fri at ${time} (${timezone}).`;
  if (frequency === "Every day") return `Runs every day at ${time} (${timezone}).`;
  if (frequency === "Every week") return `Runs once a week at ${time} (${timezone}).`;
  return `Runs ${frequency} at ${time} (${timezone}).`;
}

function primaryLabel(data: BlockData) {
  if (data.trigger || data.tone === "purple") return "Condition";
  if (data.icon === "envelope") return "Message";
  return "Summary";
}

function IssueCallout({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1 rounded-[var(--rounded-md,8px)] border-[0.5px] border-solid border-[var(--orange-bo-3,#f0cfc0)] bg-[var(--orange-bg-2,#fdf7f4)] p-3">
      <img src="/panel-icons/info.svg" width={14} height={14} alt="" />
      <p className="text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--orange-fg-accent,#d97040)]">
        {message}
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-[6px]">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)]">
          {label}
        </span>
        {hint ? (
          <span className="text-[12px] leading-4 tracking-[-0.18px] text-[var(--grey-fg-tertiary,#999390)]">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "h-7 w-full rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-white text-[13px] leading-[18px] tracking-[-0.195px] shadow-[var(--shadow-light-sm)] outline-none focus:border-[var(--grey-bo-3-hover,#cfccc8)]";

function TextControl({
  value,
  placeholder,
  onChange,
  icon,
  type = "text",
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  type?: "text" | "password";
}) {
  return (
    <span className="relative flex h-7 min-w-0 flex-1 items-center">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={type === "password" ? "off" : undefined}
        spellCheck={type === "password" ? false : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          controlClass,
          "px-2 text-[var(--grey-fg-primary,#44403c)] placeholder:text-[var(--grey-fg-tertiary,#999390)]",
          icon ? "pr-7" : false,
        )}
      />
      {icon ? <span className="pointer-events-none absolute right-2 flex">{icon}</span> : null}
    </span>
  );
}

function PromptControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      rows={3}
      placeholder="What should the model write?"
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[72px] w-full resize-none rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-white px-2 py-1.5 text-[13px] leading-[18px] tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)] shadow-[var(--shadow-light-sm)] outline-none placeholder:text-[var(--grey-fg-tertiary,#999390)] focus:border-[var(--grey-bo-3-hover,#cfccc8)]"
    />
  );
}

function SelectControl({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <span className="relative flex h-7 min-w-0 flex-1 items-center">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          controlClass,
          "appearance-none pr-7 pl-2",
          value ? "text-[var(--grey-fg-primary,#44403c)]" : "text-[var(--grey-fg-tertiary,#999390)]",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 flex text-[var(--grey-fg-secondary,#78716c)]">
        <CaretDown />
      </span>
    </span>
  );
}

function BlockMark({ data }: { data: BlockData }) {
  if (data.icon && data.tone) return <BlockGlyph icon={data.icon} tone={data.tone} trigger={data.trigger} />;
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--blue-bg-3,#e3eaf1)] text-[var(--blue-fg-accent,#1f74c6)]">
      <Package />
    </span>
  );
}

function WorkflowMark() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-[var(--grey-bg-3,#f3f2f1)] p-1">
      <img src="/panel-icons/path.svg" width={16} height={16} alt="" />
    </span>
  );
}

export function SidePanel({
  collapsed,
  onToggleCollapsed,
  workflow,
  onWorkflowChange,
  attention,
  onSelectBlock,
  block,
  issue,
  onBlockChange,
  catalog,
  nextLabel,
  onOpenCatalog,
  onCloseCatalog,
  onPickBlock,
  assistant,
  onAssistantDone,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  workflow: WorkflowDetails;
  onWorkflowChange: (patch: Partial<WorkflowDetails>) => void;
  attention: AttentionItem[];
  onSelectBlock: (id: string) => void;
  block: { id: string; data: BlockData } | null;
  issue: string | null;
  onBlockChange: (patch: Partial<BlockData>) => void;
  catalog: boolean;
  nextLabel: string | null;
  onOpenCatalog: () => void;
  onCloseCatalog: () => void;
  onPickBlock: (option: TriggerOption) => void;
  assistant?: { prompt: string; lines: string[] } | null;
  onAssistantDone?: () => void;
}) {
  const mode = block ? "block" : "workflow";
  const aiWorkflow = Boolean(assistant) && mode === "workflow";
  const title = block ? block.data.title : workflow.name.trim() || "Untitled workflow";
  const subtitle = block
    ? block.data.trigger
      ? "Trigger"
      : block.data.tone
        ? TONE_GROUP[block.data.tone]
        : "Block"
    : "Workflow";
  const schedule = block ? isScheduleBlock(block.data) : false;
  const hint = block ? runsLabel(block.data.frequency ?? "", block.data.time ?? "", block.data.timezone ?? "") : null;
  const [panelTab, setPanelTab] = useState<"details" | "assistant">(assistant ? "assistant" : "details");

  return (
    <FloatingPanel label={block ? block.data.title : "Workflow"} collapsed={collapsed}>
      <div
        onClick={
          collapsed
            ? (event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                onToggleCollapsed();
              }
            : undefined
        }
        className={cn(
          "flex w-full gap-2 border-b-[0.5px] border-solid p-4",
          collapsed
            ? "cursor-pointer items-center border-[var(--grey-bo-1,#eeeceb)]"
            : "items-start border-[var(--grey-bo-2,#e2dfdd)]",
        )}
      >
        {block ? <BlockMark data={block.data} /> : <WorkflowMark />}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate text-[15px] leading-[22px] font-medium tracking-[-0.225px] text-black">{title}</p>
          {collapsed ? null : (
            <p className="truncate text-[length:var(--text-regular-base-size)] leading-[var(--text-regular-base-leading)] font-normal tracking-[var(--text-regular-base-tracking)] text-[var(--grey-fg-secondary,#78716c)]">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {catalog ? (
            <Button kind="icon" tone="grey" aria-label="Back" onClick={onCloseCatalog} className="!size-6">
              <ArrowLeft />
            </Button>
          ) : null}
          <Button
            kind="icon"
            tone="grey"
            aria-label={collapsed ? "Expand panel" : "Collapse panel"}
            onClick={onToggleCollapsed}
            className="!size-6"
          >
            <img
              src={collapsed ? "/panel-icons/arrow-line-left.svg" : "/panel-icons/sidebar-simple.svg"}
              width={14}
              height={14}
              alt=""
            />
          </Button>
        </div>
      </div>
      {collapsed ? null : catalog ? (
        <TriggerMenu embedded onSelect={onPickBlock} onClose={onCloseCatalog} />
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {aiWorkflow ? (
            <div className="border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] px-4 pt-4 pb-4">
              <TabSelector
                label="Panel"
                value={panelTab}
                onChange={setPanelTab}
                options={[
                  { value: "details", label: "Details" },
                  { value: "assistant", label: "Assistant", icon: <Sparkle /> },
                ]}
              />
            </div>
          ) : null}
          {assistant ? (
            <div
              aria-hidden={!(aiWorkflow && panelTab === "assistant")}
              className={cn(
                "flex min-h-0 flex-col",
                aiWorkflow && panelTab === "assistant"
                  ? "min-h-0 flex-1"
                  : "pointer-events-none absolute h-0 w-full overflow-hidden opacity-0",
              )}
            >
              <AssistantThread prompt={assistant.prompt} lines={assistant.lines} onDone={() => onAssistantDone?.()} />
            </div>
          ) : null}
          {aiWorkflow && panelTab === "assistant" ? null : !block ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
            <p className="text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)]">
              Status
            </p>
            <span className="inline-flex h-5 items-center rounded-[4px] bg-[var(--grey-bg-4,#eceae9)] px-[6px] text-[12px] leading-4 font-medium tracking-[-0.18px] text-[var(--grey-fg-secondary,#78716c)]">
              Draft
            </span>
          </div>
          <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
            <Field label="Name">
              <TextControl value={workflow.name} onChange={(name) => onWorkflowChange({ name })} />
            </Field>
            <Field label="Description">
              <TextControl
                value={workflow.description}
                placeholder="Add a description…"
                onChange={(description) => onWorkflowChange({ description })}
              />
            </Field>
          </div>
          {attention.length > 0 ? (
            <div className="flex flex-col gap-[var(--spacing-2,8px)] p-4">
              <p className="text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)]">
                {attention.length === 1 ? "1 block needs your attention" : `${attention.length} blocks need your attention`}
              </p>
              <div className="flex flex-col gap-2">
                {attention.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectBlock(item.id)}
                    className={cn(
                      "flex h-16 w-full cursor-pointer items-start gap-2 rounded-[12px] border-[0.5px] border-solid bg-white p-3 text-left hover:bg-[var(--grey-bg-action-hover,#f5f5f4)]",
                      item.tone === "error"
                        ? "border-[var(--red-fg-accent,#c92a2a)]"
                        : "border-[var(--grey-bo-2,#e2dfdd)]",
                    )}
                  >
                    <BlockMark data={item.data} />
                    <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="truncate text-[14px] leading-5 font-medium tracking-[-0.21px] text-[var(--grey-fg-primary,#44403c)]">
                        {item.data.title}
                      </span>
                      <span className="flex w-full items-center gap-1">
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[13px] leading-[18px] tracking-[-0.195px]",
                            item.tone === "error"
                              ? "text-[var(--red-fg-accent,#c92a2a)]"
                              : "text-[var(--grey-fg-disabled,#c3bfbc)]",
                          )}
                        >
                          {item.detail}
                        </span>
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center",
                            item.tone === "error"
                              ? "text-[var(--red-fg-accent,#c92a2a)]"
                              : "text-[var(--orange-fg-accent,#d97040)]",
                          )}
                        >
                          {item.tone === "error" ? <Warning /> : <WarningCircle />}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {schedule ? (
            <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
              {issue ? <IssueCallout message={issue} /> : null}
              <Field label="Frequency">
                <SelectControl
                  value={block.data.frequency ?? ""}
                  placeholder="Choose a frequency"
                  options={FREQUENCIES.map((item) => ({ value: item, label: item }))}
                  onChange={(frequency) => onBlockChange({ frequency })}
                />
              </Field>
              <div className="flex gap-3">
                <Field label="Time">
                  <TextControl
                    value={block.data.time ?? ""}
                    placeholder="09:00"
                    onChange={(time) => onBlockChange({ time })}
                    icon={<img src="/panel-icons/clock.svg" width={14} height={14} alt="" />}
                  />
                </Field>
                <Field label="Timezone">
                  <SelectControl
                    value={block.data.timezone ?? ""}
                    placeholder="Choose"
                    options={TIMEZONES.map((item) => ({ value: item, label: item }))}
                    onChange={(timezone) => onBlockChange({ timezone })}
                  />
                </Field>
              </div>
              {hint ? (
                <p className="text-[12px] leading-4 tracking-[-0.18px] text-[var(--grey-fg-tertiary,#999390)]">{hint}</p>
              ) : null}
            </div>
          ) : block.data.icon === "sparkle" ? (
            <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
              {issue ? <IssueCallout message={issue} /> : null}
              <Field label="Provider">
                <Dropdown
                  value={block.data.provider ?? ""}
                  placeholder="Choose a provider"
                  options={AI_PROVIDERS}
                  onChange={(provider) => onBlockChange({ provider, model: "" })}
                />
              </Field>
              <Field label="Model">
                <Dropdown
                  value={block.data.model ?? ""}
                  placeholder={block.data.provider ? "Choose a model" : "Choose a provider first"}
                  options={AI_MODELS[block.data.provider ?? ""] ?? []}
                  onChange={(model) => onBlockChange({ model })}
                />
              </Field>
              <Field label="API key">
                <TextControl
                  type="password"
                  value={block.data.apiKey ?? ""}
                  placeholder="Paste your API key"
                  onChange={(apiKey) => onBlockChange({ apiKey })}
                />
              </Field>
              <Field label="Prompt">
                <PromptControl value={block.data.summary} onChange={(summary) => onBlockChange({ summary })} />
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
              {issue ? <IssueCallout message={issue} /> : null}
              <Field label={primaryLabel(block.data)}>
                <TextControl value={block.data.summary} onChange={(summary) => onBlockChange({ summary })} />
              </Field>
            </div>
          )}
          <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
            <Field label="Description" hint="Optional">
              <TextControl
                value={block.data.description ?? ""}
                placeholder="Add a description…"
                onChange={(description) => onBlockChange({ description })}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <Field label="Next step">
              <span className="flex items-center gap-[6px]">
                <img src="/panel-icons/arrow-elbow-down-right.svg" width={14} height={14} alt="" />
                <span className="relative flex h-7 min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={onOpenCatalog}
                    className={cn(
                      controlClass,
                      "flex cursor-pointer items-center pr-7 pl-2 text-left",
                      nextLabel
                        ? "text-[var(--grey-fg-primary,#44403c)]"
                        : "text-[var(--grey-fg-tertiary,#999390)]",
                    )}
                  >
                    <span className="truncate">{nextLabel ?? "Add a block…"}</span>
                  </button>
                  <span className="pointer-events-none absolute right-2 flex text-[var(--grey-fg-secondary,#78716c)]">
                    <CaretDown />
                  </span>
                </span>
              </span>
            </Field>
          </div>
        </div>
          )}
        </div>
      )}
    </FloatingPanel>
  );
}
