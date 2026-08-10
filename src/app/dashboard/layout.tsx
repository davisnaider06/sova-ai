import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div data-scroll-container className="flex flex-1 flex-col overflow-y-auto pb-20 lg:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  );
}
