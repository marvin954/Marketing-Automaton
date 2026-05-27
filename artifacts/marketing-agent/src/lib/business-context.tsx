import React, { createContext, useContext, useState, useEffect } from "react";

interface BusinessContextType {
  activeBusinessId: number | null;
  setActiveBusinessId: (id: number | null) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(() => {
    const saved = localStorage.getItem("activeBusinessId");
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    if (activeBusinessId) {
      localStorage.setItem("activeBusinessId", activeBusinessId.toString());
    } else {
      localStorage.removeItem("activeBusinessId");
    }
  }, [activeBusinessId]);

  return (
    <BusinessContext.Provider value={{ activeBusinessId, setActiveBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
