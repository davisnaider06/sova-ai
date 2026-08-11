# TikTok Shop Growth OS

## Product, Architecture & Engineering Specification

**Versão:** 1.0
**Data:** 10/08/2026
**Status:** Arquitetura inicial
**Público-alvo:** Sellers pequenos e médios da TikTok Shop, principalmente iniciantes e operações em crescimento.

---

# 1. VISÃO DO PRODUTO

O produto não deve ser tratado como um simples CRM, ERP, dashboard ou ferramenta de analytics.

O objetivo é construir um:

> **Growth OS para vendedores da TikTok Shop.**

O sistema deve acompanhar o vendedor desde o início da operação até uma operação significativamente maior.

A jornada principal é:

```text
ZERO
  ↓
PRIMEIRO PRODUTO
  ↓
PRIMEIRA OFERTA
  ↓
PRIMEIROS CREATORS
  ↓
PRIMEIRO CONTEÚDO
  ↓
PRIMEIRA VENDA
  ↓
R$10K/MÊS
  ↓
R$50K+/MÊS
```

O software deve ajudar o usuário a:

1. Descobrir o que vender
2. Validar produtos
3. Entender margem
4. Criar ofertas
5. Encontrar creators
6. Gerenciar creators
7. Criar campanhas
8. Acompanhar conteúdos
9. Acompanhar vendas
10. Entender quais ações funcionam
11. Identificar oportunidades
12. Decidir o próximo passo
13. Escalar aquilo que funciona

---

# 2. PRINCÍPIO FUNDAMENTAL DO PRODUTO

O produto não deve simplesmente registrar o que aconteceu.

Ele deve ajudar o usuário a responder:

> **"O que eu devo fazer agora para crescer minha operação?"**

Portanto, a arquitetura deve favorecer o seguinte ciclo:

```text
DATA
 ↓
INTELLIGENCE
 ↓
DECISION
 ↓
ACTION
 ↓
RESULT
 ↓
DATA
```

Exemplo:

```text
Creator publica conteúdo
        ↓
Conteúdo gera views
        ↓
Views geram cliques
        ↓
Cliques geram pedidos
        ↓
Pedido gera GMV
        ↓
Sistema identifica creator vencedor
        ↓
Sistema encontra creators semelhantes
        ↓
Usuário cria nova campanha
        ↓
Novos conteúdos
        ↓
Mais dados
```

Esse ciclo deve ser um dos fundamentos da arquitetura.

---

# 3. PÚBLICO-ALVO

## ICP inicial

O foco inicial não é enterprise.

O produto deve atender:

* vendedores iniciantes;
* vendedores pequenos;
* vendedores médios;
* pessoas começando do zero;
* operações que ainda faturam pouco;
* sellers que querem crescer através de creators e conteúdo.

A faixa inicial esperada é aproximadamente:

```text
R$0 → R$50.000+/mês
```

O produto deve ser simples para quem está começando, mas não deve ficar obsoleto quando o usuário crescer.

---

# 4. MODELO DE AQUISIÇÃO

O SaaS será distribuído principalmente através de:

```text
TikTok
   ↓
Lives
   ↓
Conteúdo
   ↓
Curso gratuito
   ↓
Mentoria gratuita
   ↓
Primeira operação
   ↓
SaaS
```

A estratégia não é simplesmente vender software.

A estratégia é:

> **ensinar o usuário a vender e utilizar o SaaS como ferramenta para executar o método.**

O curso/mentoria deve funcionar como uma camada de educação e onboarding.

Exemplo:

```text
Aula:
"Como encontrar um produto para vender"

        ↓

Usuário aprende o conceito

        ↓

SaaS:
"Descobrir Produto"

        ↓

Usuário executa dentro da plataforma
```

Outro exemplo:

```text
Aula:
"Como trabalhar com creators"

        ↓

SaaS:
"Encontrar Creators"

        ↓

SaaS:
"Campanha"

        ↓

SaaS:
"Acompanhamento"
```

---

# 5. MODELO DE NEGÓCIO

Preço inicial planejado:

> **aproximadamente R$90/mês**

O objetivo não é maximizar ARPU inicialmente.

O objetivo é:

* reduzir barreira de entrada;
* adquirir muitos sellers;
* gerar resultado rapidamente;
* aumentar retenção;
* criar base de dados;
* permitir expansão futura.

O produto deve ser arquitetado para suportar posteriormente:

```text
Free
↓
Pro
↓
Advanced
↓
Scale
```

Sem precisar reconstruir o core da aplicação.

---

# 6. PRINCÍPIOS DE ARQUITETURA

## 6.1 Multi-tenant desde o início

Cada usuário deve pertencer a uma estrutura de conta/workspace.

Não construir a aplicação como se existisse apenas um usuário.

Estrutura conceitual:

```text
User
  ↓
Workspace
  ↓
Store
  ↓
Products
Creators
Campaigns
Content
Orders
Analytics
```

Um usuário poderá eventualmente:

* possuir uma ou mais lojas;
* trabalhar em equipe;
* possuir diferentes permissões;
* administrar diferentes operações.

---

# 7. STACK

A arquitetura deve ser compatível prioritariamente com o stack já utilizado no projeto.

Stack principal esperada:

```text
Frontend:
Next.js
React
TypeScript
Tailwind CSS

Backend:
Next.js server-side
TypeScript

Database:
PostgreSQL

ORM:
Prisma

Infra:
Cloud/VPS compatível com Docker

Authentication:
arquitetura preparada para autenticação segura e multi-tenant
```

Se o repositório existente utilizar tecnologias adicionais ou diferentes, **não substituir automaticamente**.

Primeiro:

1. analisar o código existente;
2. identificar decisões já tomadas;
3. preservar o que estiver bem estruturado;
4. propor mudanças somente quando houver justificativa técnica.

---

# 8. ARQUITETURA DE ALTO NÍVEL

A aplicação deve ser organizada por domínio.

Não criar uma estrutura onde toda regra de negócio fica misturada em:

```text
app/
components/
utils/
```

A arquitetura deve permitir crescimento.

Modelo conceitual:

```text
                    FRONTEND
                       │
                       ▼
                 APPLICATION
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
      API          SERVICES        ACTIONS
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                 DOMAIN LAYER
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
     Products       Creators        Campaigns
        │              │               │
        ▼              ▼               ▼
     Content         Orders         Offers
        │              │               │
        └──────────────┼───────────────┘
                       ▼
                 DATA ACCESS
                       │
                       ▼
                  PostgreSQL
```

Integrações externas devem ficar isoladas:

```text
TikTok APIs
Payment
Email
WhatsApp
AI providers
Data providers
Storage
Analytics
```

Não espalhar chamadas externas pelo código da aplicação.

---

# 9. PRINCIPAIS DOMÍNIOS

A primeira versão deve ser construída ao redor dos seguintes domínios.

```text
Identity
Workspace
Store
Product
Offer
Creator
Campaign
Content
Order
Analytics
Discovery
Intelligence
Notification
Integration
Billing
AI
```

---

# 10. IDENTITY / USER

Responsável por:

* usuários;
* autenticação;
* sessões;
* perfil;
* permissões;
* membership.

Modelo conceitual:

```text
User
Workspace
WorkspaceMember
Role
Permission
```

Preparar para:

```text
OWNER
ADMIN
MEMBER
VIEWER
```

Não implementar um sistema gigantesco de RBAC se ele não for necessário na primeira versão.

Mas o modelo deve permitir evolução.

---

# 11. WORKSPACE

O Workspace representa a operação do cliente.

Exemplo:

```text
Workspace
 ├── Users
 ├── Stores
 ├── Products
 ├── Creators
 ├── Campaigns
 ├── Content
 ├── Orders
 └── Analytics
```

Todos os dados de negócio devem estar vinculados a um `workspace_id` ou equivalente.

Esse vínculo é obrigatório para evitar vazamento entre tenants.

---

# 12. STORE

Uma operação pode possuir uma ou mais lojas.

O domínio Store deve armazenar:

* identificação externa;
* plataforma;
* nome;
* status;
* credenciais/token de integração de forma segura;
* configuração;
* timezone;
* currency;
* informações de sincronização.

Não assumir que haverá apenas uma loja para sempre.

---

# 13. PRODUCT DOMAIN

O produto representa aquilo que o seller vende.

Informações esperadas:

```text
Product
 ├── name
 ├── sku
 ├── external_id
 ├── category
 ├── cost
 ├── selling_price
 ├── stock
 ├── status
 ├── commission
 ├── fees
 └── metadata
```

O produto também deve suportar:

* imagens;
* variantes;
* fornecedores;
* custos;
* histórico de preços;
* histórico de margem;
* performance;
* conteúdo associado;
* creators associados.

---

# 14. OFFER DOMAIN

Offer deve ser separado de Product.

Um produto pode ter várias ofertas.

Exemplo:

```text
Produto:
Whey X

Oferta A:
1 unidade
R$79

Oferta B:
2 unidades
R$139

Oferta C:
Kit
R$179
```

A oferta deve permitir cálculo de:

```text
Preço
- custo do produto
- comissão do creator
- taxas
- frete
- ads
= contribuição
```

O sistema deve ser capaz de comparar cenários.

Exemplo:

```text
Offer A
Margem: 21%

Offer B
Margem: 28%

Offer C
Margem: 34%
```

---

# 15. CREATOR DOMAIN

Creator é um dos principais domínios do produto.

O sistema deve funcionar como um CRM vertical para creators.

Dados:

```text
Creator
 ├── profile
 ├── social data
 ├── niche
 ├── audience
 ├── engagement
 ├── contact
 ├── status
 ├── score
 ├── performance
 └── metadata
```

Relacionamentos:

```text
Creator
 ├── Campaigns
 ├── Products
 ├── Content
 ├── Orders
 ├── Commissions
 ├── Contacts
 └── Performance
```

---

# 16. CREATOR PIPELINE

O creator deve possuir um pipeline.

Exemplo:

```text
DISCOVERED
 ↓
CONTACTED
 ↓
INTERESTED
 ↓
NEGOTIATING
 ↓
ACCEPTED
 ↓
PRODUCT_SENT
 ↓
RECEIVED
 ↓
CONTENT_PENDING
 ↓
CONTENT_PUBLISHED
 ↓
SELLING
 ↓
TOP_PERFORMER
```

Os estados devem ser configuráveis quando necessário.

---

# 17. CREATOR SCORING

O sistema deve possuir uma camada de scoring.

O score não deve ser apenas baseado em seguidores.

Possíveis dimensões:

```text
Sales Potential
Engagement
Conversion
Audience Fit
Product Fit
Consistency
Cost
Historical Performance
```

Exemplo:

```text
Creator Score: 87

Product Fit: 94
Conversion: 88
Engagement: 82
Consistency: 76
Cost Efficiency: 91
```

O algoritmo deve ser desacoplado do banco.

Não colocar toda a lógica de scoring diretamente em queries gigantes.

Criar uma camada de serviço específica.

---

# 18. CAMPAIGNS

Campaign representa uma operação coordenada com creators.

Exemplo:

```text
Campaign
 ├── Product
 ├── Offer
 ├── Creators
 ├── Commission
 ├── Goal
 ├── Budget
 ├── Start
 ├── End
 └── Status
```

Fluxo:

```text
Campaign created
 ↓
Creators selected
 ↓
Creators contacted
 ↓
Creators accepted
 ↓
Product sent
 ↓
Content published
 ↓
Sales generated
 ↓
Performance evaluated
```

---

# 19. CONTENT DOMAIN

Content representa os conteúdos publicados.

Dados esperados:

```text
Content
 ├── creator
 ├── product
 ├── campaign
 ├── external_id
 ├── published_at
 ├── views
 ├── likes
 ├── comments
 ├── shares
 ├── clicks
 ├── orders
 ├── GMV
 └── metadata
```

O sistema deve permitir relacionar:

```text
Creator
    ↓
Content
    ↓
Product
    ↓
Offer
    ↓
Order
    ↓
Revenue
```

Essa cadeia é fundamental.

---

# 20. ORDER DOMAIN

Orders devem representar vendas reais.

Nunca utilizar apenas métricas agregadas como fonte primária.

Estrutura conceitual:

```text
Order
 ├── external_id
 ├── store
 ├── product
 ├── creator
 ├── campaign
 ├── offer
 ├── quantity
 ├── gross_amount
 ├── discounts
 ├── fees
 ├── creator_commission
 ├── shipping
 ├── net_amount
 ├── status
 └── created_at
```

A estrutura deve permitir reconciliação.

---

# 21. FINANCIAL / UNIT ECONOMICS

Não tratar financeiro como simples dashboard.

O sistema deve calcular economia unitária.

Exemplo:

```text
Preço de venda
R$129

COGS
-R$37

Creator
-R$19

TikTok
-R$12

Ads
-R$21

Frete
-R$8

Contribution
R$32
```

Esses cálculos devem ser centralizados.

Não duplicar a mesma fórmula em:

* frontend;
* API;
* dashboard;
* IA.

Criar um domínio/service de cálculo financeiro.

---

# 22. DISCOVERY

Discovery é o módulo responsável por ajudar o seller a descobrir oportunidades.

Possibilidades futuras:

* produtos;
* creators;
* tendências;
* categorias;
* conteúdos;
* ofertas.

O módulo deve ser arquitetado para receber diferentes fontes de dados.

Exemplo:

```text
Discovery Provider
 ├── TikTok
 ├── Internal Data
 ├── External Data
 └── Future Providers
```

Não acoplar a aplicação diretamente a um único provider.

---

# 23. INTELLIGENCE ENGINE

Esse é um dos componentes mais importantes do produto.

Não deve ser simplesmente uma tela.

Deve ser um serviço capaz de analisar dados dos diferentes domínios.

Exemplo:

```text
Products
+
Creators
+
Content
+
Orders
+
Offers
+
Financial
        ↓
INTELLIGENCE ENGINE
        ↓
INSIGHT
        ↓
RECOMMENDATION
        ↓
ACTION
```

---

# 24. INSIGHTS

Um Insight representa uma descoberta do sistema.

Exemplo:

```text
type:
CREATOR_OPPORTUNITY

severity:
HIGH

title:
"Creator com potencial de escala"

description:
"Creator X possui conversão 42% acima da média."

recommendation:
"Enviar novo produto e aumentar comissão."

estimated_impact:
4200
```

Outro:

```text
type:
PRODUCT_OPPORTUNITY

title:
"Produto subaproveitado"

recommendation:
"Encontrar creators semelhantes aos top performers."
```

Insights devem ser persistidos quando fizer sentido.

Isso permite:

* histórico;
* métricas;
* acompanhamento;
* feedback;
* melhoria dos algoritmos.

---

# 25. RECOMMENDATION ENGINE

Separar:

```text
Insight
```

de:

```text
Recommendation
```

Insight:

> "Creator X está performando acima da média."

Recommendation:

> "Aumentar comissão para 20%."

Isso permite que futuramente uma recommendation seja executada automaticamente.

---

# 26. ACTION SYSTEM

O sistema deve evoluir de:

```text
"Você deveria fazer X."
```

para:

```text
"Você deveria fazer X."
        ↓
[Executar]
```

Exemplo:

```text
Recommendation:
Adicionar creator à campanha.

[Adicionar à campanha]
```

Futuro:

```text
Recommendation:
Aumentar comissão.

[Aplicar]
```

Portanto, as recomendações devem ser modeladas como objetos que podem eventualmente possuir ações.

---

# 27. AI

IA não deve ser o produto.

IA deve ser uma camada sobre os dados e workflows.

Criar uma abstração:

```text
AIProvider
```

com possibilidade de múltiplos providers.

Exemplo conceitual:

```text
AIService
 ├── analyzeContent()
 ├── analyzeCreator()
 ├── analyzeProduct()
 ├── generateOffer()
 ├── generateInsight()
 └── generateRecommendation()
```

Não espalhar chamadas de OpenAI/Anthropic/Gemini diretamente pelos componentes React.

---

# 28. AI AGENTS

Futuramente:

```text
Analyst Agent
Creator Agent
Offer Agent
Content Agent
Operations Agent
```

Cada agente deve utilizar serviços e ferramentas internas.

Exemplo:

```text
Analyst Agent
 ↓
readSales()
readCreators()
readContent()
calculateMargin()
 ↓
generateInsight()
```

O agente não deve possuir acesso direto irrestrito ao banco.

Utilizar ferramentas/domain services controlados.

---

# 29. DASHBOARD

O Dashboard não deve ser apenas um painel de métricas.

A home deve responder:

> **"O que está acontecendo e o que devo fazer?"**

Estrutura possível:

```text
Overview
 ↓
Performance
 ↓
Insights
 ↓
Recommended Actions
```

Exemplo:

```text
GMV
Pedidos
Margem
Creators ativos

↓

3 oportunidades encontradas

↓

5 creators precisam de atenção

↓

2 produtos com potencial

↓

1 conteúdo vencedor para replicar
```

---

# 30. ONBOARDING

O onboarding é extremamente importante porque o usuário pode estar começando do zero.

Não apresentar todos os módulos de uma vez.

Criar onboarding orientado por progresso.

Exemplo:

```text
COMECE SUA OPERAÇÃO

[✓] Criar conta
[✓] Configurar loja
[ ] Adicionar primeiro produto
[ ] Criar primeira oferta
[ ] Encontrar creators
[ ] Criar primeira campanha
[ ] Publicar primeiro conteúdo
[ ] Fazer primeira venda
```

O sistema deve acompanhar o estágio do usuário.

---

# 31. USER JOURNEY

O produto deve reconhecer aproximadamente quatro estágios.

## STAGE 1 — STARTING

Usuário ainda não vende.

Necessidades:

* descobrir produtos;
* validar produto;
* entender margem;
* criar primeira oferta;
* aprender operação.

---

## STAGE 2 — FIRST SALES

Usuário começou a vender.

Necessidades:

* creators;
* campanhas;
* conteúdo;
* acompanhamento;
* primeiras métricas.

---

## STAGE 3 — GROWING

Usuário já possui volume.

Necessidades:

* analytics;
* ranking;
* performance;
* otimização;
* unit economics.

---

## STAGE 4 — SCALING

Usuário possui operação significativa.

Necessidades:

* automações;
* IA;
* bulk operations;
* recomendações;
* otimização;
* workflows.

---

# 32. PROGRESS ENGINE

Criar uma camada que determine o estágio do usuário.

Não utilizar apenas faturamento.

Considerar:

```text
products_count
orders_count
active_creators
campaigns_count
content_count
gmv
activity
```

Exemplo:

```text
STARTING
FIRST_SALES
GROWING
SCALING
```

Esse estágio pode alterar:

* onboarding;
* dashboard;
* recomendações;
* mensagens;
* funcionalidades apresentadas.

---

# 33. NOTIFICATIONS

Criar sistema de notificações desacoplado.

Eventos possíveis:

```text
Creator accepted campaign
Creator published content
New order
Product low stock
Campaign reached goal
Insight generated
Recommendation generated
Creator inactive
```

Canais futuros:

```text
In-app
Email
WhatsApp
Push
```

Não implementar todos inicialmente.

Mas criar arquitetura extensível.

---

# 34. EVENT-DRIVEN ARCHITECTURE

Não é necessário transformar tudo em microserviços.

A aplicação pode começar como um **modular monolith**.

Porém, os domínios devem emitir eventos internos.

Exemplo:

```text
OrderCreated
 ↓
Analytics
 ↓
CreatorPerformance
 ↓
Intelligence
 ↓
InsightGenerated
 ↓
Notification
```

Outro:

```text
ContentPublished
 ↓
ContentAnalytics
 ↓
CreatorPerformance
 ↓
RecommendationEngine
```

Utilizar eventos para reduzir acoplamento entre módulos.

---

# 35. MODULAR MONOLITH

A primeira arquitetura deve preferencialmente ser:

> **Modular Monolith**

e não microservices.

Motivo:

O produto ainda está validando:

* mercado;
* workflows;
* modelo de dados;
* comportamento dos usuários;
* integrações.

Microservices neste momento aumentariam:

* complexidade;
* custo;
* observabilidade;
* deploy;
* debugging;
* latência;
* manutenção.

Mas os módulos devem possuir fronteiras claras para permitir extração futura caso algum domínio realmente precise ser separado.

---

# 36. ESTRUTURA DE PROJETO

A estrutura exata deve ser definida após analisar o repositório atual.

Como referência:

```text
src/
├── app/
│
├── modules/
│   ├── auth/
│   ├── workspace/
│   ├── store/
│   ├── product/
│   ├── offer/
│   ├── creator/
│   ├── campaign/
│   ├── content/
│   ├── order/
│   ├── analytics/
│   ├── discovery/
│   ├── intelligence/
│   ├── notification/
│   ├── integration/
│   ├── billing/
│   └── ai/
│
├── components/
│
├── lib/
│
├── infrastructure/
│
└── shared/
```

Cada módulo deve possuir responsabilidade clara.

Exemplo:

```text
modules/creator/

creator.domain.ts
creator.service.ts
creator.repository.ts
creator.schema.ts
creator.types.ts
creator.events.ts
creator.actions.ts
```

Não criar arquivos gigantes.

---

# 37. DATABASE DESIGN

Banco principal:

> PostgreSQL

ORM:

> Prisma

O banco deve ser projetado pensando em:

* multi-tenancy;
* integridade;
* índices;
* histórico;
* auditoria;
* crescimento;
* queries analíticas.

---

# 38. DATABASE PRINCIPLES

Todas as entidades de negócio devem possuir identificadores estáveis.

Evitar depender de nomes como chave.

Utilizar:

```text
id
workspace_id
created_at
updated_at
```

quando aplicável.

Dados externos devem possuir:

```text
external_id
external_source
```

quando necessário.

---

# 39. TENANT ISOLATION

Toda query que acessa dados de negócio deve respeitar o workspace.

Nunca confiar apenas no frontend.

Exemplo conceitual:

```text
request
 ↓
authenticated user
 ↓
workspace membership
 ↓
authorized workspace
 ↓
domain service
 ↓
repository
 ↓
database
```

O `workspace_id` deve ser validado no backend.

---

# 40. DATABASE INDEXING

Criar índices baseados em padrões reais de acesso.

Exemplos:

```text
workspace_id
workspace_id + status
workspace_id + created_at
workspace_id + external_id
creator_id
product_id
campaign_id
```

Não criar dezenas de índices preventivamente.

Medir e ajustar conforme utilização.

---

# 41. SQL RULE

Quando SQL for escrito:

> **NUNCA utilizar aliases para tabelas.**

Exemplo permitido:

```sql
SELECT
    tb_product.codigo,
    tb_product.nome
FROM tb_product
WHERE tb_product.workspace_id = @workspace_id;
```

Evitar:

```sql
FROM tb_product p
```

Essa regra deve ser respeitada em queries SQL, migrations, scripts e documentação técnica.

---

# 42. REPOSITORY PATTERN

O acesso ao banco deve ser isolado dos serviços de domínio.

Exemplo:

```text
Controller
 ↓
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
```

O frontend não deve acessar diretamente o banco.

---

# 43. DOMAIN SERVICE

Regras de negócio devem ficar em services.

Exemplo:

```text
CreatorService
CampaignService
OfferService
FinancialService
IntelligenceService
```

Não colocar regra de negócio importante dentro de:

* componentes React;
* route handlers gigantes;
* queries SQL;
* hooks de frontend.

---

# 44. VALIDATION

Todas as entradas externas devem ser validadas.

Validar:

* body;
* query params;
* path params;
* webhooks;
* integrações;
* arquivos;
* imports.

Utilizar schemas tipados.

Exemplo:

```text
Request
 ↓
Validation
 ↓
Authorization
 ↓
Domain Service
```

---

# 45. API DESIGN

Criar APIs orientadas a domínio.

Evitar endpoints genéricos como:

```text
/update
/save
/process
```

Preferir operações explícitas.

Exemplos:

```text
POST /api/products
POST /api/products/:id/offers

POST /api/creators
POST /api/campaigns

POST /api/campaigns/:id/creators

POST /api/content/sync

GET /api/intelligence/insights
POST /api/intelligence/recommendations/:id/execute
```

A nomenclatura deve ser consistente.

---

# 46. INTEGRATIONS

Criar uma camada de integração.

Exemplo:

```text
integrations/
├── tiktok/
├── payment/
├── ai/
├── email/
└── storage/
```

Cada integração deve ter uma interface própria.

Exemplo conceitual:

```text
TikTokStoreProvider
TikTokContentProvider
TikTokOrderProvider
TikTokCreatorProvider
```

Não espalhar SDK específico do TikTok por todo o projeto.

---

# 47. TIKTOK INTEGRATION

A integração com TikTok deve ser tratada como uma camada externa.

Nunca assumir que:

* API não mudará;
* resposta terá sempre os mesmos campos;
* rate limit será infinito;
* dados chegarão completos;
* sincronização será instantânea.

Criar:

```text
External API
 ↓
Integration Adapter
 ↓
Normalization
 ↓
Internal Domain
```

O modelo interno não deve depender diretamente do formato da API externa.

---

# 48. SYNCHRONIZATION

Sincronizações devem ser idempotentes.

Exemplo:

```text
TikTok Order #123
```

Se o mesmo pedido for recebido três vezes:

```text
não criar 3 orders.
```

Deve existir uma chave externa única apropriada.

---

# 49. WEBHOOKS

Webhooks devem ser:

* autenticados;
* validados;
* idempotentes;
* registrados;
* processados de maneira segura.

Fluxo:

```text
Webhook
 ↓
Validate
 ↓
Persist event
 ↓
Return quickly
 ↓
Process asynchronously
 ↓
Update domain
```

Não executar processamento pesado antes de responder ao provider quando não for necessário.

---

# 50. BACKGROUND JOBS

Algumas operações não devem bloquear requests HTTP.

Exemplos:

* sincronização TikTok;
* processamento de métricas;
* análise de conteúdo;
* geração de insights;
* processamento de IA;
* envio de notificações;
* imports;
* recalculo de performance.

Criar arquitetura preparada para jobs.

Não é necessário escolher uma solução específica antes de analisar a infraestrutura existente.

---

# 51. ANALYTICS

Separar dados operacionais de dados analíticos.

O banco transacional continua sendo a fonte de verdade.

Para agregações pesadas, criar:

* queries otimizadas;
* views/materialized views quando justificadas;
* tabelas de agregação;
* jobs de cálculo.

Não fazer uma query gigantesca toda vez que o usuário abrir o dashboard.

---

# 52. METRICS

Métricas importantes:

```text
GMV
Orders
AOV
Conversion Rate
Views
Clicks
CTR
CVR
Creator Commission
Product Cost
Fees
Ads Cost
Contribution
Margin
ROI
ROAS
```

As fórmulas devem possuir uma única fonte de verdade.

---

# 53. DATA SNAPSHOTS

Métricas que mudam ao longo do tempo devem possuir histórico quando necessário.

Exemplo:

```text
CreatorPerformanceDaily
ProductPerformanceDaily
ContentPerformanceDaily
```

Isso permite:

```text
Hoje
Ontem
7 dias
30 dias
Comparação
Tendência
```

---

# 54. AUDIT LOG

Criar arquitetura de auditoria.

Eventos importantes:

```text
ProductCreated
OfferUpdated
CampaignCreated
CreatorAdded
CommissionChanged
IntegrationConnected
OrderImported
```

Não necessariamente tudo precisa aparecer para o usuário.

Mas ações críticas devem ser rastreáveis.

---

# 55. SECURITY

Requisitos mínimos:

* autenticação segura;
* autorização server-side;
* isolamento de tenant;
* secrets fora do código;
* tokens externos criptografados quando necessário;
* validação de webhooks;
* rate limiting;
* proteção contra abuso;
* logs sem dados sensíveis;
* proteção de endpoints administrativos.

Nunca confiar no frontend para autorização.

---

# 56. OBSERVABILITY

Preparar:

```text
Application Logs
Error Tracking
Performance Monitoring
Job Monitoring
Integration Monitoring
```

Logs devem permitir responder:

> "Por que a sincronização desse seller falhou?"

ou:

> "Por que esse pedido não entrou?"

Não depender de `console.log` espalhado pela aplicação como estratégia de observabilidade.

---

# 57. BILLING

Billing deve ser um domínio separado.

Não colocar lógica de assinatura dentro do módulo de usuário.

Conceito:

```text
Workspace
 ↓
Subscription
 ↓
Plan
 ↓
Usage
 ↓
Billing
```

Preparar para:

```text
Free
Pro
Advanced
Scale
```

O sistema deve conseguir controlar limites por plano.

---

# 58. FEATURE FLAGS

Preparar arquitetura para feature flags.

Exemplos:

```text
new_dashboard
ai_insights
creator_scoring_v2
advanced_analytics
```

Isso permitirá testar funcionalidades sem deployar versões diferentes da aplicação.

---

# 59. USAGE LIMITS

Como o preço inicial é baixo, é importante controlar custos.

Exemplos:

```text
AI requests
Creator discovery
Data synchronization
Storage
Exports
Campaigns
```

O sistema deve possuir uma camada de usage tracking.

---

# 60. CUSTO DE IA

Nunca permitir que uma ação simples gere chamadas ilimitadas para modelos caros.

Criar:

```text
AIUsage
```

e controlar:

```text
workspace
user
provider
model
operation
tokens
cost
created_at
```

Isso permitirá saber quanto cada cliente custa.

---

# 61. FRONTEND PRINCIPLES

O frontend deve priorizar:

* simplicidade;
* velocidade;
* clareza;
* orientação por ação;
* progressão.

Evitar transformar o dashboard em um cockpit cheio de gráficos.

O usuário iniciante deve conseguir entender:

> "O que faço agora?"

em poucos segundos.

---

# 62. DESIGN PRINCIPLE

Toda tela deve responder a uma pergunta.

Exemplos:

### Products

> "O que eu deveria vender?"

### Offers

> "Como devo vender?"

### Creators

> "Quem pode vender para mim?"

### Campaigns

> "Quem está trabalhando comigo?"

### Content

> "Qual conteúdo está funcionando?"

### Analytics

> "O que está dando resultado?"

### Intelligence

> "O que devo fazer agora?"

---

# 63. CORE NAVIGATION

Estrutura inicial sugerida:

```text
Dashboard

Descobrir
 ├── Produtos
 ├── Creators
 └── Tendências

Operação
 ├── Produtos
 ├── Ofertas
 ├── Creators
 ├── Campanhas
 └── Conteúdos

Resultados
 ├── Vendas
 ├── Analytics
 └── Financeiro

Intelligence
 ├── Insights
 └── Recomendações
```

A navegação final deve ser validada com a UX do projeto existente.

---

# 64. MVP

O MVP não deve tentar implementar toda a visão final.

O primeiro núcleo deve ser:

```text
1. Onboarding

2. Workspace

3. Products

4. Offers

5. Creators

6. Campaigns

7. Content

8. Orders

9. Basic Analytics

10. Intelligence básica
```

O MVP deve permitir o seguinte fluxo:

```text
Usuário entra
 ↓
Configura operação
 ↓
Cadastra produto
 ↓
Cria oferta
 ↓
Encontra creator
 ↓
Cria campanha
 ↓
Creator publica conteúdo
 ↓
Venda acontece
 ↓
Sistema registra resultado
 ↓
Usuário vê performance
 ↓
Sistema recomenda próxima ação
```

Esse é o primeiro grande loop.

---

# 65. O QUE NÃO CONSTRUIR AGORA

Não transformar a primeira versão em um monstro.

Evitar inicialmente:

* ERP financeiro completo;
* contabilidade;
* estoque extremamente avançado;
* CRM genérico;
* automações infinitas;
* dezenas de integrações;
* microservices;
* IA autônoma irrestrita;
* BI empresarial;
* permissões extremamente complexas;
* sistema gigantesco de notificações;
* marketplace próprio.

Essas coisas podem existir no futuro.

Mas não devem atrasar a validação do core.

---

# 66. ROADMAP

## FASE 0 — FOUNDATION

```text
Auth
Workspace
Database
Multi-tenancy
Base architecture
Design system
Logging
Error handling
```

---

## FASE 1 — FIRST OPERATION

```text
Products
Offers
Creators
Campaigns
Content
Orders
Basic Analytics
```

Objetivo:

> permitir que o usuário execute uma operação real.

---

## FASE 2 — FIRST GROWTH

```text
Creator scoring
Product scoring
Performance ranking
Insights
Recommendations
Daily performance
```

Objetivo:

> transformar dados em decisões.

---

## FASE 3 — AUTOMATION

```text
Background jobs
Sync automation
Notifications
Bulk actions
Campaign automation
Creator workflows
```

Objetivo:

> reduzir trabalho manual.

---

## FASE 4 — AI

```text
AI Analyst
AI Creator
AI Offer
AI Content
AI Operations
```

Objetivo:

> transformar inteligência em execução.

---

## FASE 5 — SCALE

```text
Advanced analytics
Multi-store
Teams
Advanced permissions
Advanced billing
Advanced automation
API
Integrations
```

Objetivo:

> acompanhar clientes maiores.

---

# 67. PRODUCT MOAT

O diferencial não deve ser apenas:

```text
"Tem IA."
```

Isso é facilmente copiado.

O moat desejado é:

```text
Dados
 ↓
Relacionamentos
 ↓
Performance histórica
 ↓
Patterns
 ↓
Recommendations
 ↓
Actions
 ↓
Resultados
 ↓
Mais dados
```

Com o tempo, a plataforma deve entender:

```text
qual produto funciona
para qual creator
com qual oferta
em qual formato de conteúdo
com qual comissão
para qual audiência
```

Esse conhecimento acumulado é mais difícil de copiar.

---

# 68. PRINCÍPIO DE ESCALABILIDADE

Escalabilidade não significa começar com microservices.

Escalabilidade significa:

* domínio bem separado;
* banco bem modelado;
* jobs assíncronos;
* APIs desacopladas;
* integrações isoladas;
* idempotência;
* observabilidade;
* cache quando necessário;
* índices adequados;
* arquitetura modular.

Começar simples.

Projetar para crescer.

---

# 69. PRINCÍPIO DE PERFORMANCE

Não otimizar prematuramente.

Mas evitar desde o início:

* N+1 queries;
* queries sem índices;
* processamento pesado no request;
* chamadas externas em cascata;
* chamadas de IA desnecessárias;
* carregar milhares de registros no frontend.

Sempre considerar:

```text
Pagination
Filtering
Sorting
Caching
Background Processing
Aggregation
```

---

# 70. PRINCÍPIO DE DATA QUALITY

O sistema será tão bom quanto seus dados.

Portanto:

* dados externos precisam ser normalizados;
* sincronizações precisam ser rastreáveis;
* valores financeiros precisam ter precisão adequada;
* timestamps precisam possuir timezone consistente;
* métricas precisam possuir definição única;
* registros duplicados precisam ser evitados.

Não construir Intelligence em cima de dados inconsistentes.

---

# 71. SOURCE OF TRUTH

Definir claramente a fonte de verdade.

Exemplo:

```text
TikTok
    ↓
External Source

PostgreSQL
    ↓
Internal Source of Truth

Analytics
    ↓
Derived Data

AI
    ↓
Interpretation
```

A IA nunca deve ser considerada fonte de verdade para dados financeiros ou operacionais.

---

# 72. ERROR HANDLING

Erros devem ser classificados.

```text
ValidationError
AuthorizationError
NotFoundError
ConflictError
IntegrationError
ExternalAPIError
DatabaseError
BusinessRuleError
```

O usuário não deve receber stack trace.

Logs técnicos ficam no backend.

---

# 73. TESTING

Priorizar testes onde existe regra de negócio.

Principalmente:

```text
Offer calculations
Financial calculations
Creator scoring
Campaign rules
Commission calculations
Order synchronization
Tenant isolation
Webhook idempotency
```

Não buscar 100% de coverage artificial.

Testar o que pode causar prejuízo ou corrupção de dados.

---

# 74. MIGRATIONS

Toda alteração de banco deve ser versionada.

Nunca depender de alterações manuais no banco de produção.

Fluxo:

```text
Schema change
 ↓
Migration
 ↓
Review
 ↓
Deploy
```

Seed deve existir para ambiente de desenvolvimento.

---

# 75. DEVELOPMENT ENVIRONMENT

Deve existir uma forma fácil de subir:

```text
Database
Application
Workers
Dependencies
```

Preferencialmente via Docker quando fizer sentido.

O README deve explicar claramente:

```text
install
environment variables
database
migration
seed
development
build
production
```

---

# 76. ENVIRONMENT VARIABLES

Nunca colocar secrets no código.

Separar:

```text
Development
Test
Production
```

Exemplos:

```text
DATABASE_URL
AUTH_SECRET
TIKTOK_CLIENT_ID
TIKTOK_CLIENT_SECRET
AI_API_KEY
STORAGE_KEY
PAYMENT_SECRET
```

Não commitar `.env`.

---

# 77. DEPLOYMENT

O deploy deve permitir:

```text
Web application
Worker
Database
```

Quando necessário.

A aplicação não deve depender de estado local do servidor.

Arquivos permanentes devem utilizar storage externo.

---

# 78. BACKUPS

O banco precisa possuir estratégia de backup.

Além disso, informações importantes devem ser recuperáveis sem depender de memória da aplicação.

---

# 79. ADMIN SYSTEM

Criar futuramente uma área administrativa separada.

Necessidades:

```text
Users
Workspaces
Subscriptions
Usage
Errors
Integrations
Jobs
Feature flags
```

Não expor ferramentas administrativas para usuários comuns.

---

# 80. PRODUCT ANALYTICS

Além do analytics do seller, o próprio SaaS precisa possuir analytics de produto.

Exemplos:

```text
Activation Rate
Time to First Product
Time to First Campaign
Time to First Sale
Trial → Paid
Churn
Retention
Feature Usage
AI Usage
```

Principalmente:

> **Time to First Value**

O usuário precisa chegar ao primeiro valor rapidamente.

---

# 81. ACTIVATION

Definir um evento de ativação.

Exemplo:

```text
User:
created product
+
created offer
+
added creator
+
created campaign
```

Esse usuário está muito mais próximo de perceber valor do que alguém que apenas criou uma conta.

A definição exata deve ser validada durante os primeiros testes.

---

# 82. RETENTION

A retenção deve vir do workflow, não de notificações artificiais.

O usuário deve voltar porque:

```text
há novos dados
há novos creators
há novas vendas
há novos insights
há novas oportunidades
há novas recomendações
```

O produto deve se tornar parte da operação diária.

---

# 83. PRINCÍPIO CENTRAL DE UX

Nunca assumir conhecimento técnico.

O usuário pode estar começando do zero.

Portanto:

```text
Termo técnico
 ↓
Explicação contextual
 ↓
Ação
```

Exemplo:

Não mostrar simplesmente:

```text
CVR: 4.8%
```

Mostrar:

```text
Conversão
4,8%

De cada 100 pessoas que clicam,
aproximadamente 5 compram.
```

---

# 84. PRODUCT LANGUAGE

A linguagem deve ser:

* direta;
* simples;
* orientada a resultado;
* sem excesso de jargão;
* sem parecer software corporativo.

O produto deve parecer uma ferramenta de crescimento, não um ERP burocrático.

---

# 85. REGRA PARA NOVAS FEATURES

Antes de implementar qualquer feature, responder:

```text
1. Qual problema resolve?

2. Para qual estágio do seller?

3. Qual comportamento muda?

4. Qual resultado pode gerar?

5. O usuário utilizaria isso semanalmente?

6. Isso pode virar uma ação?

7. Essa feature alimenta algum outro domínio?
```

Se a resposta for apenas:

> "É legal ter."

Não construir.

---

# 86. REGRA PARA IA

Antes de adicionar IA:

```text
Existe um problema real?
        ↓
Existe dado suficiente?
        ↓
Existe uma decisão que pode ser melhorada?
        ↓
A IA consegue produzir valor?
        ↓
Existe uma ação depois da resposta?
```

Se não houver ação, provavelmente é apenas chatbot.

---

# 87. REGRA PARA DASHBOARDS

Antes de criar qualquer gráfico:

> **Qual decisão esse gráfico permite tomar?**

Se a resposta for nenhuma:

> não criar o gráfico.

---

# 88. REGRA PARA DADOS

Antes de armazenar qualquer dado:

> **Que decisão futura esse dado permitirá tomar?**

Isso evita criar um banco gigantesco cheio de informações inúteis.

---

# 89. ARQUITETURA FUTURA

A arquitetura deve permitir evolução para:

```text
TikTok Shop
    ↓
Growth OS
    ↓
Multi-platform Commerce
```

No futuro, a mesma infraestrutura poderia suportar:

```text
TikTok Shop
Instagram
YouTube
Shopee
Amazon
```

Porém:

> **não construir abstrações genéricas demais antes de existir necessidade real.**

Primeiro dominar TikTok Shop.

---

# 90. PRINCIPAL LOOP DO PRODUTO

O produto inteiro deve convergir para:

```text
DISCOVER
   ↓
VALIDATE
   ↓
OFFER
   ↓
RECRUIT
   ↓
CAMPAIGN
   ↓
CONTENT
   ↓
SELL
   ↓
ANALYZE
   ↓
OPTIMIZE
   ↓
SCALE
   ↓
REPEAT
```

Esse é o coração do Growth OS.

---

# 91. INSTRUÇÕES PARA O CLAUDE

Antes de escrever código:

## PASSO 1

Analise completamente o repositório existente.

Identifique:

* stack;
* estrutura;
* rotas;
* componentes;
* banco;
* Prisma schema;
* autenticação;
* APIs;
* integrações;
* estado;
* design system;
* problemas técnicos.

Não reescreva o projeto automaticamente.

---

## PASSO 2

Compare o estado atual do projeto com este documento.

Crie uma análise:

```text
EXISTE E ESTÁ BOM
EXISTE MAS PRECISA REFACTOR
EXISTE MAS ESTÁ MAL MODELADO
NÃO EXISTE
```

---

## PASSO 3

Mapeie o domínio atual.

Crie uma proposta de:

```text
Entity
Relationship
Service
Repository
Event
API
```

para cada domínio necessário.

---

## PASSO 4

Antes de implementar mudanças grandes, apresente:

```text
Architecture Proposal
Database Proposal
Module Proposal
Migration Plan
Risk Analysis
```

---

## PASSO 5

Não implemente tudo de uma vez.

Construir incrementalmente:

```text
Foundation
 ↓
Products
 ↓
Offers
 ↓
Creators
 ↓
Campaigns
 ↓
Content
 ↓
Orders
 ↓
Analytics
 ↓
Intelligence
```

---

# 92. REGRAS IMPORTANTES PARA O DESENVOLVIMENTO

### Regra 1

Não criar código desnecessário.

### Regra 2

Não criar abstrações sem necessidade.

### Regra 3

Não duplicar regras de negócio.

### Regra 4

Não colocar regra de negócio no frontend.

### Regra 5

Não colocar chamadas externas espalhadas pela aplicação.

### Regra 6

Não acoplar domínio diretamente ao provider externo.

### Regra 7

Não criar microservices sem necessidade.

### Regra 8

Não criar tabelas apenas porque podem ser úteis no futuro.

### Regra 9

Não criar funcionalidades sem caso de uso real.

### Regra 10

Toda funcionalidade deve possuir uma razão de negócio clara.

---

# 93. CRITÉRIO DE SUCESSO DA ARQUITETURA

A arquitetura será considerada boa se:

1. Um novo módulo puder ser adicionado sem quebrar os existentes.
2. Um provider externo puder ser substituído sem reescrever o domínio.
3. O produto puder crescer de dezenas para milhares de workspaces.
4. O banco puder crescer sem depender de queries gigantes.
5. Jobs pesados puderem ser processados assincronamente.
6. IA puder trocar de provider.
7. Billing puder trocar de provider.
8. O sistema puder suportar múltiplas lojas.
9. O produto puder evoluir para equipes.
10. O código continuar compreensível para novos desenvolvedores.

---

# 94. REGRA MAIS IMPORTANTE

Não confundir:

> **escalabilidade técnica**

com:

> **complexidade técnica.**

Queremos uma arquitetura capaz de crescer.

Não queremos uma arquitetura complexa apenas para parecer escalável.

A prioridade é:

```text
Simplicidade
+
Modularidade
+
Dados corretos
+
Domínios bem separados
+
Boa experiência
+
Capacidade de evolução
```

---

# 95. VISÃO FINAL

O objetivo não é construir:

> "mais uma ferramenta de TikTok Shop."

O objetivo é construir:

> **o sistema que acompanha o vendedor desde o primeiro produto até uma operação profissional.**

O usuário deve entrar pensando:

> "Não sei por onde começar."

O produto responde:

> "Vamos começar por aqui."

Depois:

> "Não sei o que vender."

O produto responde:

> "Esses produtos possuem potencial."

Depois:

> "Não sei quem procurar."

O produto responde:

> "Esses creators são compatíveis."

Depois:

> "Não sei o que está funcionando."

O produto responde:

> "Esse creator e esse conteúdo estão gerando resultado."

Depois:

> "Não sei o que fazer agora."

O produto responde:

> **"Faça isso."**

E, futuramente:

> **"Posso fazer isso por você."**

Esse é o objetivo final da arquitetura.

---

# 96. ENTREGÁVEIS ESPERADOS DO CLAUDE

Após analisar o projeto, produzir os seguintes documentos antes de grandes implementações:

```text
/docs/
    architecture.md
    domain-model.md
    database.md
    api.md
    integrations.md
    events.md
    security.md
    roadmap.md
```

Além disso, produzir:

```text
ERD
Domain Map
Application Flow
Integration Flow
Data Flow
```

A implementação deve seguir esses documentos e mantê-los atualizados quando decisões arquiteturais relevantes forem alteradas.

---

# 97. ORDEM DE EXECUÇÃO

A ordem recomendada é:

```text
1. AUDIT CURRENT CODEBASE

2. DEFINE ARCHITECTURE

3. DEFINE DATABASE

4. DEFINE DOMAIN BOUNDARIES

5. IMPLEMENT FOUNDATION

6. IMPLEMENT PRODUCT

7. IMPLEMENT OFFER

8. IMPLEMENT CREATOR

9. IMPLEMENT CAMPAIGN

10. IMPLEMENT CONTENT

11. IMPLEMENT ORDER

12. IMPLEMENT ANALYTICS

13. IMPLEMENT INTELLIGENCE

14. IMPLEMENT AUTOMATIONS

15. IMPLEMENT AI

16. OPTIMIZE

17. SCALE
```

Não pular diretamente para IA antes de existir uma base confiável de dados.

---

# 98. DECISÃO FINAL DE ARQUITETURA

A arquitetura inicial deve ser:

> **Modular Monolith + PostgreSQL + Prisma + Next.js/TypeScript**, com domínios bem separados, eventos internos, jobs assíncronos e integrações externas isoladas.

A aplicação deve ser construída de forma que, quando um domínio realmente atingir necessidade de escala independente, ele possa eventualmente ser extraído.

Até esse momento:

> **manter o sistema simples.**

O objetivo não é construir a arquitetura mais sofisticada possível.

O objetivo é construir a arquitetura que permita transformar o produto em uma plataforma grande **sem precisar jogar o código fora no caminho.**
