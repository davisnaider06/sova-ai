import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Audit log (§65 da arquitetura).
//
// Diferente de `Event`, e a distinção importa:
//
//   Event    — o que aconteceu no produto, para analytics. Volume alto,
//              descartável, agregável. "PRODUCT_CREATED", "AFFILIATION_REQUESTED".
//
//   AuditLog — quem fez o quê, para responder pergunta de auditoria depois.
//              Guarda o **usuário**, não só o perfil, porque a pergunta que ele
//              responde é "quem mudou essa comissão?" — e perfil não é pessoa.
//
// Registrar nos dois lugares parece redundante e não é: um responde "quantas
// afiliações foram aprovadas esta semana", o outro responde "quem recusou a
// afiliação da Joana e quando".
// ---------------------------------------------------------------------------

/// Ações auditáveis. Lista fechada de propósito — string livre vira catálogo
/// que ninguém consegue consultar depois porque cada chamada escreveu de um
/// jeito. Os nomes vêm dos exemplos do §65.
export type AuditAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_ARCHIVED"
  | "PRODUCT_IMPORTED"
  | "PRODUCT_ECONOMICS_CHANGED"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_UPDATED"
  | "CREATOR_INVITED"
  | "CREATOR_ENABLED"
  | "CAMPAIGN_INVITE_ACCEPTED"
  | "CAMPAIGN_INVITE_REJECTED"
  | "AFFILIATION_REQUESTED"
  | "AFFILIATION_DECIDED"
  | "AFFILIATION_ENDED"
  | "COMMISSION_CHANGED"
  | "ORDERS_IMPORTED"
  | "TIKTOK_CONNECTED";

export async function recordAudit(entry: {
  userId?: string | null;
  profileId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  // Auditoria nunca pode derrubar a operação que ela observa. Se a escrita do
  // log falhar, a afiliação aprovada continua aprovada — o registro é
  // consequência do fato, não condição dele.
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        profileId: entry.profileId ?? null,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    console.error("[audit] falha ao registrar", entry.action, error);
  }
}
