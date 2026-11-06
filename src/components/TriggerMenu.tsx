"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlass } from "@/components/icons";
import { TabSelector } from "@/components/TabSelector";

export type BlockIconName =
  | "git-branch"
  | "arrows-split"
  | "funnel"
  | "repeat"
  | "checks"
  | "stop-circle"
  | "clock"
  | "calendar-blank"
  | "hourglass"
  | "magnifying-glass"
  | "database"
  | "pencil-simple"
  | "math-operations"
  | "clock-clockwise"
  | "brackets-curly"
  | "list-bullets"
  | "envelope"
  | "arrows-clockwise"
  | "globe"
  | "sparkle"
  | "slack"
  | "attio"
  | "hubspot"
  | "invoice"
  | "check-circle"
  | "credit-card"
  | "pen-nib"
  | "user-plus"
  | "chart-line-up"
  | "wallet"
  | "calendar-dot"
  | "lightning"
  | "link";

export type BlockTone = "purple" | "orange" | "yellow" | "pink" | "turquoise" | "grey";

export type TriggerOption = {
  title: string;
  description: string;
  group: string;
  icon: BlockIconName;
  tone: BlockTone;
  trigger?: boolean;
};

const TONE_CLASS: Record<BlockTone, string> = {
  purple: "bg-[var(--purple-bg-3,#ede8f5)]",
  orange: "bg-[var(--orange-bg-3,#f8ebe4)]",
  yellow: "bg-[var(--yellow-bg-3,#f9f0d8)]",
  pink: "bg-[var(--pink-bg-3,#f0e0ea)]",
  turquoise: "bg-[var(--turquoise-bg-3,#daeef2)]",
  grey: "bg-[var(--grey-bg-3,#f3f2f1)]",
};

const SCOPES = [
  { value: "all" as const, label: "All" },
  { value: "triggers" as const, label: "Triggers" },
  { value: "integrations" as const, label: "Integrations" },
];

type CatalogItem = {
  title: string;
  description: string;
  icon: BlockIconName;
  tone?: BlockTone;
  trigger?: boolean;
};

const TRIGGER_GROUPS: {
  title: string;
  tone: BlockTone;
  items: CatalogItem[];
}[] = [
  {
    title: "Invoices",
    tone: "yellow",
    items: [
      { title: "Invoice late", description: "Past the due date", icon: "clock-clockwise", trigger: true },
      { title: "Invoice finalized", description: "Ready to send", icon: "invoice", trigger: true },
      { title: "Invoice settled", description: "Fully paid", icon: "check-circle", trigger: true },
    ],
  },
  {
    title: "Payments",
    tone: "turquoise",
    items: [{ title: "Payment failed", description: "Card was declined", icon: "credit-card", trigger: true }],
  },
  {
    title: "Subscriptions",
    tone: "turquoise",
    items: [
      { title: "Subscription created", description: "A new subscription", icon: "arrows-clockwise", trigger: true },
      { title: "Subscription updated", description: "Products, prices or dates", icon: "arrows-clockwise", trigger: true },
      { title: "Subscription canceled", description: "Customer canceled", icon: "clock", trigger: true },
    ],
  },
  {
    title: "Quotes",
    tone: "orange",
    items: [{ title: "Quote signed", description: "Any amount", icon: "pen-nib", trigger: true }],
  },
  {
    title: "Customers",
    tone: "yellow",
    items: [
      { title: "Customer created", description: "A new customer", icon: "user-plus", trigger: true },
      { title: "Customer updated", description: "Name, billing email, properties", icon: "pencil-simple", trigger: true },
      { title: "Custom property changed", description: "A property was updated", icon: "pencil-simple", trigger: true },
    ],
  },
  {
    title: "Usage & wallet",
    tone: "orange",
    items: [
      { title: "Usage threshold reached", description: "Over the included amount", icon: "chart-line-up", trigger: true },
      { title: "Wallet balance low", description: "Under the limit", icon: "wallet", trigger: true },
    ],
  },
  {
    title: "Time",
    tone: "orange",
    items: [
      { title: "On a schedule", description: "Runs on a cadence", icon: "calendar-blank", trigger: true },
      { title: "Relative to a date", description: "Before or after a date", icon: "calendar-dot", trigger: true },
    ],
  },
  {
    title: "Other",
    tone: "grey",
    items: [
      { title: "Manual run", description: "Started by hand", icon: "lightning", trigger: true },
      { title: "Incoming webhook", description: "An external call", icon: "link", trigger: true },
    ],
  },
];

const GROUPS: {
  title: string;
  tone: BlockTone;
  items: CatalogItem[];
}[] = [
  {
    title: "Logic",
    tone: "purple",
    items: [
      { title: "If / else", description: "Branch on conditions", icon: "git-branch" },
      { title: "Switch", description: "Branch on the first matching case", icon: "arrows-split" },
      { title: "Filter", description: "Continue only when conditions match", icon: "funnel" },
      { title: "For each", description: "Run the next blocks for each item", icon: "repeat" },
      { title: "Loop", description: "Repeat the blocks inside", icon: "repeat" },
      { title: "Request approval", description: "Ask someone before continuing", icon: "checks" },
      { title: "Stop", description: "End the run here", icon: "stop-circle" },
    ],
  },
  {
    title: "Time",
    tone: "orange",
    items: [
      { title: "Delay", description: "Wait for a duration", icon: "clock" },
      { title: "Delay until", description: "Wait until a date", icon: "calendar-blank" },
      { title: "Wait for event", description: "Wait until an invoice is paid, a quote signed…", icon: "hourglass" },
    ],
  },
  {
    title: "Data",
    tone: "yellow",
    items: [
      { title: "Find records", description: "Find customers, invoices, subscriptions…", icon: "magnifying-glass" },
      { title: "Get record", description: "Get one customer, invoice or subscription", icon: "database" },
      { title: "Update customer", description: "Change name, billing email, properties…", icon: "pencil-simple" },
      { title: "Formula", description: "Compute a number", icon: "math-operations" },
      { title: "Adjust time", description: "Add or subtract time from a date", icon: "clock-clockwise" },
      { title: "Parse JSON", description: "Read JSON into a typed value", icon: "brackets-curly" },
      { title: "Aggregate list", description: "Combine list items into one value", icon: "list-bullets" },
    ],
  },
  {
    title: "Communication",
    tone: "pink",
    items: [{ title: "Email your team", description: "Email users of this Hyperline account", icon: "envelope" }],
  },
  {
    title: "Billing",
    tone: "turquoise",
    items: [{ title: "Update subscription", description: "Change products, prices, dates…", icon: "arrows-clockwise" }],
  },
  {
    title: "Integration",
    tone: "grey",
    items: [
      { title: "Slack", description: "Send a message to a channel", icon: "slack" },
      { title: "Attio", description: "Create or update a record", icon: "attio" },
      { title: "HubSpot", description: "Create or update a contact", icon: "hubspot" },
      { title: "Generate text with AI", description: "Write a message, summary or reply", icon: "sparkle" },
      { title: "Run custom code", description: "Write your own logic", icon: "brackets-curly" },
    ],
  },
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function BlockGlyph({
  icon,
  tone,
  trigger = false,
  className,
}: {
  icon: BlockIconName;
  tone: BlockTone;
  trigger?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center rounded-[6px] p-1",
        trigger ? "bg-[var(--blue-bg-3,#e3eaf1)]" : TONE_CLASS[tone],
        className,
      )}
    >
      {trigger ? (
        <span
          aria-hidden
          className="block size-4 bg-[var(--blue-fg-accent,#1f74c6)]"
          style={{
            maskImage: `url(/block-icons/${icon}.svg)`,
            WebkitMaskImage: `url(/block-icons/${icon}.svg)`,
            maskSize: "16px 16px",
            WebkitMaskSize: "16px 16px",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      ) : (
        <img src={`/block-icons/${icon}.svg`} width={16} height={16} alt="" />
      )}
    </span>
  );
}

export function TriggerMenu({
  onSelect,
  embedded = false,
  triggersOnly = false,
  onClose,
  maxHeight,
}: {
  onSelect: (option: TriggerOption) => void;
  embedded?: boolean;
  triggersOnly?: boolean;
  onClose?: () => void;
  maxHeight?: number;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<(typeof SCOPES)[number]["value"]>("all");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => {
    const integrationAt = GROUPS.findIndex((group) => group.title === "Integration");
    const withTriggers = [
      ...GROUPS.slice(0, integrationAt),
      ...TRIGGER_GROUPS,
      ...GROUPS.slice(integrationAt),
    ];
    const source =
      !embedded || scope === "all"
        ? withTriggers
        : scope === "triggers"
          ? TRIGGER_GROUPS
          : GROUPS.filter((group) => group.title === "Integration");
    const visible = triggersOnly ? TRIGGER_GROUPS : embedded ? source : GROUPS;
    const needle = query.trim().toLowerCase();
    if (!needle) return visible;
    return visible
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [embedded, query, scope, triggersOnly]);

  const options: TriggerOption[] = groups.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.title, tone: item.tone ?? group.tone })),
  );

  useEffect(() => {
    setActive(0);
  }, [query, scope]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, groups]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button[aria-haspopup='listbox']")) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && options[active]) {
      event.preventDefault();
      onSelect(options[active]);
    } else if (event.key === "Escape") {
      onClose?.();
    }
  }

  let optionIndex = -1;

  return (
    <div
      role="dialog"
      aria-label="Search blocks"
      onKeyDown={onKeyDown}
      onWheel={(event) => event.stopPropagation()}
      className={cn(
        "nodrag nopan nowheel flex flex-col overflow-hidden bg-[var(--surface-su-light-elevation,#ffffff)]",
        embedded
          ? "min-h-0 flex-1"
          : "w-[320px] rounded-[8px] border-[0.5px] border-solid border-[var(--grey-bo-2,#e2dfdd)] shadow-[var(--shadow-light-md)]",
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <div className={cn("shrink-0", embedded ? "flex flex-col gap-2 p-4" : triggersOnly ? "px-2 pt-2 pb-4" : "px-2 pt-2 pb-0")}>
        <label className="flex h-7 items-center gap-[6px] rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-[var(--grey-bg-action,#ffffff)] px-2 text-[var(--grey-fg-secondary,#78716c)] shadow-[var(--shadow-light-sm)] focus-within:border-[var(--grey-bo-3-hover,#cfccc8)]">
          <MagnifyingGlass />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search blocks..."
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] font-normal tracking-[-0.195px] text-[var(--grey-fg-primary,#44403c)] outline-none placeholder:text-[var(--grey-fg-tertiary,#999390)]"
          />
        </label>
        {embedded ? <TabSelector label="Blocks" value={scope} options={SCOPES} onChange={setScope} /> : null}
      </div>
      <div ref={listRef} role="listbox" className={cn("overflow-y-auto", embedded || maxHeight ? "min-h-0 flex-1" : "max-h-[480px]")}>
        {groups.map((group, groupIndex) => {
          const triggerFamily = group.items.every((item) => item.trigger);
          const followsTriggerFamily =
            triggerFamily && groupIndex > 0 && groups[groupIndex - 1]?.items.every((item) => item.trigger);
          const firstTriggerHeading = triggersOnly && group.title === "Invoices";
          return (
          <div key={`${group.title}-${groupIndex}`}>
            {groupIndex > 0 && !followsTriggerFamily ? (
              <div className="h-[0.5px] bg-[var(--grey-bo-1,#eeeceb)]" />
            ) : null}
            <div className={cn("flex flex-col px-2 pb-2", embedded || firstTriggerHeading || followsTriggerFamily ? "pt-0" : "pt-2")}>
              <div
                className={cn(
                  "pr-1 pb-1 pl-2 text-[length:var(--text-bold-tiny-size,11px)] leading-[var(--text-bold-tiny-leading,14px)] font-medium tracking-[-0.01em] text-[var(--grey-fg-tertiary,#999390)]",
                  (embedded && groupIndex === 0) || firstTriggerHeading ? "pt-0" : followsTriggerFamily ? "pt-1" : "pt-2",
                )}
              >
                {group.title}
              </div>
              {group.items.map((item) => {
                optionIndex += 1;
                const current = optionIndex;
                const isActive = current === active;
                return (
                  <button
                    key={item.title}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive ? "true" : undefined}
                    onMouseEnter={() => setActive(current)}
                    onClick={() =>
                      onSelect({
                        title: item.title,
                        description: item.description,
                        group: group.title,
                        icon: item.icon,
                        tone: item.tone ?? group.tone,
                        trigger: item.trigger,
                      })
                    }
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-left hover:bg-[var(--grey-bg-1,#fafaf9)]",
                      isActive && "bg-[var(--grey-bg-1,#fafaf9)]",
                    )}
                  >
                    <BlockGlyph icon={item.icon} tone={item.tone ?? group.tone} trigger={item.trigger} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[length:var(--text-regular-base-size,13px)] leading-[var(--text-regular-base-leading,18px)] font-normal tracking-[var(--text-regular-base-tracking,-0.015em)] text-[var(--grey-fg-primary,#44403c)]">
                        {item.title}
                      </span>
                      <span className="truncate text-[12px] leading-4 font-normal tracking-[-0.015em] text-[var(--grey-fg-tertiary,#999390)]">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
