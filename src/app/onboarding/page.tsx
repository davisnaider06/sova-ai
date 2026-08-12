import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { requireUser } from "@/lib/session";
import { RoleCard } from "./role-card";

export const metadata: Metadata = {
  title: "Como você vai usar a Sova",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const hasCreator = user.profiles.some((p) => p.type === "CREATOR");
  const hasSeller = user.profiles.some((p) => p.type === "SELLER");
  const isAddingSecondRole = hasCreator !== hasSeller;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-16">
      <Logo size={32} />

      <h1 className="mt-8 text-2xl font-semibold tracking-tight sm:text-3xl">
        {isAddingSecondRole
          ? "Adicionar o outro papel à sua conta"
          : "Como você pretende usar a plataforma?"}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-secondary">
        A escolha define por onde você começa. Não trava nada: a mesma conta pode ter os dois
        perfis, e você alterna entre eles quando quiser.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RoleCard
          type="CREATOR"
          title="Sou Creator"
          description="Quero encontrar produtos, criar conteúdo e ganhar comissão."
          bullets={[
            "Descobrir produtos que combinam com seu público",
            "Afiliar-se e acompanhar suas vendas",
            "Ver quanto cada produto pode render",
          ]}
          owned={hasCreator}
        />

        <RoleCard
          type="SELLER"
          title="Sou Seller"
          description="Quero encontrar creators para vender meus produtos."
          bullets={[
            "Cadastrar produtos e definir a economia de cada um",
            "Calcular a comissão que ainda fecha a sua margem",
            "Encontrar e convidar creators",
          ]}
          owned={hasSeller}
        />
      </div>
    </main>
  );
}
