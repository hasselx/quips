import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORIES, type Category } from "@/types/expense";

export function useCustomCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customCategories = [] } = useQuery({
    queryKey: ["custom-categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("custom_categories")
        .select("name")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map((c) => c.name);
    },
    enabled: !!user,
  });

  const allCategories = [...CATEGORIES, ...customCategories];

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("custom_categories")
        .insert({ name, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-categories"] });
    },
  });

  return { allCategories, customCategories, addCategory };
}
