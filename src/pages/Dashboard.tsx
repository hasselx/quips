import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NotebookList } from "@/components/NotebookList";
import { NotebookView } from "@/components/NotebookView";
import type { Tables } from "@/integrations/supabase/types";

type Notebook = Tables<"notebooks">;
const SELECTED_NOTEBOOK_STORAGE_KEY = "expensebook:selected-notebook";

const clearStoredNotebook = () => {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
  window.localStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
};

const storeNotebook = (notebook: Notebook) => {
  if (typeof window === "undefined") return;

  const serializedNotebook = JSON.stringify(notebook);
  window.sessionStorage.setItem(SELECTED_NOTEBOOK_STORAGE_KEY, serializedNotebook);
  window.localStorage.setItem(SELECTED_NOTEBOOK_STORAGE_KEY, serializedNotebook);
};

const getStoredNotebook = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawNotebook =
      window.sessionStorage.getItem(SELECTED_NOTEBOOK_STORAGE_KEY) ??
      window.localStorage.getItem(SELECTED_NOTEBOOK_STORAGE_KEY);

    return rawNotebook ? (JSON.parse(rawNotebook) as Notebook) : null;
  } catch {
    clearStoredNotebook();
    return null;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(() => getStoredNotebook());

  useEffect(() => {
    if (!user) {
      setSelectedNotebook(null);
      clearStoredNotebook();
      return;
    }

    const storedNotebook = getStoredNotebook();
    if (storedNotebook?.user_id === user.id) {
      setSelectedNotebook((currentNotebook) => currentNotebook ?? storedNotebook);
      return;
    }

    clearStoredNotebook();
  }, [user]);

  useEffect(() => {
    if (!selectedNotebook) {
      clearStoredNotebook();
      return;
    }

    storeNotebook(selectedNotebook);
  }, [selectedNotebook]);

  const handleSelectNotebook = (notebook: Notebook) => {
    storeNotebook(notebook);
    setSelectedNotebook(notebook);
  };

  const handleBack = () => {
    clearStoredNotebook();
    setSelectedNotebook(null);
  };

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={handleBack} />;
  }

  return <NotebookList onSelect={handleSelectNotebook} />;
};

export default Dashboard;
