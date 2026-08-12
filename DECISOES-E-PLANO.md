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

São **três superfícies de OAuth diferentes** no TikTok:

| Superfície | O que dá | Do quê |
|---|---|---|
| **Lado seller** — TikTok Shop Partner Center | pedidos, produtos, creators | da loja daquele cliente |
| **Lado creator** — TikTok for Developers / Login Kit | vídeos, views, engajamento, audiência | da conta do próprio creator, com consentimento dele |
| **Affiliate Creator API** — TikTok Shop | colaborações, showcase, **conversão** | da conta do próprio creator, com consentimento dele |

> **Correção de 11/08/2026:** este documento listava só as duas primeiras. A
> terceira existe, e é justamente a que dá **dado comercial do creator sem
> depender de loja nenhuma**. Ver `SPRINT-0-TIKTOK.md` §3 — o furo do cold start
> é menor do que a §3.3 assumia. Disponibilidade em BR ainda a validar.

O histórico de GMV **global** de um creator continua não existindo em API nenhuma
— isso segue verdade. Mas a busca de creators do lado seller retorna GMV, e a
Affiliate Creator API retorna a conversão do próprio creator. Existe sinal
comercial no dia 1; o que não existe é o grafo completo do ecossistema.

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

### Sprint 0 — Discovery técnico *(paralelo, não bloqueia o código)* — **pesquisa feita, falta a conta**

Levantamento completo em **`SPRINT-0-TIKTOK.md`**. Resumo:

- ✅ Brasil **é** mercado suportado (19 países, BR incluído, com página de doc própria)
- ✅ Scopes do Login Kit levantados — e nenhum deles dá GMV ou venda
- ⚠️ **Existem três superfícies de OAuth, não duas** — ver a correção da §6 abaixo
- 🔴 **Antes de criar o app:** a *business region* só pode ser definida **uma vez**,
  e existem dois portais separados (o `.us.` e o global). Errar custa conta nova
- ⬜ Restam **6 perguntas** que só se responde logado no Partner Center

Tarefa do **Davi**: o checklist operacional está na §5 do `SPRINT-0-TIKTOK.md`.

### Sprint 1 — Fundação *(zero dependência externa)* — **código escrito, falta aplicar o schema**

| Item | Estado | Onde |
|---|---|---|
| Schema novo: Identity + Commerce core | escrito, **não aplicado no Neon** | `prisma/schema.prisma` |
| Webhook do Clerk → sync de `User` | pronto | `src/app/api/webhooks/clerk/route.ts` |
| Escolha de papel no onboarding (§5) | pronto | `src/app/onboarding/` |
| Profile switcher (creator ↔ seller) | pronto | `src/components/layout/profile-switcher.tsx` |
| Camada de acesso escopada por profile | pronta | `src/lib/scoped-db.ts` |
| Ponte sessão Clerk → Profile | pronta | `src/lib/session.ts` |

Decisões tomadas na implementação, além do que estava escrito aqui:

- **Dinheiro é `Decimal`, nunca `Float`.** O schema antigo usava `Float`; para
  registro de comissão isso vira divergência de centavos com o creator
- **`ProfileMetric`**, série append-only de métrica com `source` + `confidence` +
  período — a §6 deste documento virada em tabela, e não em coluna espalhada
- **`ensureUser()`** cria o usuário no primeiro acesso se o webhook não tiver
  chegado. Sem isso, dev sem túnel público loga no Clerk e cai num app que não
  sabe quem ele é. O webhook passa a ser consistência, não pré-requisito
- **A casca do dashboard segue viva sobre mock** (`src/lib/data.ts` virou stub).
  Cada página migra para o domínio real no sprint que a cobre

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

- [x] ~~**Bloqueia o Sprint 1:** tem dado no Neon que não pode ser perdido?~~
      **Resolvido (11/08/2026):** não. Contagem no Neon: `User` 0, `ProductAnalysis` 0,
      `Favorite` 0, `ActivityLog` 0, `SalesPage` 0 — e 16 linhas de seed
      (`Product` 6, `TopSeller` 6, `MarketSignal` 4) que `prisma db seed` regenera.
      Zero dado de usuário. O `db push` está liberado
- [ ] Rodar o `db push` do schema novo (o Prisma exige consentimento explícito
      para o comando destrutivo — ver o final da seção)
- [ ] O dashboard atual é protótipo descartável, ou já foi mostrado/prometido a alguém?
- [x] ~~Sprint 0: Brasil é mercado suportado pela TikTok Shop API?~~
      **Sim** — 19 mercados, BR entre eles. Mas *acesso e scopes variam por
      mercado*, então a pergunta útil virou "o BR tem **estes** scopes"
- [x] ~~Sprint 0: quais scopes o app consegue pedir?~~
      Os do Login Kit estão levantados (`SPRINT-0-TIKTOK.md` §4). Os do Shop
      dependem do Partner Center — é a pergunta 3 das 6 que restam
- [ ] **Sprint 0, decisão irreversível:** confirmar CNPJ e target market **antes**
      de criar o app — a *business region* não tem edição depois
- [ ] Sprint 0: as 6 perguntas do `SPRINT-0-TIKTOK.md` §6
- [ ] Definir a janela de atribuição em dias (sugestão inicial: 7)
- [ ] Decidir se `prototype.md` (escopo enxuto, contraditório com o Growth OS) é
      arquivado ou deletado

---

## Anexo — arquivos de referência no repo

| Arquivo | O que é |
|---|---|
| `Creator Commerce Platform — Arquitetura Completa.md` | A visão completa, 90 seções. Fonte da verdade sobre **o que** construir |
| `DECISOES-E-PLANO.md` | Este arquivo. Fonte da verdade sobre **como e em que ordem** |
| `SPRINT-0-TIKTOK.md` | Discovery técnico do TikTok: Capability Matrix (§81), scopes levantados, a escolha irreversível do Partner Center e as 6 perguntas que faltam |
| `prototype.md` | Escopo antigo e enxuto, contraditório com o Growth OS. Decisão de 11/08/2026 foi pelo Growth OS |
| `architeture.md` | Deletado (aparece como `D` no git status) |



Fiz a parte que dá pra fazer sem a conta, que era mais do que parecia. Está em SPRINT-0-TIKTOK.md, com as fontes linkadas.

Antes de qualquer coisa: para e lê isto

Na criação do app, a business region só pode ser definida uma vez. Não tem edição depois. E existem dois portais separados: partner.us.tiktokshop.com (empresas americanas, lojas dos EUA) e partner.tiktokshop.com (todo o resto — o seu).

Entrar pelo portal errado, ou marcar a região errada, custa conta nova. Como esse é o único passo do Sprint 0 que é irreversível, ele virou a seção 1 do documento em vez de um detalhe no meio.

Duas respostas que você já tem

Brasil é mercado suportado. 19 países, BR entre eles, com página de documentação própria no Partner Center. Mas a pergunta útil mudou: as famílias de endpoint são iguais em todo mercado — o que varia por mercado é acesso e scopes. Então não é "o Brasil tem a API", é "o Brasil tem estes scopes".

Os scopes do Login Kit estão levantados, com a tabela completa. E o dado mais informativo é o que não está nela: nenhum scope do Login Kit dá GMV, venda ou comissão. Isso confirma a separação que você já tinha desenhado — Login Kit é audiência, não comércio.

O que eu achei e contradiz o plano

O DECISOES-E-PLANO.md §6 diz que existem duas superfícies de OAuth. São três. Existe uma Affiliate Creator API, separada do Login Kit, em que o creator autoriza e você recebe as colaborações e a conversão dele.

Isso mexe na §3.3, que você chamou de "o furo mais grave". A premissa central continua de pé — o GMV global histórico de um creator não existe em API nenhuma. Mas duas coisas atenuam o furo:

1. A busca de creators do lado seller retorna GMV, keyword e demografia — sinal comercial de creators que nunca venderam pra você.
2. A Affiliate Creator API dá dado comercial de primeira mão, com consentimento, sem depender de loja nenhuma.

O matching no dia 1 pode ser melhor do que o plano assumia. O desenho de source + confidence continua necessário — é ele que deixa misturar fontes de qualidade desigual sem mentir na UI —, e nenhuma linha do schema muda: CONNECTED cobre o OAuth do creator, INFERRED cobre o sinal da busca do lado seller.

Já corrigi a §6 e as pendências do plano, com a data e o motivo.

O limite desta pesquisa

A doc detalhada do Partner Center (/docv2) é renderizada por JavaScript e exige login — tentei por vários caminhos e só volta a casca da página. Por isso o documento marca cada item da Capability Matrix como ✅ confirmado, ⚠️ existe mas falta detalhe, ou ❓ sem informação pública, em vez de fingir precisão que eu não tenho.

Sobraram 6 perguntas que só se responde logado. Elas estão na §6 do documento, já escritas para você copiar e ir respondendo — e a §7 diz o que cada resposta possível muda no código, para a ida ao Partner Center já sair com decisão, não só com informação.

Nada disso bloqueia os Sprints 2 e 3. Quando você criar a conta, me traz as respostas que eu fecho a matriz.

✻ Cooked for 6m 32s

※ recap: Estamos construindo a Creator Commerce Platform: o Sprint 1 já está aplicado no Neon e buildando, e o Sprint 0 do TikTok está pesquisado em SPRINT-0-TIKTOK.md. Próximo passo: você criar a conta no Partner Center global, com target market BR. (disable recaps in /config)
