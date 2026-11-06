"use client";

import { SurfaceField } from "surface-field";

/** Set to true to bring the dotted field back. */
const SHOW_DOTTED_FIELD = false;

export function FieldBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-su-body"
      style={{ position: "relative", height: "100%", minHeight: 0, backgroundColor: "var(--surface-su-body)" }}
    >
      <SurfaceField
        gap={21}
        focusRadius={360}
        lineRadius={100}
        baseOpacity={0.04}
        maxOpacity={0.13}
        connected={false}
        cursorPush={0}
        ripplePush={4}
        surfacePadding={0}
        tint={0}
        breathe={0.4}
        breatheRate={0.8}
        wander={true}
        still={false}
        style={{
          position: "absolute",
          inset: 0,
          display: SHOW_DOTTED_FIELD ? undefined : "none",
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
