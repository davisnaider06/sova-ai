import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Camada de acesso escopada por profile.
//
// A regra multi-tenant do doc de arquitetura (§58) é "validar ownership em
// todas as operações". Isso não é arquitetura, é um lembrete — e segurança que
// depende de alguém lembrar falha na primeira sexta-feira corrida.
//
// Aqui o filtro não é opcional: ele é injetado depois do `where` do chamador,
// então nem passando `sellerProfileId` de outro dono dá para escapar. Código de
// feature não deve importar `prisma` direto; importa um escopo.
//
// Sobre os tipos: os métodos de lista aceitam where/orderBy/take/skip, mas não
// `include`/`select`. É proposital — espalhar include genérico faria o tipo de
// retorno mentir sobre o que vem do banco. Consulta com join ganha um método
// próprio, com nome de negócio e tipo honesto.
//
// Mutação de registro único usa updateMany/deleteMany e devolve `{ count }`:
// count 0 significa "não existe OU não é seu", e o chamador não consegue
// distinguir — que é exatamente o que se quer expor para fora do tenant.
// ---------------------------------------------------------------------------

type ListArgs<TWhere, TOrderBy> = {
  where?: TWhere;
  orderBy?: TOrderBy;
  take?: number;
  skip?: number;
};

// ===========================================================================
// Escopo do Seller
// ===========================================================================

export function sellerScope(sellerProfileId: string) {
  return {
    sellerProfileId,

    products: {
      findMany: (
        args: ListArgs<Prisma.ProductWhereInput, Prisma.ProductOrderByWithRelationInput> = {},
      ) =>
        prisma.product.findMany({
          ...args,
          where: { ...args.where, sellerProfileId },
        }),

      findById: (id: string) => prisma.product.findFirst({ where: { id, sellerProfileId } }),

      /// Produto + economia, para a calculadora de comissão recomendada.
      findByIdWithEconomics: (id: string) =>
        prisma.product.findFirst({
          where: { id, sellerProfileId },
          include: { economics: true },
        }),

      /// O que a listagem precisa mostrar junto de cada produto: quantos
      /// creators já promovem, quantos aguardam aprovação, e se os custos já
      /// foram informados (sem eles a calculadora de comissão não roda).
      listForIndex: (
        args: ListArgs<Prisma.ProductWhereInput, Prisma.ProductOrderByWithRelationInput> = {},
      ) =>
        prisma.product.findMany({
          ...args,
          where: { ...args.where, sellerProfileId },
          include: {
            economics: { select: { productCost: true } },
            _count: {
              select: {
                affiliations: { where: { status: "ACTIVE" } },
              },
            },
          },
        }),

      /// Afiliações pendentes por produto, em uma consulta só — a listagem
      /// precisa do número para o selo de "aguardando você".
      pendingAffiliationCounts: async () => {
        const rows = await prisma.affiliation.groupBy({
          by: ["productId"],
          where: { status: "PENDING", product: { sellerProfileId } },
          _count: { _all: true },
        });
        return new Map(rows.map((r) => [r.productId, r._count._all]));
      },

      count: (where: Prisma.ProductWhereInput = {}) =>
        prisma.product.count({ where: { ...where, sellerProfileId } }),

      create: (data: Omit<Prisma.ProductUncheckedCreateInput, "sellerProfileId">) =>
        prisma.product.create({ data: { ...data, sellerProfileId } }),

      update: (id: string, data: Prisma.ProductUncheckedUpdateInput) =>
        prisma.product.updateMany({ where: { id, sellerProfileId }, data }),

      delete: (id: string) => prisma.product.deleteMany({ where: { id, sellerProfileId } }),

      /// Upsert da economia do produto, verificando o dono antes de escrever.
      /// Devolve null quando o produto não é deste seller.
      setEconomics: async (
        productId: string,
        data: Omit<Prisma.ProductEconomicsUncheckedCreateInput, "productId" | "id">,
      ) => {
        const owned = await prisma.product.findFirst({
          where: { id: productId, sellerProfileId },
          select: { id: true },
        });
        if (!owned) return null;
        return prisma.productEconomics.upsert({
          where: { productId },
          create: { ...data, productId },
          update: data,
        });
      },
    },

    campaigns: {
      findMany: (
        args: ListArgs<Prisma.CampaignWhereInput, Prisma.CampaignOrderByWithRelationInput> = {},
      ) =>
        prisma.campaign.findMany({
          ...args,
          where: { ...args.where, sellerProfileId },
        }),

      findById: (id: string) => prisma.campaign.findFirst({ where: { id, sellerProfileId } }),

      /// Listagem com o tamanho de cada campanha — quantos produtos entraram e
      /// quantos creators aceitaram o convite.
      listForIndex: (
        args: ListArgs<Prisma.CampaignWhereInput, Prisma.CampaignOrderByWithRelationInput> = {},
      ) =>
        prisma.campaign.findMany({
          ...args,
          where: { ...args.where, sellerProfileId },
          include: {
            _count: {
              select: {
                products: true,
                creators: { where: { status: "ACCEPTED" } },
              },
            },
          },
        }),

      /// A campanha com os produtos vinculados e os creators convidados.
      findByIdWithRelations: (id: string) =>
        prisma.campaign.findFirst({
          where: { id, sellerProfileId },
          include: {
            products: {
              include: {
                product: {
                  select: { id: true, name: true, category: true, price: true, imageUrl: true },
                },
              },
            },
            creators: {
              include: {
                creatorProfile: {
                  include: { profile: { select: { displayName: true } } },
                },
              },
            },
          },
        }),

      count: (where: Prisma.CampaignWhereInput = {}) =>
        prisma.campaign.count({ where: { ...where, sellerProfileId } }),

      create: (data: Omit<Prisma.CampaignUncheckedCreateInput, "sellerProfileId">) =>
        prisma.campaign.create({ data: { ...data, sellerProfileId } }),

      update: (id: string, data: Prisma.CampaignUncheckedUpdateInput) =>
        prisma.campaign.updateMany({ where: { id, sellerProfileId }, data }),
    },

    orders: {
      findMany: (
        args: ListArgs<Prisma.OrderWhereInput, Prisma.OrderOrderByWithRelationInput> = {},
      ) =>
        prisma.order.findMany({
          ...args,
          where: { ...args.where, sellerProfileId },
        }),

      findById: (id: string) => prisma.order.findFirst({ where: { id, sellerProfileId } }),

      count: (where: Prisma.OrderWhereInput = {}) =>
        prisma.order.count({ where: { ...where, sellerProfileId } }),
    },

    /// Afiliações dos produtos deste seller — quem está habilitado a promover o quê.
    affiliations: {
      findMany: (
        args: ListArgs<Prisma.AffiliationWhereInput, Prisma.AffiliationOrderByWithRelationInput> = {},
      ) =>
        prisma.affiliation.findMany({
          ...args,
          where: { ...args.where, product: { sellerProfileId } },
        }),

      findById: (id: string) =>
        prisma.affiliation.findFirst({ where: { id, product: { sellerProfileId } } }),

      /// Afiliações de um produto com quem é o creator do outro lado. A tela de
      /// aprovação precisa de nome e audiência para o seller decidir — id de
      /// perfil sozinho não é informação suficiente para dizer sim ou não.
      listForProduct: (productId: string) =>
        prisma.affiliation.findMany({
          where: { productId, product: { sellerProfileId } },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          include: {
            creatorProfile: {
              include: { profile: { select: { displayName: true } } },
            },
          },
        }),

      /// Caixa de entrada: tudo que espera decisão do seller, de todos os
      /// produtos, com o produto junto para dar contexto na mesma linha.
      inbox: (status: Prisma.AffiliationWhereInput["status"] = "PENDING") =>
        prisma.affiliation.findMany({
          where: { status, product: { sellerProfileId } },
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { id: true, name: true, category: true, price: true, imageUrl: true } },
            creatorProfile: {
              include: { profile: { select: { displayName: true } } },
            },
          },
        }),

      /// Aprovar ou rejeitar um pedido de afiliação em produto deste seller.
      setStatus: (id: string, status: Prisma.AffiliationUncheckedUpdateInput["status"]) =>
        prisma.affiliation.updateMany({
          where: { id, product: { sellerProfileId } },
          data: { status, ...(status === "ACTIVE" ? { startedAt: new Date() } : {}) },
        }),
    },
  };
}

// ===========================================================================
// Escopo do Creator
// ===========================================================================

export function creatorScope(creatorProfileId: string) {
  return {
    creatorProfileId,

    affiliations: {
      findMany: (
        args: ListArgs<Prisma.AffiliationWhereInput, Prisma.AffiliationOrderByWithRelationInput> = {},
      ) =>
        prisma.affiliation.findMany({
          ...args,
          where: { ...args.where, creatorProfileId },
        }),

      findById: (id: string) => prisma.affiliation.findFirst({ where: { id, creatorProfileId } }),

      count: (where: Prisma.AffiliationWhereInput = {}) =>
        prisma.affiliation.count({ where: { ...where, creatorProfileId } }),

      /// Pedir afiliação a um produto. O vínculo é único por (creator, produto),
      /// então pedir de novo reativa o mesmo registro em vez de duplicar.
      request: (productId: string, commissionRate: Prisma.Decimal | number | string) =>
        prisma.affiliation.upsert({
          where: { creatorProfileId_productId: { creatorProfileId, productId } },
          create: { creatorProfileId, productId, commissionRate, status: "PENDING" },
          update: { status: "PENDING", endedAt: null },
        }),

      end: (id: string) =>
        prisma.affiliation.updateMany({
          where: { id, creatorProfileId },
          data: { status: "ENDED", endedAt: new Date() },
        }),
    },

    contents: {
      findMany: (
        args: ListArgs<Prisma.ContentWhereInput, Prisma.ContentOrderByWithRelationInput> = {},
      ) =>
        prisma.content.findMany({
          ...args,
          where: { ...args.where, creatorProfileId },
        }),

      findById: (id: string) => prisma.content.findFirst({ where: { id, creatorProfileId } }),

      create: (data: Omit<Prisma.ContentUncheckedCreateInput, "creatorProfileId">) =>
        prisma.content.create({ data: { ...data, creatorProfileId } }),
    },

    commissions: {
      findMany: (
        args: ListArgs<Prisma.CommissionWhereInput, Prisma.CommissionOrderByWithRelationInput> = {},
      ) =>
        prisma.commission.findMany({
          ...args,
          where: { ...args.where, creatorProfileId },
        }),

      count: (where: Prisma.CommissionWhereInput = {}) =>
        prisma.commission.count({ where: { ...where, creatorProfileId } }),
    },

    /// Pedidos atribuídos a este creator. Passa pela afiliação de propósito:
    /// a atribuição é o que liga a venda ao creator, e ela pode ser nula.
    orders: {
      findMany: (
        args: ListArgs<Prisma.OrderWhereInput, Prisma.OrderOrderByWithRelationInput> = {},
      ) =>
        prisma.order.findMany({
          ...args,
          where: { ...args.where, attributedAffiliation: { creatorProfileId } },
        }),
    },
  };
}

// ===========================================================================
// Escopo comum a qualquer profile
// ===========================================================================

export function profileScope(profileId: string) {
  return {
    profileId,

    metrics: {
      /// Métrica nova é sempre uma linha nova — a série é append-only.
      record: (
        data: Omit<Prisma.ProfileMetricUncheckedCreateInput, "profileId" | "id">,
      ) => prisma.profileMetric.create({ data: { ...data, profileId } }),

      /// Último valor conhecido de uma chave, com a procedência junto.
      /// A UI precisa dos dois: o número e o quanto dá para confiar nele.
      latest: (key: string, category?: string) =>
        prisma.profileMetric.findFirst({
          where: { profileId, key, ...(category ? { category } : {}) },
          orderBy: { recordedAt: "desc" },
        }),

      history: (key: string, take = 30) =>
        prisma.profileMetric.findMany({
          where: { profileId, key },
          orderBy: { recordedAt: "desc" },
          take,
        }),
    },

    externalAccounts: {
      findMany: () => prisma.externalAccount.findMany({ where: { profileId } }),

      findByProvider: (provider: Prisma.ExternalAccountUncheckedCreateInput["provider"]) =>
        prisma.externalAccount.findFirst({ where: { profileId, provider } }),

      /// Cria ou atualiza a conexão deste perfil com um provedor.
      ///
      /// Devolve `null` quando a conta externa já pertence a OUTRO perfil. A
      /// constraint `@@unique([provider, providerAccountId])` garante que uma
      /// conta do TikTok só se liga a um perfil no sistema inteiro; sem esta
      /// checagem, o upsert estouraria com erro de constraint na cara do
      /// usuário em vez de uma mensagem que ele entende.
      connect: async (
        provider: Prisma.ExternalAccountUncheckedCreateInput["provider"],
        providerAccountId: string,
        data: Omit<
          Prisma.ExternalAccountUncheckedCreateInput,
          "id" | "profileId" | "provider" | "providerAccountId"
        >,
      ) => {
        const existing = await prisma.externalAccount.findUnique({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          select: { id: true, profileId: true },
        });

        if (existing && existing.profileId !== profileId) return null;

        return prisma.externalAccount.upsert({
          where: { provider_providerAccountId: { provider, providerAccountId } },
          create: { ...data, profileId, provider, providerAccountId },
          update: data,
        });
      },

      /// Atualiza campos de uma conexão do próprio perfil.
      ///
      /// `updateMany` com o filtro de dono: id de outro perfil simplesmente não
      /// encontra linha, em vez de escrever onde não devia.
      update: (id: string, data: Prisma.ExternalAccountUncheckedUpdateInput) =>
        prisma.externalAccount.updateMany({ where: { id, profileId }, data }),
    },

    events: {
      record: (
        eventType: string,
        payload: { entityType?: string; entityId?: string; metadata?: Prisma.InputJsonValue } = {},
      ) => prisma.event.create({ data: { profileId, eventType, ...payload } }),
    },
  };
}

export type SellerScope = ReturnType<typeof sellerScope>;
export type CreatorScope = ReturnType<typeof creatorScope>;
export type ProfileScope = ReturnType<typeof profileScope>;
