function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type TooltipProps = {
  label: string;
  hotkey?: string;
};

export function Tooltip({ label, hotkey }: TooltipProps) {
  return (
    <div className="inline-flex items-center gap-[var(--spacing-1)] rounded-[var(--rounded-sm)] border-[0.5px] border-solid border-bo-2 bg-[var(--surface-su-light-elevation)] px-[var(--padding-3)] py-[var(--padding-2)] shadow-[var(--shadow-light-md)]">
      <p className="max-w-[320px] text-[length:var(--text-bold-small-size)] leading-[var(--text-bold-small-leading)] font-medium tracking-[var(--text-bold-small-tracking)] whitespace-nowrap text-fg-secondary">
        {label}
      </p>
      {hotkey ? (
        <span
          className={cn(
            "inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-[4px] border-[0.5px] border-solid border-bo-2 bg-[var(--surface-su-main)] text-[length:var(--text-bold-tiny-size)] leading-[var(--text-bold-tiny-leading)] font-medium tracking-[var(--text-bold-tiny-tracking)] text-fg-primary [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]",
            hotkey.length > 1 ? "px-1" : "w-4",
          )}
        >
          {hotkey}
        </span>
      ) : null}
    </div>
  );
}
