"use client";

import { useDashboard } from "../../dashboard-context";
import { ActivationForm } from "@/components/activations/activation-form";

export default function NewActivationPage() {
  const { agencies } = useDashboard();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">새 개통 등록</h1>
      <ActivationForm agencies={agencies} mode="create" />
    </div>
  );
}
