"use client";

import { FinancePage } from "@/components/finance-page";

export default function DonationsPage() {
  return (
    <FinancePage
      type="donation"
      heading="Donations"
      subtitle="General giving, missions, welfare and special offers — including basket (anonymous) offerings"
      tone="emerald"
      categoryLabel="Fund / cause"
    />
  );
}
