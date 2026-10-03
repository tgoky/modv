import type { Metadata } from "next";
import { TerminalView } from "@/components/terminal/terminal-view";
import { requireUser } from "@/lib/auth/dal";
import { BRAND } from "@/lib/brand";
import { loadState } from "@/lib/sim/service";

export const metadata: Metadata = { title: `Terminal | ${BRAND.name}` };

export default async function DashboardPage() {
  const user = await requireUser();
  const initial = await loadState(user.id);
  return <TerminalView initial={initial} name={user.name} accountNo={user.accountNo} />;
}
