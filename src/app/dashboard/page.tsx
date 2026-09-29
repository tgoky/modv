import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard | modv" };

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <DashboardView
      name={user.name}
      accountNo={user.accountNo}
      balanceCents={user.balanceCents}
    />
  );
}
