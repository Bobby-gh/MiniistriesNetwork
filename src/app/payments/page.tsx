"use client";

import { FinancePage } from "@/components/finance-page";

export default function OtherPaymentsPage() {
  return (
    <FinancePage
      type="other"
      heading="Other Payments"
      subtitle="Event fees, subscriptions, hall rental, welfare contributions and miscellaneous income"
      tone="sky"
      categoryLabel="Category"
    />
  );
}
