import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AnalyticsContextType {
  pageContext: any;
  pageName: string;
  setPageData: (name: string, data: any) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  pageContext: null,
  pageName: "",
  setPageData: () => {},
});

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<any>(null);
  const [pageName, setPageName] = useState("");

  const setPageData = useCallback((name: string, data: any) => {
    setPageName(name);
    setPageContext(data);
  }, []);

  return (
    <AnalyticsContext.Provider value={{ pageContext, pageName, setPageData }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export const useAnalyticsContext = () => useContext(AnalyticsContext);
