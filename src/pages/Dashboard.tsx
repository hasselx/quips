import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NotebookList } from "@/components/NotebookList";
import { NotebookView } from "@/components/NotebookView";
import type { Tables } from "@/integrations/supabase/types";

type Notebook = Tables<"notebooks">;

interface DashboardProps {
  notebookType?: "Expense" | "Income";
}

const storageKeyFor = (notebookType: "Expense" | "Income") =>
  `expensebook:selected-${notebookType.toLowerCase()}-notebook`;

const clearStoredNotebook = (storageKey: string) => {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(storageKey);
  window.localStorage.removeItem(storageKey);
};

const storeNotebook = (storageKey: string, notebook: Notebook) => {
  if (typeof window === "undefined") return;

  const serializedNotebook = JSON.stringify(notebook);
  window.sessionStorage.setItem(storageKey, serializedNotebook);
  window.localStorage.setItem(storageKey, serializedNotebook);
};

const getStoredNotebook = (storageKey: string) => {
  if (typeof window === "undefined") return null;

  try {
    const rawNotebook =
      window.sessionStorage.getItem(storageKey) ??
      window.localStorage.getItem(storageKey);

    return rawNotebook ? (JSON.parse(rawNotebook) as Notebook) : null;
  } catch {
    clearStoredNotebook(storageKey);
    return null;
  }
};

const Dashboard = ({ notebookType = "Expense" }: DashboardProps) => {
  const { user } = useAuth();
  const storageKey = storageKeyFor(notebookType);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(() => getStoredNotebook(storageKey));

  useEffect(() => {
    if (!user) {
      setSelectedNotebook(null);
      clearStoredNotebook(storageKey);
      return;
    }

    const storedNotebook = getStoredNotebook(storageKey);
    if (storedNotebook?.user_id === user.id && storedNotebook.type === notebookType) {
      setSelectedNotebook((currentNotebook) => currentNotebook ?? storedNotebook);
      return;
    }

    clearStoredNotebook(storageKey);
  }, [notebookType, storageKey, user]);

  useEffect(() => {
    if (!selectedNotebook) {
      clearStoredNotebook(storageKey);
      return;
    }

    storeNotebook(storageKey, selectedNotebook);
  }, [selectedNotebook, storageKey]);

  const handleSelectNotebook = (notebook: Notebook) => {
    storeNotebook(storageKey, notebook);
    setSelectedNotebook(notebook);
  };

  const handleBack = () => {
    clearStoredNotebook(storageKey);
    setSelectedNotebook(null);
  };

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={handleBack} />;
  }

  return <NotebookList onSelect={handleSelectNotebook} notebookType={notebookType} />;
};

export default Dashboard;
