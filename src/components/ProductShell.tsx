"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { CaretDown, MagnifyingGlass, Play, Plus } from "@/components/icons";

const NAV = [
  { label: "Home", icon: "/shell/house.svg" },
  { label: "Catalog", icon: "/shell/squares-four.svg" },
  { label: "Customers", icon: "/shell/users-three.svg" },
  { label: "Quoting", icon: "/shell/notepad.svg" },
  { label: "Subscriptions", icon: "/shell/arrows-clockwise.svg" },
  { label: "Invoicing", icon: "/shell/file-text.svg" },
  { label: "Usage", icon: "/shell/database.svg" },
  { label: "Transactions", icon: "/shell/arrows-left-right.svg" },
  { label: "Insights", icon: "/shell/chart-line.svg" },
  { label: "Reports", icon: "/shell/chart-bar.svg" },
  { label: "Accounting", icon: "/shell/books.svg" },
  { label: "Workflows", icon: "/shell/path.svg", active: true },
  { label: "Audit logs", icon: "/shell/binoculars.svg" },
  { label: "Settings", icon: "/shell/gear.svg" },
] as const;

const FOOTER = [
  { label: "Profile", icon: "avatar" },
  { label: "Support", icon: "/shell/headset.svg" },
  { label: "Documentation", icon: "/shell/book-open.svg" },
] as const;

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function NavIcon({ src }: { src: string }) {
  return <img src={src} width={14} height={14} alt="" className="shrink-0" />;
}

function NavLink({
  label,
  icon,
  active = false,
}: {
  label: string;
  icon: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-[4px] px-1.5 text-left",
        "text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)]",
        active
          ? "box-border border-[0.5px] border-solid border-[var(--grey-bo-1)] bg-[var(--grey-bg-4)] text-fg-primary"
          : "text-fg-secondary hover:bg-[var(--grey-bg-3)]",
      )}
    >
      {icon === "avatar" ? (
        <img
          src="/shell/avatar.png"
          width={14}
          height={14}
          alt=""
          className="size-[14px] shrink-0 rounded-[4px] object-cover"
        />
      ) : (
        <NavIcon src={icon} />
      )}
      {label}
    </button>
  );
}

export function ProductSidebar() {
  const [testMode, setTestMode] = useState(false);

  return (
    <aside className="flex h-full w-[185px] shrink-0 flex-col justify-between overflow-hidden bg-[var(--surface-su-sidebar)]">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-3">
          <div className="pl-1">
            <img src="/shell/logo.svg" width={108} height={24} alt="Hyperline" />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 min-w-0 flex-1 items-center justify-between rounded-full border-[0.5px] border-solid border-bo-3 bg-bg-action px-2 shadow-[var(--shadow-light-sm)]"
            >
              <span className="flex min-w-0 items-center gap-1">
                <span className="size-2 shrink-0 rounded-full bg-[var(--orange-fg-accent)]" />
                <span className="truncate text-[length:var(--text-bold-small-size)] leading-[var(--text-bold-small-leading)] font-medium tracking-[var(--text-bold-small-tracking)] text-fg-primary">
                  Sentinel
                </span>
              </span>
              <span className="flex h-3 shrink-0 items-center rounded-[4px] bg-[var(--grey-bg-3)] px-0.5 text-[8px] leading-[8px] font-medium tracking-[-0.08px] text-fg-secondary">
                ⌘P
              </span>
            </button>
            <Button kind="icon" tone="grey" aria-label="Search" className="!size-6">
              <MagnifyingGlass />
            </Button>
            <Button kind="icon" tone="grey" aria-label="Create" className="!size-6">
              <Plus />
            </Button>
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Product">
          {NAV.map((item) => (
            <NavLink key={item.label} {...item} />
          ))}
        </nav>
      </div>
      <div className="shrink-0">
        <div className="flex flex-col gap-1 border-t-[0.5px] border-solid border-bo-2 p-2">
          {FOOTER.map((item) => (
            <NavLink key={item.label} {...item} />
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t-[0.5px] border-solid border-bo-2 p-2">
          <div className="flex h-7 items-center justify-between px-1">
            <span className="text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-secondary">
              Test mode
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={testMode}
              aria-label="Test mode"
              onClick={() => setTestMode((on) => !on)}
              className={cn(
                "relative h-4 w-7 shrink-0 rounded-full border-[0.5px] border-solid border-bo-3",
                testMode ? "bg-bg-accent" : "bg-[var(--grey-bg-3)]",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-[var(--shadow-light-xs)]",
                  testMode ? "left-3" : "left-0.5",
                )}
              />
            </button>
          </div>
          <button
            type="button"
            className="flex h-7 w-full items-center gap-1.5 rounded-full border-[0.5px] border-solid border-bo-3 bg-bg-action px-2.5 shadow-[var(--shadow-light-sm)] hover:border-bo-3-hover hover:bg-bg-action-hover"
          >
            <img src="/shell/alpeak.svg" width={14} height={14} alt="" />
            <span className="min-w-0 flex-1 truncate text-left text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary">
              Alpeak Capital
            </span>
            <span className="text-fg-secondary">
              <CaretDown />
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function WorkflowHeader({ name = "Untitled" }: { name?: string }) {
  const label = name.trim() || "Untitled";
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-4 border-b-[0.5px] border-solid border-bo-2 bg-su-body pr-3 pl-4">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-[var(--grey-bg-3)]">
        <img src="/shell/path-header.svg" width={14} height={14} alt="" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="text-[17px] leading-6 font-normal tracking-[-0.015em] text-fg-secondary">
          Workflows
        </span>
        <span className="text-[17px] leading-6 font-normal tracking-[-0.015em] text-fg-secondary">/</span>
        <span className="min-w-0 truncate text-[17px] leading-6 font-medium tracking-[-0.015em] text-fg-primary">
          {label}
        </span>
        <span className="inline-flex h-4 items-center rounded-[4px] bg-[var(--grey-bg-3)] px-1 text-[length:var(--text-bold-tiny-size)] leading-[var(--text-bold-tiny-leading)] font-medium tracking-[var(--text-bold-tiny-tracking)] text-fg-secondary">
          Draft
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button tone="grey" leadingIcon={<Play />}>
          Run test
        </Button>
        <Button tone="blue">Publish</Button>
      </div>
    </header>
  );
}

export function EditorTabs() {
  return (
    <div
      role="tablist"
      aria-label="Workflow"
      className="flex h-7 items-stretch overflow-hidden rounded-[6px] border-[0.5px] border-solid border-bo-3 bg-bg-action shadow-[var(--shadow-light-sm)]"
    >
      <button
        type="button"
        role="tab"
        aria-selected="true"
        className="border-r-[0.5px] border-solid border-bo-3 bg-bg-action px-2 text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary"
      >
        Editor
      </button>
      <button
        type="button"
        role="tab"
        aria-selected="false"
        disabled
        className="border-r-[0.5px] border-solid border-bo-3 bg-bg-disabled px-2 text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-disabled disabled:opacity-100"
      >
        Runs
      </button>
      <button
        type="button"
        role="tab"
        aria-selected="false"
        disabled
        className="bg-bg-disabled px-2 text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-disabled disabled:opacity-100"
      >
        Settings
      </button>
    </div>
  );
}
