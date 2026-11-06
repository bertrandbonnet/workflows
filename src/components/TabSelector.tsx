import type { ReactNode } from "react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function TabSelector<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex h-7 w-full items-stretch overflow-hidden rounded-[6px] border-[0.5px] border-solid border-bo-3 bg-bg-action shadow-[var(--shadow-light-sm)]"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-full flex-1 cursor-pointer items-center justify-center gap-1 px-2 text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] whitespace-nowrap",
            index < options.length - 1 && "border-r-[0.5px] border-solid border-bo-3",
            value === option.value
              ? "bg-bg-action text-fg-primary"
              : "bg-[var(--grey-bg-2,#f8f7f7)] text-[var(--grey-fg-tertiary,#999390)]",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
