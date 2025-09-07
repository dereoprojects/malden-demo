"use client";

import { useEffect, useState } from "react";
import { FreeModel, ModelsResponseSchema } from "@/lib/schemas";

export function useFreeModels() {
  const [models, setModels] = useState<FreeModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/models/free", { cache: "no-store" });
        if (!res.ok) throw new Error(`models ${res.status}`);
        const j = await res.json();
        if (mounted) {
          const validated = ModelsResponseSchema.parse(j);
          setModels(validated.data);
        }
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : "failed_models");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { models, loading, error };
}
