"use client";

import { useCallback, useEffect, useState } from "react";
import { getAll } from "@/services/api";
import type { AppData } from "@/types";

export function useAppData() {
  const [data, setData] = useState<AppData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getAll());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}
