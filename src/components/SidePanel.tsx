"use client";

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/Button";
import { Dropdown, GreyIcon } from "@/components/Dropdown";
import { FloatingPanel } from "@/components/FloatingPanel";
import { TabSelector } from "@/components/TabSelector";
import { ArrowLeft, CaretDown, Package, Plus, Trash, Warning, WarningCircle, X } from "@/components/icons";
import { BlockGlyph, TriggerMenu, type BlockTone, type TriggerOption } from "@/components/TriggerMenu";
import { AssistantThread } from "@/components/WorkflowBuild";
import { blockOutputs, switchCases, type BlockData } from "@/components/WorkflowNode";

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
  return data.title === "On a schedule";
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

type SetupChoice = string | { value: string; icon?: string };

type SetupField = {
  key: string;
  label: string;
  placeholder: string;
  options?: SetupChoice[];
  greyIcons?: boolean;
  area?: boolean;
};

function setupOption(option: SetupChoice) {
  return typeof option === "string"
    ? { value: option, label: option }
    : { value: option.value, label: option.value, icon: option.icon };
}

type BlockSetup = {
  fields: SetupField[];
  summary: (config: Record<string, string>) => string;
};

function filled(config: Record<string, string>, keys: string[]) {
  return keys.map((key) => config[key]?.trim()).filter(Boolean).join(" · ");
}

const BLOCK_SETUPS: Record<string, BlockSetup> = {
  Switch: {
    fields: [{ key: "value", label: "Match", placeholder: "The value to compare" }],
    summary: (config) => config.value?.trim() ?? "",
  },
  "For each": {
    fields: [{ key: "list", label: "For each", placeholder: "Unpaid invoices", options: ["Unpaid invoices", "Customers", "Subscriptions", "Quotes"] }],
    summary: (config) => (config.list ? `Each ${config.list.toLowerCase()}` : ""),
  },
  Loop: {
    fields: [{ key: "until", label: "Repeat until", placeholder: "Every invoice is handled" }],
    summary: (config) => config.until?.trim() ?? "",
  },
  "Request approval": {
    fields: [
      { key: "who", label: "Ask", placeholder: "Finance", options: ["Finance", "Account owner", "An admin"] },
      { key: "about", label: "To approve", placeholder: "Invoices over €10,000" },
    ],
    summary: (config) => filled(config, ["who", "about"]),
  },
  Stop: {
    fields: [{ key: "reason", label: "Reason", placeholder: "No payment method" }],
    summary: (config) => config.reason?.trim() ?? "",
  },
  Delay: {
    fields: [
      { key: "amount", label: "Wait", placeholder: "3" },
      { key: "unit", label: "Unit", placeholder: "Days", options: ["Minutes", "Hours", "Days"] },
    ],
    summary: (config) => (config.amount?.trim() ? `Wait ${config.amount.trim()} ${(config.unit || "days").toLowerCase()}` : ""),
  },
  "Delay until": {
    fields: [{ key: "date", label: "Wait until", placeholder: "The due date" }],
    summary: (config) => (config.date?.trim() ? `Until ${config.date.trim()}` : ""),
  },
  "Wait for event": {
    fields: [{ key: "event", label: "Wait until", placeholder: "Choose an event", options: ["Invoice paid", "Quote signed", "Payment received", "Customer updated"] }],
    summary: (config) => (config.event ? `Wait for ${config.event.toLowerCase()}` : ""),
  },
  "Find records": {
    fields: [
      {
        key: "record",
        label: "Look for",
        placeholder: "Choose a record",
        greyIcons: true,
        options: [
          { value: "Invoices", icon: "/shell/file-text.svg" },
          { value: "Customers", icon: "/shell/users-three.svg" },
          { value: "Subscriptions", icon: "/shell/arrows-clockwise.svg" },
          { value: "Quotes", icon: "/shell/notepad.svg" },
        ],
      },
      { key: "filter", label: "Matching", placeholder: "Unpaid" },
    ],
    summary: (config) => filled(config, ["record", "filter"]),
  },
  "Get record": {
    fields: [{ key: "record", label: "Get", placeholder: "Choose a record", options: ["Customer", "Invoice", "Subscription", "Quote"] }],
    summary: (config) => config.record?.trim() ?? "",
  },
  "Update customer": {
    fields: [
      { key: "field", label: "Update", placeholder: "Choose a field", options: ["Name", "Billing email", "Property"] },
      { key: "value", label: "To", placeholder: "The new value" },
    ],
    summary: (config) => filled(config, ["field", "value"]),
  },
  Formula: {
    fields: [{ key: "expression", label: "Formula", placeholder: "amount_due * 1.2" }],
    summary: (config) => config.expression?.trim() ?? "",
  },
  "Adjust time": {
    fields: [
      { key: "direction", label: "Adjust", placeholder: "Add", options: ["Add", "Subtract"] },
      { key: "amount", label: "By", placeholder: "3 days" },
    ],
    summary: (config) => filled(config, ["direction", "amount"]),
  },
  "Parse JSON": {
    fields: [{ key: "path", label: "Read", placeholder: "customer.email" }],
    summary: (config) => config.path?.trim() ?? "",
  },
  "Aggregate list": {
    fields: [
      { key: "operation", label: "Combine with", placeholder: "Choose", options: ["Sum", "Count", "Average"] },
      { key: "of", label: "Of", placeholder: "Invoice amounts" },
    ],
    summary: (config) => filled(config, ["operation", "of"]),
  },
  "Email your team": {
    fields: [
      { key: "to", label: "To", placeholder: "Finance", options: ["Finance", "Account owner", "The whole team"] },
      { key: "subject", label: "Subject", placeholder: "First reminder" },
    ],
    summary: (config) => config.subject?.trim() || config.to?.trim() || "",
  },
  "Update subscription": {
    fields: [{ key: "change", label: "Change", placeholder: "Choose", options: ["Pause", "Resume", "Update products", "Update price", "Cancel"] }],
    summary: (config) => config.change?.trim() ?? "",
  },
  Slack: {
    fields: [
      { key: "channel", label: "Channel", placeholder: "#billing" },
      { key: "message", label: "Message", placeholder: "This invoice is overdue", area: true },
    ],
    summary: (config) => (config.channel?.trim() ? `Message ${config.channel.trim()}` : config.message?.trim() ?? ""),
  },
  Attio: {
    fields: [
      { key: "action", label: "Action", placeholder: "Choose", options: ["Create a record", "Update a record"] },
      { key: "object", label: "Object", placeholder: "Company" },
    ],
    summary: (config) => filled(config, ["action", "object"]),
  },
  HubSpot: {
    fields: [
      { key: "action", label: "Action", placeholder: "Choose", options: ["Create a contact", "Update a contact"] },
      { key: "email", label: "Email", placeholder: "The customer email" },
    ],
    summary: (config) => filled(config, ["action", "email"]),
  },
  "Run custom code": {
    fields: [{ key: "code", label: "Code", placeholder: "Write the logic for this step", area: true }],
    summary: (config) => (config.code?.trim() ? "Custom code" : ""),
  },
  "Invoice late": {
    fields: [{ key: "days", label: "Late by", placeholder: "1 day" }],
    summary: (config) => (config.days?.trim() ? `Past due by ${config.days.trim()}` : ""),
  },
  "Invoice finalized": {
    fields: [{ key: "send", label: "Then", placeholder: "Choose", options: ["Ready to send", "Send to the customer", "Hold for review"] }],
    summary: (config) => config.send?.trim() ?? "",
  },
  "Invoice settled": {
    fields: [{ key: "notify", label: "Tell", placeholder: "Choose", options: ["The customer", "The account team", "Both"] }],
    summary: (config) => (config.notify ? `Tell ${config.notify.toLowerCase()}` : ""),
  },
  "Payment failed": {
    fields: [{ key: "retry", label: "Retry", placeholder: "Choose", options: ["After 1 day", "After 3 days", "Don't retry"] }],
    summary: (config) => config.retry?.trim() ?? "",
  },
  "Subscription created": {
    fields: [{ key: "include", label: "Include", placeholder: "Products and the next invoice date" }],
    summary: (config) => config.include?.trim() ?? "",
  },
  "Subscription updated": {
    fields: [{ key: "changed", label: "When this changes", placeholder: "Choose", options: ["Products", "Price", "Dates"] }],
    summary: (config) => config.changed?.trim() ?? "",
  },
  "Subscription canceled": {
    fields: [{ key: "reason", label: "Save", placeholder: "The cancellation reason" }],
    summary: (config) => config.reason?.trim() ?? "",
  },
  "Quote signed": {
    fields: [{ key: "minimum", label: "Minimum amount", placeholder: "Any amount" }],
    summary: (config) => config.minimum?.trim() ?? "",
  },
  "Customer created": {
    fields: [{ key: "with", label: "Capture", placeholder: "Name and billing email" }],
    summary: (config) => config.with?.trim() ?? "",
  },
  "Customer updated": {
    fields: [{ key: "field", label: "When this changes", placeholder: "Choose", options: ["Name", "Billing email", "Properties"] }],
    summary: (config) => config.field?.trim() ?? "",
  },
  "Custom property changed": {
    fields: [{ key: "property", label: "Property", placeholder: "Plan" }],
    summary: (config) => config.property?.trim() ?? "",
  },
  "Usage threshold reached": {
    fields: [{ key: "threshold", label: "Threshold", placeholder: "80% of included usage" }],
    summary: (config) => config.threshold?.trim() ?? "",
  },
  "Wallet balance low": {
    fields: [{ key: "limit", label: "Under", placeholder: "€50" }],
    summary: (config) => (config.limit?.trim() ? `Under ${config.limit.trim()}` : ""),
  },
  "Relative to a date": {
    fields: [
      { key: "when", label: "When", placeholder: "Before", options: ["Before", "After"] },
      { key: "days", label: "Offset", placeholder: "7 days" },
      { key: "date", label: "From", placeholder: "Choose a date", options: ["Renewal", "Trial end", "Due date"] },
    ],
    summary: (config) => filled(config, ["when", "days", "date"]),
  },
  "Manual run": {
    fields: [{ key: "who", label: "Who can run it", placeholder: "Choose", options: ["Anyone on the team", "Admins only"] }],
    summary: (config) => config.who?.trim() ?? "",
  },
  "Incoming webhook": {
    fields: [{ key: "source", label: "Called by", placeholder: "The external app" }],
    summary: (config) => config.source?.trim() ?? "",
  },
};

const SETUP_ALIAS: Record<string, string> = {
  "Invoice overdue": "Invoice late",
  "Renewal coming up": "Relative to a date",
  "Quote sent": "Quote signed",
  "Subscription started": "Subscription created",
  "Trial ending": "Relative to a date",
  "Invoice paid": "Invoice settled",
  "Usage crossed": "Usage threshold reached",
  "Invoice drafted": "Invoice finalized",
};

function BlockActions({
  data,
  onChange,
}: {
  data: BlockData;
  onChange: (patch: Partial<BlockData>) => void;
}) {
  if (data.title === "Filter" || data.title === "If / else") {
    return <ConditionBuilder data={data} onChange={onChange} />;
  }

  const setup = BLOCK_SETUPS[data.title] ?? BLOCK_SETUPS[SETUP_ALIAS[data.title] ?? ""];
  if (!setup) {
    return (
      <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
        <Field label={primaryLabel(data)}>
          <TextControl value={data.summary} onChange={(summary) => onChange({ summary })} />
        </Field>
      </div>
    );
  }

  function set(key: string, value: string) {
    const config = { ...data.config, [key]: value };
    const summary = setup.summary(config);
    onChange(summary ? { config, summary } : { config });
  }

  return (
    <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
      {setup.fields.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.area ? (
            <PromptControl
              value={data.config?.[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(value) => set(field.key, value)}
            />
          ) : field.options ? (
            <Dropdown
              value={data.config?.[field.key] ?? ""}
              placeholder={field.placeholder}
              greyIcons={field.greyIcons}
              options={field.options.map(setupOption)}
              onChange={(value) => set(field.key, value)}
            />
          ) : (
            <TextControl
              value={data.config?.[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(value) => set(field.key, value)}
            />
          )}
        </Field>
      ))}
      {data.title === "Switch" ? <SwitchCases data={data} onChange={onChange} /> : null}
    </div>
  );
}

function SwitchCases({
  data,
  onChange,
}: {
  data: BlockData;
  onChange: (patch: Partial<BlockData>) => void;
}) {
  const cases = switchCases(data.config?.cases);

  function commit(next: Array<{ id: string; label: string }>) {
    onChange({ config: { ...data.config, cases: JSON.stringify(next) } });
  }

  return (
    <>
      {cases.map((item, index) => (
        <Field key={item.id} label={`Case ${index + 1}`}>
          <span className="flex items-center gap-2">
            <TextControl
              value={item.label}
              placeholder={`Case ${index + 1}`}
              onChange={(label) => commit(cases.map((entry) => (entry.id === item.id ? { ...entry, label } : entry)))}
            />
            {cases.length > 1 ? (
              <button
                type="button"
                aria-label={`Remove case ${index + 1}`}
                onClick={() => commit(cases.filter((entry) => entry.id !== item.id))}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--grey-fg-secondary,#78716c)]"
              >
                <X />
              </button>
            ) : null}
          </span>
        </Field>
      ))}
      <button
        type="button"
        onClick={() => commit([...cases, { id: crypto.randomUUID(), label: `Case ${cases.length + 1}` }])}
        className="flex cursor-pointer items-center gap-1.5 text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--grey-fg-secondary,#78716c)]"
      >
        <Plus />
        Add case
      </button>
    </>
  );
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

function DashedAddButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-7 w-full cursor-pointer items-center gap-1.5 rounded-full bg-bg-action px-2.5",
        "text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary",
        "shadow-none outline-none hover:bg-bg-action-hover",
        "[&_rect]:stroke-[var(--grey-bo-3,#dbd8d6)] hover:[&_rect]:stroke-[var(--grey-bo-3-hover,#cfccc8)]",
        className,
      )}
      {...props}
    >
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <rect
          x="0.25"
          y="0.25"
          width="calc(100% - 0.5px)"
          height="calc(100% - 0.5px)"
          rx="13.75"
          fill="none"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
      </svg>
      <span className="relative inline-flex text-fg-secondary">
        <Plus />
      </span>
      <span className="relative min-w-0 truncate">{children}</span>
    </button>
  );
}

function NextStepControl({ label, onClick }: { label: string | null; onClick: () => void }) {
  if (!label) {
    return <DashedAddButton onClick={onClick}>Select next block</DashedAddButton>;
  }
  return (
    <span className="flex items-center gap-[6px]">
      <img src="/panel-icons/arrow-elbow-down-right.svg" width={14} height={14} alt="" />
      <span className="relative flex h-7 min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={onClick}
          className={cn(
            controlClass,
            "flex cursor-pointer items-center pr-7 pl-2 text-left",
            label ? "text-[var(--grey-fg-primary,#44403c)]" : "text-[var(--grey-fg-tertiary,#999390)]",
          )}
        >
          <span className="truncate">{label ?? "Add a block…"}</span>
        </button>
        <span className="pointer-events-none absolute right-2 flex text-[var(--grey-fg-secondary,#78716c)]">
          <CaretDown />
        </span>
      </span>
    </span>
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
  placeholder = "What should the model write?",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={3}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-[72px] w-full resize-none rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-white px-2 py-1.5 text-[13px] leading-[18px] tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)] shadow-[var(--shadow-light-sm)] outline-none placeholder:text-[var(--grey-fg-tertiary,#999390)] focus:border-[var(--grey-bo-3-hover,#cfccc8)]"
    />
  );
}

type Condition = { id: string; field: string; operator: string; value: string };

const CONDITION_FIELDS: Array<{ value: string; label: string; icon: string; values?: string[] }> = [
  { value: "invoice.status", label: "Invoice → Status", icon: "/shell/file-text.svg", values: ["Paid", "Unpaid", "Draft", "Void", "Overdue"] },
  { value: "invoice.amount", label: "Invoice → Amount due", icon: "/shell/file-text.svg" },
  { value: "invoice.days", label: "Invoice → Days overdue", icon: "/shell/file-text.svg" },
  { value: "customer.country", label: "Customer → Country", icon: "/shell/users-three.svg", values: ["France", "United Kingdom", "United States", "Germany"] },
  { value: "subscription.status", label: "Subscription → Status", icon: "/shell/arrows-clockwise.svg", values: ["Active", "Paused", "Canceled", "Trialing"] },
  { value: "quote.status", label: "Quote → Status", icon: "/shell/notepad.svg", values: ["Draft", "Sent", "Signed", "Expired"] },
];

const CONDITION_OPERATORS = [
  { value: "is", label: "is", icon: "/block-icons/equals.svg" },
  { value: "is_not", label: "is not", icon: "/block-icons/not-equals.svg" },
  { value: "gt", label: "is greater than", icon: "/block-icons/greater-than.svg" },
  { value: "lt", label: "is less than", icon: "/block-icons/less-than.svg" },
  { value: "contains", label: "contains", icon: "/block-icons/magnifying-glass.svg" },
];

const CONDITION_VALUE_ICONS: Record<string, string> = {
  Paid: "/block-icons/check-circle.svg",
  Unpaid: "/block-icons/clock.svg",
  Draft: "/block-icons/pencil-simple.svg",
  Void: "/block-icons/stop-circle.svg",
  Overdue: "/block-icons/clock-clockwise.svg",
  France: "/block-icons/globe.svg",
  "United Kingdom": "/block-icons/globe.svg",
  "United States": "/block-icons/globe.svg",
  Germany: "/block-icons/globe.svg",
  Active: "/block-icons/check-circle.svg",
  Paused: "/block-icons/clock.svg",
  Canceled: "/block-icons/stop-circle.svg",
  Trialing: "/block-icons/hourglass.svg",
  Sent: "/block-icons/envelope.svg",
  Signed: "/block-icons/pen-nib.svg",
  Expired: "/block-icons/clock.svg",
};

function parseConditions(raw: string | undefined): Condition[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<Partial<Condition>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => ({
        id: item.id || String(index + 1),
        field: item.field ?? "",
        operator: item.operator ?? "",
        value: item.value ?? "",
      }))
      .filter((item) => item.field);
  } catch {
    return [];
  }
}

function conditionSummary(conditions: Condition[]) {
  return conditions
    .filter((item) => item.field && item.operator && item.value.trim())
    .map((item) => {
      const field = CONDITION_FIELDS.find((option) => option.value === item.field)?.label ?? item.field;
      const operator = CONDITION_OPERATORS.find((option) => option.value === item.operator)?.label ?? item.operator;
      return `${field} ${operator} ${item.value.trim()}`;
    })
    .join(", ");
}

function ConditionAdd({ onPick }: { onPick: (fieldId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    place();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="w-full">
      <DashedAddButton
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        Add condition
      </DashedAddButton>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              style={{ top: box.top, left: box.left, width: box.width }}
              className="fixed z-50 overflow-hidden rounded-[8px] border-[0.5px] border-solid border-bo-2 bg-su-light-elevation shadow-[var(--shadow-light-md)]"
            >
              <div className="flex flex-col p-1">
                {CONDITION_FIELDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    onClick={() => {
                      onPick(option.value);
                      setOpen(false);
                    }}
                    className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-[6px] px-1.5 text-left text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary outline-none hover:bg-[var(--grey-bg-2,#f8f7f7)]"
                  >
                    <GreyIcon src={option.icon} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ConditionBuilder({
  data,
  onChange,
}: {
  data: BlockData;
  onChange: (patch: Partial<BlockData>) => void;
}) {
  const conditions = parseConditions(data.config?.conditions);

  function commit(next: Condition[]) {
    const summary = conditionSummary(next);
    onChange({
      config: { ...data.config, conditions: JSON.stringify(next) },
      ...(summary ? { summary } : {}),
    });
  }

  function update(id: string, patch: Partial<Condition>) {
    commit(conditions.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
      <div className="flex flex-col gap-[6px]">
      <p className="text-[13px] leading-[18px] font-medium tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)]">
        Conditions
      </p>
      {conditions.length > 0 ? (
      <div className="flex flex-col gap-4">
      {conditions.map((condition, index) => {
        const field = CONDITION_FIELDS.find((option) => option.value === condition.field);
        const values =
          field?.values?.map((option) => ({
            value: option,
            label: option,
            icon: CONDITION_VALUE_ICONS[option],
          })) ?? [];
        return (
          <div
            key={condition.id}
            className="flex w-full flex-col gap-2 rounded-[6px] border-[0.5px] border-solid border-bo-2 bg-white p-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-[12px] leading-4 font-medium tracking-[-0.18px] text-[var(--grey-fg-secondary,#78716c)]">
                Condition {index + 1}
              </p>
              <button
                type="button"
                aria-label={`Remove condition ${index + 1}`}
                onClick={() => commit(conditions.filter((item) => item.id !== condition.id))}
                className="flex size-6 cursor-pointer items-center justify-center text-[var(--grey-fg-secondary,#78716c)]"
              >
                <Trash />
              </button>
            </div>
            <Dropdown
              value={condition.field}
              placeholder="Invoice → Status"
              options={CONDITION_FIELDS.map((option) => ({
                value: option.value,
                label: option.label,
                icon: option.icon,
              }))}
              onChange={(fieldId) => update(condition.id, { field: fieldId, value: "" })}
              greyIcons
            />
            <div className="flex gap-2">
              <span className="min-w-0 flex-1">
                <Dropdown
                  value={condition.operator}
                  placeholder="is not"
                  options={CONDITION_OPERATORS}
                  onChange={(operator) => update(condition.id, { operator })}
                  greyIcons
                />
              </span>
              <span className="min-w-0 flex-1">
                {values.length > 0 ? (
                  <Dropdown
                    value={condition.value}
                    placeholder="Paid"
                    options={values}
                    onChange={(value) => update(condition.id, { value })}
                    greyIcons
                  />
                ) : (
                  <TextControl
                    value={condition.value}
                    placeholder="Value"
                    onChange={(value) => update(condition.id, { value })}
                  />
                )}
              </span>
            </div>
          </div>
        );
      })}
      </div>
      ) : null}
      </div>
      <div className="mt-[6px]">
        <ConditionAdd
          onPick={(fieldId) =>
            commit([...conditions, { id: crypto.randomUUID(), field: fieldId, operator: "", value: "" }])
          }
        />
      </div>
    </div>
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
  nextByOutput,
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
  nextByOutput?: Record<string, string | null> | null;
  onOpenCatalog: (outputId?: string) => void;
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
                  { value: "assistant", label: "Assistant" },
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
          {issue ? (
            <div className="border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
              <IssueCallout message={issue} />
            </div>
          ) : null}
          <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
            <Field label="Description" hint="Optional">
              <TextControl
                value={block.data.description ?? ""}
                placeholder="Add a description…"
                onChange={(description) => onBlockChange({ description })}
              />
            </Field>
          </div>
          {schedule ? (
            <div className="flex flex-col gap-4 border-b-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] p-4">
              <Field label="Frequency">
                <Dropdown
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
                  <Dropdown
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
            <BlockActions data={block.data} onChange={onBlockChange} />
          )}
          {block?.data.title === "Stop" ? null : (
          <div className="flex flex-col gap-4 p-4">
            {block && blockOutputs(block.data) ? (
              blockOutputs(block.data)!.map((output) => (
                <Field key={output.id} label={output.label}>
                  <NextStepControl
                    label={nextByOutput?.[output.id] ?? null}
                    onClick={() => onOpenCatalog(output.id)}
                  />
                </Field>
              ))
            ) : (
              <Field label="Next step">
                <NextStepControl label={nextLabel} onClick={() => onOpenCatalog()} />
              </Field>
            )}
          </div>
          )}
        </div>
          )}
        </div>
      )}
    </FloatingPanel>
  );
}
