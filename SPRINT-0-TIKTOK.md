# Sprint 0 — Discovery Técnico do TikTok

> Levantado em 11/08/2026 a partir de fontes públicas.
> Complementa o `DECISOES-E-PLANO.md` §9 (Sprint 0) e fecha a Capability Matrix
> da §81 do doc de arquitetura.
>
> **Limite desta pesquisa:** a documentação detalhada do TikTok Shop
> (`partner.tiktokshop.com/docv2`) é renderizada por JavaScript e exige login no
> Partner Center. Nada aqui substitui abrir a conta — mas quase tudo que dava
> para saber sem ela já está abaixo, inclusive as perguntas exatas a responder
> lá dentro.

---

## 1. ⚠️ Antes de criar o app: uma escolha que não tem volta

Na criação do app no Partner Center você define **business region**, e essa
escolha **só pode ser feita uma vez**. Não há edição depois.

Junto dela vêm o **target market** e a **business category**.

E existem **dois portais separados**:

| Portal | Para quem |
|---|---|
| `partner.us.tiktokshop.com` | empresas registradas nos EUA, mirando lojas dos EUA |
| `partner.tiktokshop.com` | **todos os outros mercados — é o seu** |

> **Consequência prática:** entrar pelo portal errado, ou marcar a região errada
> no primeiro app, custa uma conta nova. Antes de clicar, decida:
> a Sova atende **lojas brasileiras** (target market BR, portal global).

Isso é o item mais caro do Sprint 0 e é o único que nenhuma pesquisa resolve por
você — porque depende do CNPJ que vai no cadastro.

---

## 2. O que está confirmado

**Brasil é mercado suportado pelo TikTok Shop.** O Seller Center opera em 19
países, e o Brasil está na lista (junto de EUA, México, 9 mercados europeus e 7
asiáticos). Existe inclusive uma página de documentação específica para o
mercado BR no Partner Center.

**Existem duas APIs de afiliado, não uma.** Essa distinção é a mais importante
que a pesquisa trouxe, e ela **corrige a §6 do `DECISOES-E-PLANO.md`**:

| API | Quem autoriza | O que expõe |
|---|---|---|
| **Affiliate Seller API** | o seller | campanhas abertas e direcionadas, busca de creators, links de promoção, pedidos de afiliado |
| **Affiliate Creator API** | **o creator** | as colaborações dele, o showcase de produtos, e o rastreio de conversão do esforço dele |

A §6 do plano listava só duas superfícies de OAuth (Shop Partner Center do lado
seller, Login Kit do lado creator). **São três.** A Affiliate Creator API é uma
terceira superfície, e é justamente a que faltava.

**Busca de creators existe do lado seller.** A API permite procurar creators por
**GMV, palavra-chave e dados demográficos** — e o Affiliate Center mostra
performance de creator dos últimos 90 dias, filtrável por GMV, categoria e
seguidores.

**As famílias de endpoint são as mesmas em todo mercado** (Products, Orders,
Logistics, Finance) — mas **acesso, scopes e disponibilidade variam por mercado**.
É por isso que "o Brasil tem TikTok Shop" não responde a pergunta; a pergunta é
"o Brasil tem *estes scopes*".

**Autorização é por loja.** O par `access_token` + `shop_cipher` é o que
identifica a loja autorizada — confirmando o que o plano já dizia: o token é da
loja do seu cliente.

---

## 3. Isto muda o furo do cold start (§3.3 do plano)

O plano dizia, e a lógica estava certa:

> "O histórico de GMV **global** de um creator não existe em API nenhuma."

Isso continua verdade — **mas a conclusão prática muda**, por dois motivos:

1. **A busca de creators do lado seller retorna GMV.** Não é o histórico completo
   e não é um grafo do ecossistema, mas é sinal comercial de creators que nunca
   venderam para você. Não é `categoria = categoria`.
2. **A Affiliate Creator API existe.** Quando o creator conecta a conta dele, você
   ganha as colaborações e a conversão **dele** — dado comercial de primeira mão,
   com consentimento, sem depender de nenhuma loja.

O desenho da §6 (toda métrica carrega `source` + `confidence`) continua **certo e
necessário** — ele é o que permite misturar essas fontes de qualidade desigual
sem mentir na UI. O que muda é o teto: o matching no dia 1 pode ser melhor do que
o plano assumia.

**O que NÃO muda:** o `MetricSource` do schema já cobre isso. `CONNECTED` para o
que vem do OAuth do creator, `INFERRED` para o que vem da busca do lado seller
(é sinal de terceiro, não medição sua). Nenhuma linha de schema precisa mudar.

---

## 4. Capability Matrix (§81) — estado atual

Legenda: ✅ confirmado · ⚠️ existe, detalhe a validar logado · ❓ sem informação pública

| Dado | TikTok fornece? | Via | Webhook | Inferência nossa |
|---|---|---|---|---|
| Produto | ✅ | Product API (seller) | ⚠️ | Não |
| Estoque | ✅ | Product/Inventory API | ⚠️ real-time citado | Não |
| Pedido | ✅ | Order API (`shop_cipher`) | ⚠️ eventos a listar | Não |
| Creator (busca/descoberta) | ✅ | Affiliate Seller API — por GMV, keyword, demografia | ❓ | Parcial |
| Creator (dados próprios) | ⚠️ | **Affiliate Creator API** — OAuth do creator | ❓ | Parcial |
| Comissão | ⚠️ | Finance API + pedidos de afiliado | ❓ | Não |
| Conteúdo (vídeos) | ✅ | Login Kit — `video.list` | ❓ | Parcial |
| Perfil/audiência do creator | ✅ | Login Kit — `user.info.stats` | ❓ | Parcial |
| GMV por creator | ⚠️ | busca do lado seller; 90 dias no Affiliate Center | ❓ | Parcial |
| GMV global histórico | ❌ | **não existe em API** | ❌ | Sim (INFERRED) |
| Performance / conversão | ⚠️ | Affiliate Creator API (conversão do creator) | ❓ | Sim |
| Matching | — | **nosso** | — | Sim |

### Scopes do Login Kit — confirmados e públicos

Estes são os únicos que consegui verificar em documentação aberta:

| Scope | O que dá | Aprovação especial |
|---|---|---|
| `user.info.basic` | open id, avatar, display name | não (vem por padrão) |
| `user.info.profile` | link do perfil, bio, status de verificação | não |
| `user.info.stats` | **likes, seguidores, seguindo, nº de vídeos** | não |
| `video.list` | vídeos públicos do usuário | não |
| `video.publish` | publicar direto no perfil | não |
| `research.data.basic` | dados públicos para pesquisa | **sim** |

> Note o que **não** está aqui: nenhum scope do Login Kit dá GMV, venda ou
> comissão. Confirma a separação do plano — Login Kit é audiência, não comércio.
> Dado comercial do creator vem da Affiliate Creator API, que é outra porta.

---

## 5. O que só você pode fazer

> **O passo a passo clicável está em `SPRINT-0-ROTEIRO.md`** (12/08/2026), com
> os campos exatos a preencher, o que ter em mãos antes de começar, e um bloco
> de respostas pronto pra preencher. Abaixo fica o resumo.

Ordem importa — cada passo destrava o próximo.

- [ ] **1. Decidir o CNPJ e o mercado-alvo do app.** É a escolha irreversível da
      seção 1. Para a Sova: target market **BR**, portal **global**
      (`partner.tiktokshop.com`, *não* o `.us.`)
- [ ] **2. Criar a conta no Partner Center** com esse CNPJ
- [ ] **3. Registrar o app** como *Affiliate app developer* (é o tipo de app que
      destrava as APIs de afiliado — não o de seller genérico). Na criação há
      ainda a escolha **Custom App × Public App** — comece em *Custom*, que
      converte pra *Public* depois e não entra em fila de review agora
- [ ] **4. Criar uma Development Shop.** O Partner Center oferece lojas de teste;
      é como validar o fluxo sem depender de um cliente real
- [ ] **5. Responder as 6 perguntas da seção 6 abaixo** e voltar aqui para
      preencher a matriz

---

## 6. As perguntas a responder logado no Partner Center

São estas que fecham o Sprint 0. Todas as outras já estão respondidas acima.

0. **(nova, 12/08/2026) O Brasil está no programa de afiliados?**
   Fontes públicas listam o *Affiliate Partner program* (TAP) como disponível em
   Indonésia, Malásia, Filipinas, Tailândia, Vietnã e Reino Unido — **sem o
   Brasil**. Pode ser que o programa de parceiros seja outra coisa que as APIs
   de afiliado. Mas se andarem juntos, isso derruba a premissa do Sprint 4 e
   promove o adapter CSV (Sprint 5) a caminho principal. É a primeira coisa a
   checar depois de criar o app.
1. **A Affiliate Seller API está disponível para o mercado BR?**
   Especificamente a busca de creators — é o que alimenta o Seller Creator
   Discovery (§44 da arquitetura).
2. **A Affiliate Creator API está disponível para BR?**
   É a terceira superfície de OAuth. Se sim, o cold start do matching muda de
   patamar e vale reordenar o Sprint 4.
3. **Quais scopes exatos o app consegue pedir, e quais exigem aprovação?**
   A lista varia por mercado. Anotar quais saem na hora e quais entram em fila.
4. **Quais eventos de webhook existem, e quais valem para BR?**
   Pergunta específica: existe webhook de pedido? Sem ele, o §61 vira polling —
   e polling muda o desenho do `Job` que já está no schema.
5. **Qual o rate limit por app e por loja?**
   Define se o sync de produtos cabe num cron da Vercel ou precisa de fila
   dedicada.
6. **Qual o requisito de aprovação e o prazo típico?**
   É o que diz se o adapter de CSV é ponte de 2 semanas ou de 6 meses — e
   portanto quanto investir nele.

---

## 7. O que cada resposta muda no código

Nenhuma delas bloqueia o Sprint 1 (já entregue) nem os Sprints 2 e 3 — eles não
dependem do TikTok. O impacto começa no Sprint 4.

| Se a resposta for… | Muda o quê |
|---|---|
| Affiliate Creator API disponível em BR | Matching v1 (Sprint 4) ganha sinal `CONNECTED` real. Antecipar o OAuth do creator |
| Só Affiliate Seller API em BR | Matching v1 fica em `DECLARED` + `INFERRED`. A UI de confiança da §6 vira essencial, não enfeite |
| Sem webhook de pedido | `Job` + Vercel Cron viram o caminho principal de ingestão, não o secundário |
| Aprovação longa (> 2 meses) | Adapter CSV (Sprint 5) sobe de prioridade e provavelmente antecede o Sprint 4 |
| Nada liberado para BR | O produto sobrevive: 9 dos 13 itens do P0 não dependem da fonte (§5 do plano) |

---

## Fontes

- [TikTok Shop Partner Center](https://partner.tiktokshop.com/) — portal global
- [TikTok Shop Partner Center — US](https://partner.us.tiktokshop.com/) — portal separado dos EUA
- [Build with Us: TikTok Shop Opens Affiliate Ecosystem to Developers](https://developers.tiktok.com/blog/2024-tiktok-shop-affiliate-apis-launch-developer-opportunity) — capacidades das APIs de afiliado
- [Affiliate Seller API overview](https://partner.tiktokshop.com/docv2/page/affiliate-seller-api-overview)
- [BR market — Partner Center](https://partner.tiktokshop.com/docv2/page/67ca5b6c49162f049f2d1fa6)
- [TikTok API Scopes Reference](https://developers.tiktok.com/doc/tiktok-api-scopes) — tabela de scopes do Login Kit
- [Scopes Overview](https://developers.tiktok.com/doc/scopes-overview)
- [TikTok Shop Available Countries in 2026](https://dpl.company/countries-with-access-to-tiktok-shop-seller-center/)
- [How to connect TikTok Shop to API2Cart](https://api2cart.com/how-to-connect-tiktok-shop-to-api2cart/) — dois portais, região definida uma única vez
- [TikTok Shop API: Complete Integration Guide for Sellers](https://www.keyapi.ai/blog/tiktok-shop-api-integration-guide-sellers/) — `access_token` + `shop_cipher`
- [Manage Creators — TikTok Seller University](https://seller-us.tiktok.com/university/essay?knowledge_id=3352441858344747&lang=en) — performance de creator, 90 dias
