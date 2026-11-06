import { ReactNode } from "react";
import { ArrowsOut, MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus } from "@/components/icons";

const PRESETS = [50, 100, 200] as const;

type ZoomMenuProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (value: number) => void;
  onFit: () => void;
};

function Item({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const radio = selected !== undefined;
  return (
    <button
      type="button"
      role={radio ? "menuitemradio" : "menuitem"}
      aria-checked={radio ? selected : undefined}
      onClick={onClick}
      className={[
        "flex h-8 w-full cursor-pointer items-center gap-[var(--spacing-1-5)] rounded-[6px] border-0 px-[var(--spacing-1-5)] text-left",
        "text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary",
        "focus-visible:outline-none",
        selected
          ? "bg-[var(--grey-bg-3,#f3f2f1)]"
          : "bg-transparent hover:bg-[var(--grey-bg-2,#f8f7f7)] focus-visible:bg-[var(--grey-bg-2,#f8f7f7)]",
      ].join(" ")}
    >
      <span className="inline-flex text-fg-secondary">{icon}</span>
      {label}
    </button>
  );
}

export function ZoomMenu({ zoom, onZoomIn, onZoomOut, onZoomTo, onFit }: ZoomMenuProps) {
  return (
    <div
      role="menu"
      aria-label="Zoom"
      className="w-[220px] overflow-hidden rounded-[8px] border-[0.5px] border-solid border-bo-2 bg-[var(--surface-su-light-elevation)] shadow-[var(--shadow-light-md)]"
    >
      <div className="h-[0.5px] bg-[var(--grey-bo-1,#eeeceb)]" />
      <div className="flex flex-col p-[var(--spacing-1)]">
        <Item icon={<MagnifyingGlassPlus />} label="Zoom in" onClick={onZoomIn} />
        <Item icon={<MagnifyingGlassMinus />} label="Zoom out" onClick={onZoomOut} />
        {PRESETS.map((value) => (
          <Item
            key={value}
            icon={<MagnifyingGlass />}
            label={`Zoom to ${value} %`}
            selected={zoom === value}
            onClick={() => onZoomTo(value)}
          />
        ))}
      </div>
      <div className="h-[0.5px] bg-[var(--grey-bo-1,#eeeceb)]" />
      <div className="flex flex-col p-[var(--spacing-1)]">
        <Item icon={<ArrowsOut />} label="Fit to view" onClick={onFit} />
      </div>
    </div>
  );
}
