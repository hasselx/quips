import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NotebookList } from "@/components/NotebookList";
import { NotebookView } from "@/components/NotebookView";
import type { Tables } from "@/integrations/supabase/types";
import Auth from "@/pages/Auth";

type Notebook = Tables<"notebooks">;

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={() => setSelectedNotebook(null)} />;
  }

  return <NotebookList onSelect={setSelectedNotebook} />;
};

export default Index;
