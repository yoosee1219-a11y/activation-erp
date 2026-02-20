"use client";

import { useState, useEffect } from "react";

interface Agency {
  id: string;
  name: string;
}

export function useAgencyFilter() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agencies")
      .then((res) => res.json())
      .then((data) => {
        setAgencies(data.agencies || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return {
    agencies,
    selectedAgency,
    setSelectedAgency,
    loading,
    agencyParam: selectedAgency === "all" ? undefined : selectedAgency,
  };
}
