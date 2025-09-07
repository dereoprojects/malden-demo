"use client";

import { useEffect, useState } from "react";

export type FreeModel = { id: string; label: string; supportsImages?: boolean };

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
        if (mounted) setModels(Array.isArray(j?.data) ? j.data : []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "failed_models");
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
