import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { CampaignForm } from "@/components/campanhas/campaign-form";
import { requireSellerScope } from "@/lib/session";
import { createCampaign } from "../actions";

export default async function NovaCampanhaPage() {
  await requireSellerScope();

  return (
    <>
      <Topbar title="Nova campanha" subtitle="Os produtos você vincula depois de salvar" />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
        <Link
          href="/dashboard/campanhas"
          className="flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para campanhas
        </Link>

        <CampaignForm action={createCampaign} submitLabel="Criar campanha" />
      </div>
    </>
  );
}
