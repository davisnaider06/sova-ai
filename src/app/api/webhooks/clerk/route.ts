import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Sync de User do Clerk para o banco.
//
// Configurar em Clerk > Webhooks > Add Endpoint:
//   URL:     https://SEU-DOMINIO/api/webhooks/clerk
//   Eventos: user.created, user.updated, user.deleted
// e colar o signing secret em CLERK_WEBHOOK_SIGNING_SECRET.
//
// Em dev, exponha a porta com um túnel (ngrok/cloudflared) — ou não configure
// nada: `ensureUser()` em src/lib/session.ts cria o usuário no primeiro acesso.
// O webhook é o que mantém email/nome/avatar em dia depois disso.
//
// A rota é pública no proxy.ts de propósito: quem chama é o Clerk, não um
// usuário logado. A autenticidade vem da assinatura Svix, verificada abaixo —
// sem ela, qualquer um poderia forjar um user.deleted.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("[clerk-webhook] assinatura inválida:", err);
    return new Response("Assinatura inválida", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
          evt.data;

        const email =
          email_addresses.find((e) => e.id === primary_email_address_id)?.email_address ??
          email_addresses[0]?.email_address;

        // Sem email não dá para criar o registro (a coluna é única e obrigatória).
        // Responder 200 mesmo assim: reenviar não vai fazer aparecer um email.
        if (!email) {
          console.warn(`[clerk-webhook] ${evt.type} sem email para ${id} — ignorado`);
          return new Response("Sem email, ignorado", { status: 200 });
        }

        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        await prisma.user.upsert({
          where: { id },
          create: { id, email, name, avatarUrl: image_url || null },
          update: { email, name, avatarUrl: image_url || null },
        });
        break;
      }

      case "user.deleted": {
        const { id, deleted } = evt.data;
        if (!id || deleted === false) break;

        // Soft delete: os perfis carregam pedidos, comissões e histórico de
        // vendas de terceiros. Apagar a linha levaria junto (Cascade) registro
        // financeiro que o seller do outro lado ainda precisa enxergar.
        await prisma.user.updateMany({
          where: { id },
          data: { status: "DELETED" },
        });
        break;
      }

      default:
        // Evento que não nos interessa ainda. 200 para o Clerk não ficar
        // reentregando o que a gente ignorou de propósito.
        break;
    }
  } catch (err) {
    // 500 aqui é intencional: o Clerk reentrega, e o upsert é idempotente.
    console.error(`[clerk-webhook] falha processando ${evt.type}:`, err);
    return new Response("Erro ao processar webhook", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
