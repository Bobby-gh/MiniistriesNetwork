"use client";

import { FinancePage } from "@/components/finance-page";

export default function FuneralLevyPage() {
  return (
    <FinancePage
      type="funeral"
      heading="Funeral Levy"
      subtitle="Levy contributions per bereavement, with a compliance view of members who have not paid this month"
      tone="indigo"
      categoryLabel="In respect of"
      compliance
    />
  );
}
