"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

export interface Agency {
  id: string;
  name: string;
  majorCategory?: string | null;
  mediumCategory?: string | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  level: "major" | "medium";
  parentId: string | null;
  children?: CategoryNode[];
}

export function useAgencyFilter() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  // 멀티셀렉트 상태
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/agencies").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([agencyData, categoryData]) => {
        setAgencies(agencyData.agencies || []);
        setCategories(categoryData.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshCategories = useCallback(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  return {
    agencies,
    categories,
    selectedMajors,
    setSelectedMajors,
    selectedMediums,
    setSelectedMediums,
    loading,
    refreshCategories,
  };
}
