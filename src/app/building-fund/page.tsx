"use client";

import { FinancePage } from "@/components/finance-page";

export default function BuildingFundPage() {
  return (
    <FinancePage
      type="building"
      heading="Building Project Fund"
      subtitle="Pledges and contributions toward the diocesan building project, tracked against target"
      tone="amber"
      categoryLabel="Project / campaign"
      showTarget
    />
  );
}
