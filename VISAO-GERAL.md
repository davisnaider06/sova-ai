# Sova — Visão geral

> Escrito em 08/09/2026, conferido linha a linha contra o código deste
> repositório (último commit: `09f1bb0`, 20/08/2026).
>
> É o documento de entrada: **o que a Sova é, pra quem, como funciona e por que
> ela ganha**. Os outros dizem o que construir (`Creator Commerce Platform —
> Arquitetura Completa.md`), em que ordem (`DECISOES-E-PLANO.md`), o que falar
> pra fora (`POSICIONAMENTO.md`) e como destravar o TikTok
> (`SPRINT-0-TIKTOK.md`).
>
> Onde este documento e os outros divergirem, **este é o mais recente** — os
> demais foram escritos entre 11 e 19/08 e não sabem o que veio depois.

---

## Índice

1. [O que é](#1-o-que-é)
2. [Pra quem é](#2-pra-quem-é)
3. [Quem paga](#3-quem-paga)
4. [As oito funcionalidades](#4-as-oito-funcionalidades)
5. [Como funciona na prática](#5-como-funciona-na-prática)
6. [Como funciona por dentro](#6-como-funciona-por-dentro)
7. [Assinatura e acesso](#7-assinatura-e-acesso)
8. [Vantagens de mercado](#8-vantagens-de-mercado)
9. [O que a Sova não é](#9-o-que-a-sova-não-é)
10. [Estado real do produto](#10-estado-real-do-produto)
11. [Fragilidades e riscos](#11-fragilidades-e-riscos)
12. [Próximos passos](#12-próximos-passos)
13. [Mapa de documentos](#13-mapa-de-documentos)

---

## 1. O que é

**Gestão de afiliados para TikTok Shop.**

Um SaaS de dois lados que **não vende nada**. Quem vende é a loja, dentro do
TikTok Shop. A Sova acha o creator, organiza a afiliação e mede quem gerou qual
venda.

A tese, em uma frase:

> ### Creators que vendem, não seguidores.

Um creator de 25 mil seguidores com R$120 mil de GMV em suplementos vale mais,
para uma loja de suplementos, que um de 50 mil sem histórico nenhum. Toda a
plataforma é essa frase virada em produto: a métrica que organiza tudo é
**venda**, não alcance.

---

## 2. Pra quem é

### A loja (seller)

Quem já vende no TikTok Shop e hoje:

- escolhe creator por número de seguidor, porque é o único número visível;
- chuta a comissão — normalmente 20%, porque foi o que alguém disse — sem saber
  se sobra margem;
- controla afiliado em planilha e WhatsApp;
- não consegue provar qual venda veio de qual creator, e discute isso no fim do
  mês;
- ou paga R$3.000 para uma agência fazer essa ponte na mão.

### O creator

Quem promove produto por afiliação e hoje:

- manda DM para marca e espera resposta;
- aceita parceria sem saber quanto vai ganhar por vídeo;
- descobre que o produto paga R$3 de comissão **depois** de gravar;
- não tem como provar o próprio histórico de venda na hora de pedir comissão
  maior — só print.

### Quem **não** é o público

Loja fora do TikTok Shop, creator que vive de publi por cachê fixo, e quem
procura ferramenta de pesquisa de produto. São outros produtos.

---

## 3. Quem paga

**Os dois lados pagam, e pagam igual.** Não é o modelo clássico de marketplace,
em que um lado é grátis para formar oferta.

| Plano | Preço | Equivalente mensal |
|---|---|---|
| Mensal | R$ 147 | R$ 147 |
| Trimestral | R$ 297 | R$ 99 |
| Anual | R$ 597 | R$ 49,75 |

Os três **não são produtos diferentes** — é o mesmo acesso com períodos de
cobrança diferentes. Por isso a lista de benefícios aparece uma vez só, abaixo
dos três cartões, em vez de repetida três vezes.

Cada lado recebe as mesmas quatro categorias de valor, do ponto de vista dele:

| | Creator | Loja |
|---|---|---|
| **Descoberta** | as lojas te acham | creator com histórico de venda |
| **Dinheiro** | quanto você vai ganhar | comissão que não come a margem |
| **Gestão** | suas parcerias num lugar | seus afiliados num painel |
| **Prova** | seu histórico verificado | quem vendeu o quê |

Cobrança pela **Hubla**, fora da plataforma. Detalhe em §7.

---

## 4. As oito funcionalidades

### Lado creator

**1. As lojas te acham.** Você conecta o TikTok e vira visível para quem procura
creator na sua categoria. Para de mandar DM.

**2. Produtos que combinam com seu público.** Não é a lista de mais vendidos — é
o que vende **para quem te assiste**.

**3. Quanto você vai ganhar, antes de gravar.** Comissão × preço × sua conversão.
Você descobre que o produto paga R$3 antes de queimar um vídeo nele.

**4. Seu histórico como carta de negociação.** "Já gerei R$120k em suplementos",
com número verificado, não printado.

> **Âncora de venda:** a **#1**. O creator assina para parar de correr atrás de
> marca. As outras três seguram ele depois.

### Lado loja

**1. Creator com histórico de venda, não de seguidor.** Filtra por quem já vendeu
na sua categoria.

**2. Comissão que não come sua margem.** Custo, frete, taxa, preço → até quanto
dá para pagar e ainda lucrar.

**3. Todos os afiliados num painel.** Quem pediu, quem você aceitou, quem está
ativo, quem sumiu.

**4. Quem vendeu o quê.** Venda por creator, comissão devida, o que funcionou.

> **Âncora de venda:** a **#2**. A loja assina para parar de perder dinheiro —
> dor imediata, entendida em 10 segundos, resultado em reais.

### Estado de cada uma

As oito **têm tela funcionando**. O que separa uma da outra não é o código, é o
abastecimento de dado:

| Funcionalidade | Depende de fonte externa? |
|---|---|
| Loja #2 — calculadora de comissão | não, é matemática |
| Loja #3 — painel de afiliados | não |
| Loja #4 — quem vendeu o quê | funciona sobre pedidos importados por CSV |
| Creator #2 — produtos que combinam | roda sobre o catálogo que existir |
| Creator #3 — quanto vou ganhar | não, é matemática |
| Creator #1 — as lojas te acham | melhora muito com o TikTok conectado |
| Loja #1 — creator com histórico | **sim** — hoje só o histórico dentro da Sova |
| Creator #4 — histórico verificado | **sim** — idem |

> **Consequência para o go-to-market:** a loja é vendável antes do creator. A
> âncora da loja (calculadora) não depende de nada externo; a âncora do creator
> (ser encontrado) depende de massa crítica do outro lado.

---

## 5. Como funciona na prática

### O fluxo do seller

1. **Cadastra o produto** com preço, custo, frete e taxa da plataforma.
2. **A calculadora devolve a escada inteira** de cenários de comissão — ponto de
   equilíbrio, teto da margem mínima e lucro em cada faixa. Não um número solto:
   mostrar "pague 18%" esconde a decisão; mostrar a escada devolve a decisão para
   quem tem que tomá-la.
3. **Cria campanha** e vincula produtos. Campanha é iniciativa comercial —
   diferente de afiliação, que é o vínculo "este creator pode promover este
   produto". Um creator pode descobrir um produto sozinho, sem campanha nenhuma.
4. **Recebe pedidos de afiliação num inbox** e aprova, recusa ou pausa.
5. **Busca creators** por categoria, com score de compatibilidade.
6. **Importa os pedidos por CSV** (todo seller consegue exportar do painel do
   TikTok Shop) e vê venda por creator e comissão devida.

### O fluxo do creator

1. **Declara nicho, bio e audiência** no onboarding.
2. **Conecta a conta do TikTok** (Login Kit + Display API). Isso muda o peso das
   métricas: seguidores declarados valem confiança 0,30; conectados valem 0,80.
3. **Descobre produtos pontuados** por compatibilidade, com o motivo escrito.
4. **Pede afiliação**; quando aprovada, o produto entra em "minhas afiliações".
5. **Gera roteiro de vídeo com IA** a partir do produto real, da comissão real e
   dos nichos dele.
6. **Registra o conteúdo publicado** — é o que alimenta a atribuição.
7. **Acompanha o extrato de comissões.**

### A atribuição

Creator postou dia 1, venda entrou dia 20 — comissão de quem? A Sova responde com
uma **janela explícita** e grava a decisão (`attributedAffiliationId`,
`attributedAt`, `attributionWindowDays`). Nunca recalcula na leitura, senão o
número muda toda vez que alguém abre a tela.

Empate sem sinal fica **sem atribuição, de propósito**: escolher um seria sortear
a comissão de alguém.

### O matching

Score por regras com **breakdown por componente** — nicho, histórico, alcance,
engajamento, oferta — cada um com o motivo em português. Três detalhes que
importam:

- **Pesos renormalizados** sobre os componentes disponíveis: quem não tem
  histórico não leva zero, é avaliado sem ele.
- **Confiança derivada da procedência** dos sinais, exibida na interface.
- **Amortecimento por cobertura de evidência.** Só renormalizar não bastava: um
  creator de 1.800 seguidores sem histórico tirava 89 contra 91 de um de 128 mil
  com oito vendas, porque conta pequena tem engajamento alto e dois sinais
  favoráveis empatavam com cinco sinais fortes. Com o amortecimento, o mesmo par
  marca **91 × 79**. Está travado em teste.

---

## 6. Como funciona por dentro

### Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Banco | Postgres no Neon, Prisma 7 (adapter Neon) |
| Auth | Clerk (no Next 16 o `middleware.ts` virou `proxy.ts`) |
| IA | Anthropic (Claude) |
| Pagamento | Hubla, por webhook |
| Deploy | Vercel, região `gru1`, com PWA |
| Fila | tabela `Job` no próprio Postgres + Vercel Cron |

Sem Redis e sem serviço extra enquanto o volume não justificar. A fila usa
`SELECT FOR UPDATE SKIP LOCKED` com backoff exponencial e liberação de jobs
presos em `RUNNING` — que é o pior estado possível, porque não falha nem
completa.

### Os princípios que mantêm o produto honesto

Não são detalhe de implementação. São o que impede a plataforma de mentir:

- **Toda métrica carrega procedência.** `DECLARED` (o usuário digitou),
  `CONNECTED` (veio do OAuth dele), `PLATFORM` (aconteceu dentro da Sova),
  `INFERRED` (calculado). Cada uma com `source`, `confidence` e período.
- **Atribuição é decisão gravada, não calculada na leitura.**
- **Afiliação ≠ campanha.** Duas entidades, não uma com flag.
- **Registro financeiro é imutável:** a comissão congela a taxa no momento da
  criação. Se o seller mudar a comissão amanhã, a venda de ontem não muda junto.
- **Dinheiro é `Decimal`, nunca `Float`.** Com `Float`, registro de comissão vira
  divergência de centavos com o creator.
- **Nenhuma tela inventa número.** Sem chave de IA configurada, a tela diz que
  está sem chave — em vez de mostrar um roteiro de exemplo que o creator
  publicaria achando que a IA escreveu.
- **Multi-tenant por camada de acesso escopada** (`forProfile(id).products…`).
  Nenhum código de feature toca o Prisma cru. Segurança que depende de "lembrar
  de filtrar" falha; o certo é tornar o erro impossível de escrever.
- **`ExternalAccount` separado do `Profile`.** O perfil interno existe
  independente da conta externa — é o que impede a plataforma de virar refém do
  TikTok.
- **Idempotência por identificador externo.** Webhook duplicado é regra, não
  exceção.

### A camada de integração

```
                  ┌──────────────┐
   CSV Upload ───►│              │
                  │  Integration │──► Normalizer ──► Domain ──► Events
   TikTok API ───►│    Layer     │
   (depois)       └──────────────┘
```

O primeiro adapter é **CSV, não TikTok**. Isso valida o desenho hoje, com dado
real, e permite ter cliente antes de qualquer aprovação. Quando a API do TikTok
Shop liberar, entra como segundo adapter — o domínio não muda uma linha. Se nunca
liberar para o Brasil, ainda existe produto.

---

## 7. Assinatura e acesso

**A pessoa paga antes de a conta existir.** O checkout é da Hubla, fora; o
cadastro é do Clerk, dentro. Dois sistemas que não se conhecem.

O que amarra as pontas é o **e-mail**. A assinatura nasce no banco com `userId`
nulo e ganha dono quando alguém se cadastra com aquele e-mail. Chavear por
`userId` seria impossível — no momento do pagamento ele não existe.

A regra de acesso mora inteira em um lugar, porque "quem pode ver isso" é a
pergunta mais cara de responder errado:

- **Admin passa sempre.** O dono não pode ficar trancado fora do próprio produto
  porque o gateway oscilou.
- **Sem assinatura** → cai em `/assinatura`.
- **Cancelada continua valendo até o fim do período pago.** Quem pagou o mês tem
  direito ao mês.

O webhook da Hubla **grava primeiro e processa depois** — o corpo inteiro vai
para `WebhookEvent` antes de qualquer lógica, então um evento com formato
inesperado não se perde. E **responde 200 mesmo sem entender o evento**, senão a
Hubla reentrega para sempre algo que nunca vai ser processado.

Existe painel de administração com liberação manual de acesso (cortesia, teste,
pagamento travado), registrada em audit log — dar acesso de graça é decisão que
alguém vai querer auditar depois.

---

## 8. Vantagens de mercado

**1. A métrica é venda, não seguidor.** É o que separa a Sova de plataforma de
influencer marketing, e o que mata a agência de R$3.000.

**2. Procedência exibida.** Concorrente mostra "94% de match". A Sova mostra de
onde saiu cada ponto e diz quando a confiança é baixa, em vez de fingir precisão.
Isso é o que permite misturar fontes de qualidade desigual sem mentir — e o que
permite auditar quando um match vier ruim.

**3. A ingestão não depende do TikTok.** O risco que mataria o projeto —
"o Brasil não tem a API de afiliado" — foi neutralizado por desenho, não por
esperança.

**4. Rigor no dinheiro.** `Decimal`, taxa congelada, atribuição gravada, empate
sem atribuição. É o que evita "essa venda foi minha" virar palavra contra
palavra — que é exatamente a dor que a loja tem hoje.

**5. Está em português, para o mercado brasileiro.** O TikTok Shop no Brasil tem
creator e loja se achando por DM e planilha, e a ferramenta que resolve isso não
existe em português.

**6. Duas âncoras de venda diferentes, e as duas são reais.** A loja assina pela
calculadora, que dá resultado em reais no dia 1 e não depende de nada externo. O
creator assina para ser encontrado.

**7. Ecossistema, não ferramenta solta.** A landing já posiciona conteúdo
gratuito, comunidade, SaaS, treinamento e casos de sucesso como um conjunto — o
SaaS é o núcleo pago, e o resto é aquisição e retenção em volta dele.

---

## 9. O que a Sova não é

Útil para não prometer errado, e para responder "mas isso não é igual a X?":

- **Não é loja nem checkout.** A venda acontece no TikTok Shop.
- **Não é plataforma de influencer marketing por seguidor.** A métrica é venda.
- **Não é agência.** Não tem gente no meio negociando.
- **Não é ferramenta de pesquisa de produto.** Foi o escopo antigo do
  repositório, descartado em 11/08/2026.

---

## 10. Estado real do produto

**Conferido contra o código em 08/09/2026.**

### O que existe e funciona

| Frente | Onde |
|---|---|
| Identidade, papéis, onboarding, troca creator ↔ seller | `src/lib/session.ts`, `app/onboarding/` |
| Camada de acesso escopada por profile | `src/lib/scoped-db.ts` |
| Produto, economia do produto, calculadora de comissão | `app/dashboard/produtos/`, `lib/pricing.ts` |
| Campanhas e vínculo de produtos | `app/dashboard/campanhas/` |
| Afiliação ponta a ponta (pedir → aprovar → pausar) | `app/dashboard/afiliacoes/`, `minhas-afiliacoes/` |
| Descoberta de produtos e busca de creators, com score | `app/dashboard/descobrir/`, `creators/`, `lib/matching.ts` |
| Registro de conteúdo e extrato de comissões | `app/dashboard/conteudo/`, `comissoes/` |
| Importação de pedidos por CSV + atribuição gravada | `lib/integration/`, `lib/attribution.ts` |
| Conexão com o TikTok (OAuth, tokens cifrados, sync) | `src/lib/tiktok/*`, `api/tiktok/callback/` |
| Assistente de conteúdo com IA (roteiro de vídeo) | `lib/ai/`, `app/dashboard/conteudo-ia/` |
| Assinatura, webhook da Hubla, portão de acesso | `lib/subscription.ts`, `api/webhooks/hubla/` |
| Painel de administração + liberação manual | `app/dashboard/admin/` |
| Fila de jobs + worker no Vercel Cron | `lib/jobs/`, `api/cron/jobs/` |
| Notificações | `lib/notifications.ts`, `api/notifications/` |
| Landing, Termos, Privacidade, PWA, tema claro/escuro | `app/page.tsx`, `app/(legal)/` |
| Seed de demonstração (apaga e recria, semente fixa) | `prisma/seed.ts` |

### O que ainda é protótipo

**Duas** telas, ambas com aviso explícito e ainda lendo `src/lib/mock-data.ts`:
`pagina-vendas` e `inteligencia-mercado`. Precisam de decisão: viram feature de
verdade ou saem do menu.

### O que está modelado mas não existe

**Vídeo com IA.** Há modelagem detalhada (render no navegador a custo zero,
narração por TTS, receita do vídeo guardada em vez do arquivo), mas **nenhuma
linha de código**: sem modelo no schema, sem rota, sem dependência de render.
A modelagem vive só no segundo cérebro, em `[[Sova - Video com IA]]`.

### O que está desligado

Nenhuma das chaves abaixo está preenchida no `.env.local`:

| Variável | O que fica desligado sem ela |
|---|---|
| `ANTHROPIC_API_KEY` | geração de roteiro por IA |
| `TIKTOK_CLIENT_KEY` / `_SECRET` / `_REDIRECT_URI` | conexão com o TikTok — **nunca rodou ponta a ponta** |
| `HUBLA_WEBHOOK_TOKEN` | liberação automática de acesso após o pagamento |
| `CLERK_WEBHOOK_SIGNING_SECRET` | sync de usuário (há fallback via `ensureUser()`) |
| `ADMIN_EMAILS` | bootstrap do primeiro admin |
| `CRON_SECRET` | worker da fila |

**O repositório está parado desde 20/08/2026.**

---

## 11. Fragilidades e riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Produto parado, sem cliente pagante | O objetivo declarado é receita, e o relógio corre | Vender o que já existe — a calculadora não depende de nada externo |
| Chaves de ambiente não configuradas | Metade do valor prometido está desligado | É configuração, não desenvolvimento: horas, não sprints |
| Histórico global do creator não existe em API nenhuma | A promessa "creator com histórico verificado" fica menor do que o banner sugere | Procedência + confiança exibidas; calibrar o texto do banner |
| *Affiliate Partner program* aparece em fontes públicas sem o Brasil | Se valer para as APIs, some a fonte principal do lado seller | O adapter CSV vira o caminho principal, não o alternativo |
| Escolha irreversível no Partner Center | A *business region* só pode ser definida uma vez, e há dois portais | Confirmar CNPJ e target market **antes** de criar a app |
| Custo de IA por vídeo maior que a mensalidade | Cliente custa mais do que paga | Render no navegador; engine pago atrás de crédito |
| Duas telas de protótipo no menu | Número de exemplo apresentado como real é exatamente o que os princípios proíbem | Já têm aviso; decidir destino |

---

## 12. Próximos passos

Em ordem de quanto destravam por hora gasta:

1. **Ligar as chaves de ambiente.** É a maior distância entre "está construído" e
   "está funcionando".
2. **Confirmar CNPJ e target market**, e só então criar a app no Partner Center
   global — a escolha não tem edição depois.
3. **Fechar as 6 perguntas do Sprint 0**, que só se responde logado.
4. **Decidir o destino de `pagina-vendas` e `inteligencia-mercado`.**
5. **Definir a janela de atribuição em dias** (sugestão inicial: 7).
6. **Vender para a primeira loja** com a calculadora como âncora.
7. Retomar (ou arquivar) a frente de vídeo com IA. Se retomar: pedir o escopo
   `video.upload` no primeiro dia, porque é fila de terceiro.
8. Upload de múltiplas imagens por produto — hoje só aceita link colado.

---

## 13. Mapa de documentos

| Arquivo | O que é |
|---|---|
| `VISAO-GERAL.md` | Este. O que a Sova é, pra quem, como funciona e o estado real |
| `Creator Commerce Platform — Arquitetura Completa.md` | A visão completa, 90 seções. **O que** construir |
| `DECISOES-E-PLANO.md` | **Em que ordem**, e o que estava furado na visão. Parou em 14/08 |
| `POSICIONAMENTO.md` | Descritor, frase e as 4+4 funcionalidades. Texto que vai pra fora |
| `TIKTOK-INTEGRACAO.md` | Conexão com a conta do creator: scopes, tokens, sync |
| `SPRINT-0-TIKTOK.md` | Discovery técnico do TikTok. **O que sabemos** |
| `SPRINT-0-ROTEIRO.md` | Passo a passo do Partner Center. **O que fazer** |
| `SAAS_TIKTOK_SHOP_CNPJ_OAUTH_IA.md` | Pesquisa: CNPJ, OAuth e camada de IA |
| `prototype.md` | Escopo antigo e enxuto. Descartado em 11/08/2026 |

No segundo cérebro, o mapa é `[[MOC Sova AI]]` e a nota-mãe é `[[Sova AI]]`.
