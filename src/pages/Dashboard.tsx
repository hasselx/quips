import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NotebookList } from "@/components/NotebookList";
import { NotebookView } from "@/components/NotebookView";
import type { Tables } from "@/integrations/supabase/types";

type Notebook = Tables<"notebooks">;

const Dashboard = () => {
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={() => setSelectedNotebook(null)} />;
  }

  return <NotebookList onSelect={setSelectedNotebook} />;
};

export default Dashboard;
