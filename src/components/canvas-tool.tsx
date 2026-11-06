"use client";

import { createContext, useContext, useState } from "react";

export type CanvasTool = "hand" | "cursor";

const CanvasToolContext = createContext<{
  tool: CanvasTool;
  setTool: (tool: CanvasTool) => void;
} | null>(null);

export function CanvasToolProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<CanvasTool>("cursor");
  return <CanvasToolContext.Provider value={{ tool, setTool }}>{children}</CanvasToolContext.Provider>;
}

export function useCanvasTool() {
  const value = useContext(CanvasToolContext);
  if (!value) throw new Error("useCanvasTool must be used within CanvasToolProvider");
  return value;
}
