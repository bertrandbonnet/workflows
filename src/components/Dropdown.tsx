"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown } from "@/components/icons";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: string;
};

const controlClass =
  "h-7 w-full rounded-[6px] border-[0.5px] border-solid border-[var(--grey-bo-3,#dbd8d6)] bg-white text-[13px] leading-[18px] tracking-[-0.195px] shadow-[var(--shadow-light-sm)] outline-none focus:border-[var(--grey-bo-3-hover,#cfccc8)]";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Dropdown({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={options.length === 0}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          controlClass,
          "flex cursor-pointer items-center gap-2 px-2 text-left disabled:cursor-default",
          selected ? "text-[var(--grey-fg-primary,#44403c)]" : "text-[var(--grey-fg-tertiary,#999390)]",
        )}
      >
        {selected?.icon ? (
          <img
            src={selected.icon}
            width={16}
            height={16}
            alt=""
            className="block size-4 max-w-none shrink-0"
            style={{ width: 16, height: 16 }}
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <span className="flex shrink-0 text-[var(--grey-fg-secondary,#78716c)]">
          <CaretDown />
        </span>
      </button>
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
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[6px] px-1.5 text-left outline-none",
                        "text-[length:var(--text-bold-base-size)] leading-[var(--text-bold-base-leading)] font-medium tracking-[var(--text-bold-base-tracking)] text-fg-primary",
                        isSelected
                          ? "bg-[var(--grey-bg-3,#f3f2f1)]"
                          : "hover:bg-[var(--grey-bg-2,#f8f7f7)]",
                      )}
                    >
                      {option.icon ? (
                        <img
                          src={option.icon}
                          width={16}
                          height={16}
                          alt=""
                          className="block size-4 max-w-none shrink-0"
                          style={{ width: 16, height: 16 }}
                        />
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
