# Decisões de Arquitetura e Plano de Execução

> Documento de trabalho — gerado em 11/08/2026 a partir da análise de
> `Creator Commerce Platform — Arquitetura Completa.md` (o "doc de arquitetura")
> confrontada com o estado real do repositório.
>
> O doc de arquitetura descreve **a visão**. Este aqui descreve **o que fazer com ela**:
> o que está furado, como corrigir, e em que ordem construir.

---

## Índice

1. [Estado atual do repositório](#1-estado-atual-do-repositório)
2. [O que o doc de arquitetura acerta](#2-o-que-o-doc-de-arquitetura-acerta)
3. [O que está furado](#3-o-que-está-furado)
4. [A ideia central da solução](#4-a-ideia-central-da-solução)
5. [Solução 1 — o que dá pra construir sem o TikTok](#5-solução-1--o-que-dá-pra-construir-sem-o-tiktok)
6. [Solução 2 — cold start do matching](#6-solução-2--cold-start-do-matching)
7. [Solução 3 — o que fazer com o código atual](#7-solução-3--o-que-fazer-com-o-código-atual)
8. [Correções de modelagem](#8-correções-de-modelagem)
9. [O plano por sprints](#9-o-plano-por-sprints)
10. [Pendências e questões em aberto](#10-pendências-e-questões-em-aberto)

---

## 1. Estado atual do repositório

Levantamento feito lendo o código, não por suposição.

**Stack instalada:** Next.js 16.3 · React 19.2 · TypeScript · Tailwind 4 · Prisma 7.9
(adapter Neon) · Clerk 7.7 · Radix UI · Recharts · Framer Motion. Deploy configurado
para Vercel.

**O que existe de código:**

- 13 páginas de dashboard em `src/app/dashboard/*` — todas server components
- Design system em `src/components/ui/*` (Radix + Tailwind), layout, charts
- Auth: Clerk via `src/proxy.ts` (no Next 16 o `middleware.ts` virou `proxy.ts`),
  protegendo `/dashboard(.*)`
- `src/lib/data.ts` → lê Prisma e devolve no formato que a UI já esperava do mock
- `src/lib/mock-data.ts` → 348 linhas de dado fake

**O que NÃO existe:**

- **Zero rotas de API** (`src/app/**/route.ts` não retorna nada)
- Nenhum sync de `User` do Clerk para o banco (não há webhook)
- Nenhuma camada de integração, nenhum job, nenhum evento

**Schema atual** (`prisma/schema.prisma`): `User`, `Product`, `ProductAnalysis`,
`Favorite`, `TopSeller`, `MarketSignal`, `ActivityLog`, `SalesPage`.

> ⚠️ Conclusão importante: esse schema **não é uma versão inicial** do que o doc de
> arquitetura descreve. É **outro produto** — uma ferramenta de pesquisa de produto +
> gerador de copy, de um lado só. Não tem `Profile`, `Affiliation`, `Campaign`,
> `Order` nem `Commission`. Nem o `User` bate (tem `plan` e `storeName`, assume papel
> único).

---

## 2. O que o doc de arquitetura acerta

Três decisões difíceis de reverter depois, e que já estão certas:

**`Affiliation` ≠ `Campaign`** (§76)
Afiliação = "creator está habilitado a promover o produto X".
Campanha = "seller organizou uma iniciativa comercial".
Misturar isso é o erro clássico do modelo: depois você não consegue representar o
creator que descobriu o produto sozinho, sem campanha nenhuma.

**`ExternalAccount` separado do `Profile`** (§12) + `source` / `source_id` / `synced_at` (§14)
É o que impede a plataforma de virar refém do TikTok. O perfil interno existe
independente da conta externa.

**Idempotência por `external_order_id`** (§62)
Webhook duplicado é regra, não exceção. Constraint única no identificador externo
resolve na origem.

---

## 3. O que está furado

### 3.1 O doc contradiz o código que já existe

| Doc de arquitetura diz | Repositório tem |
|---|---|
| `User.password_hash` (§9) | Clerk (`src/proxy.ts`) |
| VPS + Docker + Redis + Workers (§7, §82) | Vercel + Neon serverless |
| Plataforma de dois lados | Dashboard de um lado só |
| API `/api/*` com 18 domínios (§59) | **Zero rotas de API** |

### 3.2 O P0 depende inteiro de uma API não confirmada

Dos 13 itens do P0 (§67), 6 são impossíveis sem acesso à TikTok Shop API. O próprio
doc reconhece na §80 e coloca a Fase 0 (discovery técnico) antes de codificar.

Continua **não confirmado**: se o Brasil é mercado suportado, e quais scopes o app
consegue pedir.

### 3.3 Cold start do matching — o furo mais grave

A §46 é o coração da tese: creator de 25k seguidores com R$120k de GMV em suplementos
vale mais que o de 50k sem histórico. A tese está certa. O problema é operacional:

> De onde vem o "R$120k GMV em suplementos" de um creator que **nunca vendeu na sua
> plataforma**?

O OAuth do TikTok Shop é **por seller** — o token é da loja do seu cliente. Isso te dá
os pedidos e creators **daquela loja**, não o histórico global do creator no
ecossistema. Sem resolver isso, o Matching Engine (§22–24) no dia 1 é
`categoria = categoria` com uma pintura por cima — exatamente o que a §46 manda não
fazer.

### 3.4 Furos concretos de modelagem

Baratos de corrigir agora, caros depois:

- `Order` tem `product_id` **e** `OrderItem[]` (§29, §30) → duas fontes de verdade
- `Commission` aponta para `order` e `campaign` mas **não para `affiliation`** (§31) →
  impossível saber qual vínculo gerou a venda; e a `rate` pode ter mudado desde então
- `Content` guarda `views/gmv/commission` **e** existe `ContentPerformance` com os
  mesmos campos (§26, §28) → qual é a verdade?
- Nada sobre **janela de atribuição**: creator postou dia 1, venda entrou dia 20 —
  comissão de quem?
- Multi-tenant (§58) diz "validar ownership em todas as operações" mas não define o
  mecanismo. "Lembrar de filtrar" não é arquitetura, é dívida esperando um vazamento
  entre clientes

---

## 4. A ideia central da solução

As três questões (dependência do TikTok, cold start, código legado) têm **uma solução
só**:

> ### Separar o que é **seu** do que é **fonte externa**.

Tudo que trava está do lado da fonte. Quase nada do **domínio** depende dela.

---

## 5. Solução 1 — o que dá pra construir sem o TikTok

Item por item do P0 (§67), supondo **zero acesso** ao TikTok:

| Item P0 | Sobrevive? | Por quê |
|---|---|---|
| Auth, User, Profile | ✅ | Clerk já está no repo |
| CreatorProfile / SellerProfile | ✅ | dados declarados no onboarding |
| TikTok OAuth | ❌ | é a fonte |
| **Product** | ✅ | seller cadastra manual |
| Product **Sync** | ❌ | é a fonte |
| Product Discovery | ✅ | roda sobre os produtos que existirem |
| **Affiliation** | ✅ | o vínculo "creator quer promover X" é **seu** |
| **Campaign** | ✅ | 100% seu — o TikTok nem tem esse conceito |
| ProductEconomics + comissão recomendada | ✅ | é matemática, não API |
| Matching básico | ✅ | regras sobre dados que você tem |
| Orders / Commission | ⚠️ | o *modelo* sim, o *sync* não |
| Dashboard | ✅ | sobre o dado que existir |

**9 de 13 sobrevivem.** O bloqueio não é o domínio — é só o **abastecimento**.

### A jogada: o primeiro adapter é CSV, não TikTok

Construir o pipeline de ingestão agora, com um importador de CSV como primeiro
adaptador:

```
                  ┌──────────────┐
   CSV Upload ───►│              │
                  │  Integration │──► Normalizer ──► Domain ──► Events
   TikTok API ───►│    Layer     │
   (depois)       └──────────────┘
```

Por que isso resolve o risco inteiro:

1. Valida o desenho da camada de integração **hoje**, com dado real (todo seller
   consegue exportar CSV do painel do TikTok Shop)
2. Quando a API liberar, ela entra como segundo adapter — o domínio não muda **uma
   linha**
3. Se a API **nunca** liberar pro Brasil, ainda existe produto. Fica pior, não morto
4. Dá pra ter os primeiros clientes antes da aprovação do Partner Center

É a diferença entre "arquitetura desacoplada" como palavra bonita e como coisa que
salva o projeto. Mesmo princípio do `ExternalAccount` separado, aplicado ao dado.

---

## 6. Solução 2 — cold start do matching

### O fato técnico que muda o desenho

São **duas superfícies de OAuth diferentes** no TikTok:

| Superfície | O que dá | Do quê |
|---|---|---|
| **Lado seller** — TikTok Shop Partner Center | pedidos, produtos, creators | da loja daquele cliente |
| **Lado creator** — TikTok for Developers / Login Kit | vídeos, views, engajamento, audiência | da conta do próprio creator, com consentimento dele |

O histórico de GMV **global** de um creator não existe em API nenhuma. Parar de
projetar features em cima dele.

### A solução: toda métrica carrega a própria procedência

É a §79 ("a IA nunca deve inventar uma métrica") virada em schema:

```prisma
enum MetricSource {
  DECLARED    // o usuário digitou no onboarding
  CONNECTED   // veio do OAuth da conta dele
  PLATFORM    // aconteceu dentro do nosso SaaS
  INFERRED    // calculado / estimado
}
```

Cada métrica guarda `source` + `confidence` + `period`. E os pesos do Matching Engine
**mudam conforme a confiança disponível**:

| Situação do creator | Sinais usados | O que a UI diz |
|---|---|---|
| Novo, nada conectado | nicho + categoria declarados | "Match preliminar — conecte seu TikTok para precisão" (confiança baixa, **exibida**) |
| TikTok conectado | + audiência, views, engajamento reais | "Baseado no seu público" |
| Já vendeu na plataforma | + performance real por categoria | "Baseado no seu histórico de vendas" |

O score guarda o **breakdown** dos componentes, não só o número final. É o que faz a
§23 ("nunca mostrar só 94%") funcionar de verdade, e o que permite auditar quando um
match vier ruim.

### Consequência estratégica

O grafo de dados (§55, o "maior ativo da plataforma") **não nasce do lado seller** —
nasce dos **creators conectando as próprias contas** + do que vende dentro da
plataforma.

Isso confirma a §69 ("creator first") — mas por um motivo melhor do que o escrito lá:
não é só aquisição mais barata, é que **é ali que o dado proprietário se forma**.

---

## 7. Solução 3 — o que fazer com o código atual

**Manter a casca, jogar o miolo fora.**

| Manter | Descartar / arquivar |
|---|---|
| `src/components/ui/*` (Radix + Tailwind) | `Product` atual (semântica errada) |
| Layout, sidebar, topbar, charts | `TopSeller`, `MarketSignal` (dado fake sem fonte) |
| Clerk + `proxy.ts` | `ProductAnalysis`, `SalesPage` → viram feature da camada de IA (§49) depois |
| Setup Next / Prisma / Neon | `src/lib/mock-data.ts` |

O schema atual não é migrável para o novo modelo — é reescrita, aproveitando a UI.

> **Premissa assumida:** o dashboard atual é protótipo. Se já foi vendido ou prometido
> para alguém, o plano muda.

---

## 8. Correções de modelagem

| Problema | Solução | O princípio por trás |
|---|---|---|
| `Order` tem `product_id` **e** `OrderItem[]` | Tirar `product_id` do `Order`. Order = a transação; OrderItem = as linhas | Um fato, um lugar |
| `Commission` sem `affiliation_id` | Adicionar `affiliation_id` **e congelar a `rate` no momento da criação** | Registro financeiro é **imutável**. Se o seller mudar a comissão amanhã, a de ontem não muda junto |
| `Content` × `ContentPerformance` duplicados | `ContentPerformance` = série temporal append-only (a verdade). `Content` = cache do último valor, só pra listagem não fazer join | Separar histórico de estado atual |
| Janela de atribuição indefinida | `Order.attributed_affiliation_id` + `attributed_at`, gravados por um serviço de atribuição com janela explícita (ex: 7 dias) | Atribuição é **decisão de negócio gravada**, nunca calculada na leitura — senão o número muda toda vez que alguém abre a tela |
| Multi-tenant por "lembrar de filtrar" | Camada de acesso escopada: `forProfile(profileId).products.findMany()`. Nenhum código de feature toca o Prisma cru | Segurança que depende de disciplina humana falha. Tornar o erro **impossível de escrever**, não só proibido |
| `Profile` + `CreatorProfile`/`SellerProfile` (3 tabelas) | **Manter.** O join extra é barato; sem o `Profile` como âncora, toda FK (`Affiliation.creator_profile_id`, `Product.seller_profile_id`) e o `ExternalAccount` perdem identidade estável quando o user tem 2 papéis | Indireção que paga aluguel: essa paga |
| Redis + Workers (§7) vs Vercel | **Não instalar Redis agora.** Tabela `Job` no Postgres + `SELECT FOR UPDATE SKIP LOCKED` + Vercel Cron | §83 do próprio doc: monolito modular primeiro. Um serviço a menos pra operar sozinho |

---

## 9. O plano por sprints

### Sprint 0 — Discovery técnico *(paralelo, não bloqueia o código)*

Tarefa do **Davi**, não do código:

- Criar conta no TikTok Shop Partner Center
- Confirmar: Brasil é mercado suportado? Quais scopes o app consegue pedir?
- Preencher a Capability Matrix da §81

### Sprint 1 — Fundação *(zero dependência externa)*

- Schema novo: Identity (`User`, `Profile`, `CreatorProfile`, `SellerProfile`,
  `ExternalAccount`) + Commerce core
- Webhook do Clerk → sync de `User` no banco
- Escolha de papel no onboarding (§5)
- Profile switcher (creator ↔ seller na mesma conta)
- Camada de acesso escopada por profile

### Sprint 2 — Seller manual

- CRUD de `Product`
- `ProductEconomics`
- **Calculadora de comissão recomendada** (§43) — matemática pura, já é valor
  entregue no dia 1

### Sprint 3 — Creator

- `CreatorProfile` completo
- Product discovery sobre produtos reais
- Fluxo de `Affiliation` (pedir → aceitar)

### Sprint 4 — Matching v1

- Baseado em regras
- Breakdown explicável (§23)
- `confidence` visível na UI

### Sprint 5 — Ingestão

- Integration Layer
- **Adapter CSV**
- Normalizer + eventos
- TikTok entra aqui, quando (e se) liberar

---

## 10. Pendências e questões em aberto

- [ ] **Bloqueia o Sprint 1:** tem dado no Neon que não pode ser perdido? O schema novo
      substitui o atual, e `prisma db push` derruba as tabelas existentes
- [ ] O dashboard atual é protótipo descartável, ou já foi mostrado/prometido a alguém?
- [ ] Sprint 0: Brasil é mercado suportado pela TikTok Shop API?
- [ ] Sprint 0: quais scopes o app consegue pedir?
- [ ] Definir a janela de atribuição em dias (sugestão inicial: 7)
- [ ] Decidir se `prototype.md` (escopo enxuto, contraditório com o Growth OS) é
      arquivado ou deletado

---

## Anexo — arquivos de referência no repo

| Arquivo | O que é |
|---|---|
| `Creator Commerce Platform — Arquitetura Completa.md` | A visão completa, 90 seções. Fonte da verdade sobre **o que** construir |
| `DECISOES-E-PLANO.md` | Este arquivo. Fonte da verdade sobre **como e em que ordem** |
| `prototype.md` | Escopo antigo e enxuto, contraditório com o Growth OS. Decisão de 11/08/2026 foi pelo Growth OS |
| `architeture.md` | Deletado (aparece como `D` no git status) |
