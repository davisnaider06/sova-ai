import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireProfile } from "@/lib/session";

// Todo dado do domínio pendura em Profile — sem perfil escolhido não existe
// dashboard para renderizar, só um redirect para o onboarding. Fazer esse
// gate aqui, no layout, garante que nenhuma das páginas filhas precise lembrar.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireProfile();

  const profiles = user.profiles.map((p) => ({
    id: p.id,
    type: p.type,
    displayName: p.displayName,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        profiles={profiles}
        activeProfileId={profile.id}
        activeType={profile.type}
        isAdmin={user.role === "ADMIN"}
      />
      <div data-scroll-container className="flex flex-1 flex-col overflow-y-auto pb-20 lg:pb-0">
        {children}
      </div>
      <MobileNav activeType={profile.type} />
    </div>
  );
}
