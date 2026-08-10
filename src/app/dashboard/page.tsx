import { getProducts, getMarketSignals } from "@/lib/data";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const revalidate = 30;

export default async function DashboardPage() {
  const [products, marketSignals] = await Promise.all([getProducts(), getMarketSignals()]);
  return <DashboardClient products={products} marketSignals={marketSignals} />;
}
