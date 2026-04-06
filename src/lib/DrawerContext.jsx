import React, { createContext, useContext, useState } from 'react';

const DrawerContext = createContext(null);

export function DrawerProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <DrawerContext.Provider value={{ open, setOpen, toggle: () => setOpen(v => !v), close: () => setOpen(false) }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}