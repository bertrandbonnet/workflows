import { ButtonHTMLAttributes, ReactNode, useId } from "react";
import { Tooltip } from "@/components/Tooltip";

type ButtonTone = "grey" | "blue";
type ButtonKind = "button" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  kind?: ButtonKind;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  tooltip?: string;
  hotkey?: string;
  selected?: boolean;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function toneClass(tone: ButtonTone, selected: boolean) {
  if (tone === "blue") {
    return cn(
      "border-transparent bg-bg-accent shadow-none",
      !selected && "hover:bg-bg-accent-hover",
      "disabled:border-bo-3 disabled:bg-bg-disabled",
      "disabled:hover:bg-bg-disabled",
    );
  }

  return cn(
    "border-bo-3 bg-bg-action shadow-[var(--shadow-light-sm)]",
    "hover:border-bo-3-hover hover:bg-bg-action-hover",
    "disabled:border-bo-3 disabled:bg-bg-disabled disabled:shadow-none",
    "disabled:hover:border-bo-3 disabled:hover:bg-bg-disabled",
  );
}

const iconClass: Record<ButtonTone, string> = {
  grey: "text-fg-secondary group-disabled:text-fg-disabled",
  blue: "text-white group-disabled:text-fg-disabled",
};

const labelClass: Record<ButtonTone, string> = {
  grey: "text-fg-primary group-disabled:text-fg-disabled",
  blue: "text-white group-disabled:text-fg-disabled",
};

export function Button({
  tone = "grey",
  kind = "button",
  leadingIcon,
  trailingIcon,
  tooltip,
  hotkey,
  selected = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const iconOnly = kind === "icon";
  const tooltipId = useId();

  return (
    <span className="relative inline-flex">
    <button
      type="button"
      aria-describedby={tooltip ? tooltipId : undefined}
      className={cn(
        "peer group inline-flex shrink-0 items-center justify-center rounded-full border-[0.5px] border-solid",
        "cursor-pointer select-none disabled:cursor-not-allowed",
        iconOnly ? "size-7" : "h-7 gap-[var(--spacing-1-5)] px-[var(--spacing-2-5)]",
        toneClass(tone, selected),
        className,
      )}
      {...props}
    >
      {leadingIcon ? (
        <span className={cn("inline-flex", iconClass[tone])}>{leadingIcon}</span>
      ) : null}
      {iconOnly ? (
        <span className={cn("inline-flex", iconClass[tone])}>{children}</span>
      ) : (
        <span
          className={cn(
            "text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)]",
            labelClass[tone],
          )}
        >
          {children}
        </span>
      )}
      {trailingIcon ? (
        <span className={cn("inline-flex", iconClass[tone])}>{trailingIcon}</span>
      ) : null}
    </button>
      {tooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+var(--spacing-1)+var(--spacing-2,8px)+0.5px)] left-1/2 z-10 -translate-x-1/2 opacity-0 peer-hover:opacity-100 peer-focus-visible:opacity-100"
        >
          <Tooltip label={tooltip} hotkey={hotkey} />
        </span>
      ) : null}
    </span>
  );
}
