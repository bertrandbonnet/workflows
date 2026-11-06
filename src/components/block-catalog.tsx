"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const BlockCatalogContext = createContext<{
  open: boolean;
  show: () => void;
  hide: () => void;
} | null>(null);

export function BlockCatalogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);
  return <BlockCatalogContext.Provider value={value}>{children}</BlockCatalogContext.Provider>;
}

export function useBlockCatalog() {
  const value = useContext(BlockCatalogContext);
  if (!value) throw new Error("useBlockCatalog must be used within BlockCatalogProvider");
  return value;
}
