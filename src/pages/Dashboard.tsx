import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NotebookList } from "@/components/NotebookList";
import { NotebookView } from "@/components/NotebookView";
import type { Tables } from "@/integrations/supabase/types";

type Notebook = Tables<"notebooks">;
const SELECTED_NOTEBOOK_STORAGE_KEY = "expensebook:selected-notebook";

const getStoredNotebook = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawNotebook = window.sessionStorage.getItem(SELECTED_NOTEBOOK_STORAGE_KEY);
    return rawNotebook ? (JSON.parse(rawNotebook) as Notebook) : null;
  } catch {
    window.sessionStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
    return null;
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(() => getStoredNotebook());

  useEffect(() => {
    if (!user) {
      setSelectedNotebook(null);
      window.sessionStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
      return;
    }

    const storedNotebook = getStoredNotebook();
    if (storedNotebook?.user_id === user.id) {
      setSelectedNotebook((currentNotebook) => currentNotebook ?? storedNotebook);
      return;
    }

    window.sessionStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    if (!selectedNotebook) {
      window.sessionStorage.removeItem(SELECTED_NOTEBOOK_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(SELECTED_NOTEBOOK_STORAGE_KEY, JSON.stringify(selectedNotebook));
  }, [selectedNotebook]);

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={() => setSelectedNotebook(null)} />;
  }

  return <NotebookList onSelect={setSelectedNotebook} />;
};

export default Dashboard;
