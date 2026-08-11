# Creator Commerce Platform — Arquitetura Completa

## 1. Visão do Produto

A plataforma é um SaaS de **Creator Commerce**, construído para conectar e otimizar os dois lados do ecossistema de vendas via creators:

- **Creators:** encontram produtos, afiliam-se, criam conteúdo, acompanham vendas e maximizam suas comissões.
- **Sellers:** cadastram/conectam seus produtos, encontram creators, criam campanhas, acompanham vendas e maximizam o ROI da operação.

O TikTok Shop permanece como a infraestrutura transacional principal.

A plataforma não deve tentar substituir o TikTok Shop.

O papel do SaaS é atuar como uma camada de:

- descoberta;
- matching;
- inteligência;
- recomendação;
- automação;
- analytics;
- otimização;
- gestão da relação entre creators e sellers.

---

# 2. Proposta de Valor

## Para Creator

> Encontre produtos que combinam com seu público, crie conteúdo e transforme audiência em renda.

Fluxo principal:

```text
Criar conta
    ↓
Conectar TikTok
    ↓
Analisar perfil
    ↓
Descobrir produtos
    ↓
Escolher produto
    ↓
Afiliação
    ↓
Criar conteúdo
    ↓
Publicar
    ↓
Gerar vendas
    ↓
Receber comissão
    ↓
Analisar performance
    ↓
Escalar
```

## Para Seller

> Encontre creators capazes de vender seus produtos e transforme creator commerce em um canal previsível de aquisição.

Fluxo principal:

```text
Criar conta
    ↓
Conectar TikTok Shop
    ↓
Importar produtos
    ↓
Configurar comissão/campanha
    ↓
Encontrar creators
    ↓
Convidar creators
    ↓
Creators produzem conteúdo
    ↓
Vendas
    ↓
Analisar performance
    ↓
Encontrar creators semelhantes
    ↓
Escalar
```

---

# 3. Princípio Fundamental da Arquitetura

A plataforma não deve ser construída como dois sistemas independentes.

Não teremos:

```text
SaaS Creator
+
SaaS Seller
```

Teremos:

```text
                  PLATFORM CORE
                       │
          ┌────────────┴────────────┐
          │                         │
       CREATOR                   SELLER
          │                         │
          └────────────┬────────────┘
                       │
                COMMERCE ENGINE
                       │
          ┌────────────┼────────────┐
          │            │            │
       Products    Campaigns      Orders
          │            │            │
          └────────────┼────────────┘
                       │
                    Matching
                       │
                      AI
```

Creator e Seller são experiências diferentes sobre o mesmo núcleo de dados.

---

# 4. Princípio de Identidade

O usuário não deve ser permanentemente definido como Creator ou Seller.

A conta deve permitir múltiplos perfis.

Exemplo:

```text
User
├── Creator Profile
└── Seller Profile
```

Um usuário pode inicialmente escolher:

```text
Creator
```

e posteriormente adicionar:

```text
Seller
```

ou vice-versa.

Isso evita que a arquitetura fique presa a um único papel.

---

# 5. Cadastro Inicial

Após criar a conta:

```text
Como você pretende usar a plataforma?

[ Sou Creator ]

Quero encontrar produtos,
criar conteúdo e ganhar comissão.

[ Sou Seller ]

Quero encontrar creators
para vender meus produtos.
```

A escolha define o onboarding inicial.

Não define uma limitação permanente da conta.

---

# 6. Arquitetura de Alto Nível

```text
                           CLIENT
                             │
                ┌────────────┴────────────┐
                │                         │
             Creator                   Seller
                │                         │
                └────────────┬────────────┘
                             │
                        Web Application
                             │
                        API / Backend
                             │
              ┌──────────────┼──────────────┐
              │              │              │
          Identity       Commerce        Analytics
              │            Engine            │
              │              │              │
              │      ┌───────┼───────┐      │
              │      │       │       │      │
              │  Products Campaigns Orders  │
              │      │       │       │      │
              └──────┴───────┴───────┴──────┘
                             │
                       Matching Engine
                             │
                         AI Engine
                             │
                    Integration Layer
                             │
                    ┌────────┴────────┐
                    │                 │
                  TikTok          Future APIs
                 / Shop
```

---

# 7. Stack Inicial

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

Preferencialmente:

- Next.js API / Backend
- TypeScript

Caso o crescimento justifique posteriormente:

- serviço backend separado;
- workers independentes;
- processamento assíncrono.

## Database

PostgreSQL.

## ORM

Prisma.

## Cache / filas

Redis.

Possíveis usos:

- cache;
- rate limiting;
- jobs;
- processamento assíncrono;
- sincronização com APIs;
- análise de dados.

## Storage

Object Storage compatível com S3 para:

- imagens;
- vídeos;
- documentos;
- assets de campanhas.

## Infraestrutura

Inicialmente:

- Docker;
- VPS/Cloud;
- PostgreSQL;
- Redis;
- Object Storage.

A arquitetura deve permitir migração posterior para infraestrutura mais distribuída.

---

# 8. Arquitetura Modular

O backend deve ser dividido por domínio.

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── profiles/
│   ├── creators/
│   ├── sellers/
│   ├── tiktok/
│   ├── products/
│   ├── affiliations/
│   ├── campaigns/
│   ├── content/
│   ├── orders/
│   ├── commissions/
│   ├── analytics/
│   ├── matching/
│   ├── recommendations/
│   ├── notifications/
│   ├── billing/
│   └── ai/
│
├── jobs/
├── shared/
├── database/
└── infrastructure/
```

Cada módulo deve possuir responsabilidade clara.

---

# 9. Identity Domain

Responsável pela identidade da conta.

## User

```text
User
- id
- email
- password_hash
- name
- avatar_url
- status
- created_at
- updated_at
```

## Profile

Representa a atuação do usuário dentro da plataforma.

```text
Profile
- id
- user_id
- type
- display_name
- status
- created_at
- updated_at
```

Tipos:

```text
CREATOR
SELLER
```

Um User pode possuir múltiplos Profiles.

---

# 10. Creator Domain

Responsável pelas informações específicas do Creator.

## CreatorProfile

```text
CreatorProfile
- id
- profile_id
- bio
- niche
- followers_count
- engagement_rate
- average_views
- audience_data
- creator_score
- created_at
- updated_at
```

Dados de audiência devem ser armazenados de maneira flexível porque a disponibilidade real dependerá das APIs e permissões do TikTok.

---

# 11. Seller Domain

## SellerProfile

```text
SellerProfile
- id
- profile_id
- company_name
- document
- business_type
- seller_score
- created_at
- updated_at
```

---

# 12. External Accounts

As contas externas devem ser separadas dos perfis internos.

Isso é importante para não acoplar o sistema diretamente ao TikTok.

## ExternalAccount

```text
ExternalAccount
- id
- profile_id
- provider
- provider_account_id
- access_token_encrypted
- refresh_token_encrypted
- token_expires_at
- scopes
- status
- metadata
- created_at
- updated_at
```

Provider inicialmente:

```text
TIKTOK
```

Futuramente:

```text
INSTAGRAM
YOUTUBE
OTHER
```

---

# 13. Integration Layer

Nunca espalhar chamadas da API do TikTok pelo código inteiro.

Criar uma camada de abstração.

```text
Integration Layer
│
├── TikTok
│   ├── Authentication
│   ├── Products
│   ├── Orders
│   ├── Creators
│   ├── Affiliations
│   ├── Content
│   ├── Analytics
│   └── Webhooks
│
└── Future Integrations
```

A aplicação conversa com uma interface interna.

Exemplo conceitual:

```text
TikTokIntegrationService
```

A implementação específica fica isolada.

Isso permite trocar ou adicionar provedores sem contaminar o domínio principal.

---

# 14. Regra Crítica: TikTok é uma fonte externa

O banco da plataforma não deve simplesmente assumir que os dados do TikTok são a verdade interna absoluta.

Devemos armazenar:

- identificador externo;
- origem;
- data de sincronização;
- última atualização;
- estado da sincronização.

Exemplo:

```text
external_product_id
external_creator_id
external_order_id
external_campaign_id
```

Sempre que possível, manter:

```text
source
source_id
synced_at
```

---

# 15. Product Domain

Produto é uma entidade central.

## Product

```text
Product
- id
- seller_profile_id
- external_product_id
- name
- description
- category
- price
- currency
- stock_quantity
- status
- image_url
- metadata
- created_at
- updated_at
```

O produto pertence ao Seller.

---

# 16. Product Economics

A plataforma precisa armazenar informações econômicas suficientes para calcular rentabilidade.

## ProductEconomics

```text
ProductEconomics
- id
- product_id
- product_cost
- shipping_cost
- platform_fee
- operational_cost
- minimum_margin
- target_margin
- created_at
- updated_at
```

O Seller fornece os custos internos.

O TikTok fornece, quando disponível, as informações relativas à operação da plataforma.

O sistema calcula:

```text
Receita
-
Custos
-
Taxas
-
Comissão
=
Lucro estimado
```

---

# 17. Affiliate / Affiliation Domain

Uma relação entre Creator e Product.

## Affiliation

```text
Affiliation
- id
- creator_profile_id
- product_id
- external_affiliation_id
- commission_rate
- status
- started_at
- ended_at
- created_at
- updated_at
```

Status:

```text
PENDING
ACTIVE
PAUSED
ENDED
REJECTED
```

Essa entidade é importante porque:

```text
Creator
   ↓
Affiliation
   ↓
Product
```

---

# 18. Campaign Domain

Campaign representa uma iniciativa comercial criada pelo Seller.

## Campaign

```text
Campaign
- id
- seller_profile_id
- name
- description
- status
- start_at
- end_at
- commission_rate
- target_sales
- budget
- created_at
- updated_at
```

Uma campanha pode envolver:

- um ou vários produtos;
- um ou vários creators;
- regras específicas;
- incentivos;
- metas.

---

# 19. Campaign Products

```text
CampaignProduct
- id
- campaign_id
- product_id
- commission_rate
- created_at
```

---

# 20. Campaign Creators

```text
CampaignCreator
- id
- campaign_id
- creator_profile_id
- status
- invited_at
- accepted_at
- rejected_at
- created_at
```

Isso permite:

```text
Campaign
├── Products
└── Creators
```

---

# 21. Creator Discovery

Esse é um dos principais módulos do produto.

O Creator precisa conseguir descobrir:

> "Quais produtos devo vender?"

O Seller precisa conseguir descobrir:

> "Quais creators devo convidar?"

O mesmo motor de matching alimenta os dois lados.

---

# 22. Matching Engine

O Matching Engine calcula compatibilidade entre:

```text
Creator
+
Product
```

ou:

```text
Seller
+
Creator
```

Variáveis possíveis:

- nicho;
- categoria;
- audiência;
- interesses;
- histórico;
- conteúdo;
- performance;
- GMV;
- conversão;
- ticket;
- comissão;
- afinidade;
- tendência;
- localização;
- disponibilidade;
- performance histórica.

---

# 23. Creator → Product Score

Exemplo:

```text
ProductMatchScore

NicheFit              25%
AudienceFit           20%
HistoricalPerformance 20%
ProductDemand         15%
CommissionAttraction  10%
ContentFit             5%
Trend                   5%
```

Resultado:

```text
Product X

Match Score: 94/100
```

O score deve ser explicável.

Nunca mostrar apenas:

> "94%"

Mostrar:

```text
94% de compatibilidade

✓ Nicho altamente compatível
✓ Público semelhante aos compradores
✓ Creators semelhantes vendem bem
✓ Comissão competitiva
✓ Produto em alta
```

---

# 24. Seller → Creator Score

No sentido inverso:

```text
CreatorMatchScore

ProductCategoryFit
AudienceFit
HistoricalSales
GMV
Conversion
Engagement
ContentSimilarity
Reliability
CommissionFit
```

Resultado:

```text
Creator X

Match Score: 92/100
```

---

# 25. Recommendation Engine

O Matching Engine responde:

> "Quem combina com quem?"

O Recommendation Engine responde:

> "O que você deveria fazer?"

Essa diferença é importante.

Exemplo:

```text
Creator:

"Você deveria testar estes 5 produtos."

Seller:

"Você deveria convidar estes 10 creators."

Creator:

"Produza mais conteúdo sobre Creatina X."

Seller:

"Aumente a comissão deste creator."

Seller:

"Impulsione este criativo."

Creator:

"Seu melhor formato é review."
```

---

# 26. Content Domain

O conteúdo é uma entidade importante para creators.

## Content

```text
Content
- id
- creator_profile_id
- external_content_id
- product_id
- campaign_id
- content_type
- title
- url
- views
- likes
- comments
- shares
- clicks
- orders
- gmv
- commission
- published_at
- metadata
- created_at
- updated_at
```

Os campos disponíveis dependerão das APIs/permissões reais.

Não assumir que todos estarão disponíveis.

---

# 27. Content Types

```text
VIDEO
LIVE
IMAGE
OTHER
```

---

# 28. Content Performance

Separar dados brutos de métricas calculadas quando possível.

Exemplo:

```text
ContentPerformance
- id
- content_id
- views
- clicks
- orders
- conversion_rate
- gmv
- commission
- engagement_rate
- roi
- recorded_at
```

Isso permite histórico temporal.

---

# 29. Order Domain

Pedido representa a venda.

## Order

```text
Order
- id
- seller_profile_id
- creator_profile_id
- product_id
- campaign_id
- external_order_id
- order_status
- payment_status
- fulfillment_status
- total_amount
- platform_fee
- creator_commission
- refund_amount
- net_revenue
- estimated_profit
- created_at
- updated_at
```

---

# 30. Order Items

Um pedido pode possuir múltiplos produtos.

```text
OrderItem
- id
- order_id
- product_id
- quantity
- unit_price
- discount
- total_amount
```

---

# 31. Commission Domain

A comissão não deve ser simplesmente:

```text
order.total * commission_rate
```

porque podem existir:

- descontos;
- cancelamentos;
- reembolsos;
- ajustes;
- regras específicas;
- diferenças entre comissão estimada e liquidada.

## Commission

```text
Commission
- id
- creator_profile_id
- order_id
- campaign_id
- rate
- estimated_amount
- final_amount
- status
- created_at
- updated_at
```

Status:

```text
ESTIMATED
PENDING
APPROVED
PAID
CANCELLED
ADJUSTED
```

---

# 32. Analytics Architecture

Analytics não deve depender exclusivamente de consultas gigantes diretamente nas tabelas transacionais.

Devemos ter uma camada de eventos.

## Event

```text
Event
- id
- profile_id
- event_type
- entity_type
- entity_id
- metadata
- occurred_at
```

Eventos possíveis:

```text
USER_CREATED
PROFILE_CREATED
TIKTOK_CONNECTED
PRODUCT_IMPORTED
PRODUCT_VIEWED
PRODUCT_FAVORITED
AFFILIATION_STARTED
AFFILIATION_APPROVED
CAMPAIGN_CREATED
CREATOR_INVITED
CREATOR_ACCEPTED
CONTENT_PUBLISHED
ORDER_CREATED
ORDER_COMPLETED
ORDER_CANCELLED
REFUND_CREATED
COMMISSION_CREATED
COMMISSION_PAID
```

---

# 33. Event-Driven Architecture

Sempre que possível:

```text
TikTok
  ↓
Webhook / Sync
  ↓
Integration Service
  ↓
Domain Event
  ↓
Queue
  ↓
Workers
  ↓
Database / Analytics
```

Exemplo:

```text
ORDER_CREATED
      ↓
Queue
      ↓
Order Worker
      ↓
Order
      ↓
Commission Worker
      ↓
Commission
      ↓
Analytics Worker
      ↓
Metrics
```

Isso evita processamento pesado dentro da requisição HTTP.

---

# 34. Jobs Assíncronos

Criar workers para:

- sincronizar produtos;
- sincronizar creators;
- sincronizar pedidos;
- atualizar métricas;
- processar conteúdo;
- recalcular scores;
- gerar recomendações;
- atualizar tendências;
- enviar notificações;
- processar IA.

Exemplo:

```text
jobs/
├── sync-products
├── sync-orders
├── sync-creators
├── sync-content
├── calculate-metrics
├── calculate-matches
├── generate-recommendations
└── send-notifications
```

---

# 35. Creator Dashboard

O Creator deve enxergar primeiro aquilo que aumenta sua capacidade de ganhar dinheiro.

## Home

```text
Olá, João.

Seu desempenho

GMV
R$4.820

Comissões
R$964

Pedidos
54

Produtos ativos
7
```

Depois:

```text
Oportunidades para você

1. Creatina X
2. Whey Y
3. Pré-treino Z
```

E:

```text
Recomendação

Seu conteúdo de creatina converte
2,8x melhor que sua média.

→ Produzir mais conteúdo
```

---

# 36. Creator Navigation

```text
Início
Produtos
Meus Produtos
Campanhas
Conteúdo
Desempenho
Comissões
IA
Perfil
Configurações
```

---

# 37. Creator Product Discovery

Tela principal:

```text
Produtos para você

[ Buscar ]

Filtros:

Categoria
Comissão
Preço
Demanda
Tendência
Compatibilidade
```

Cards devem apresentar:

```text
Produto
Preço
Comissão
Match
Demanda
Tendência
Potencial
```

---

# 38. Creator Product Detail

```text
Produto

Preço
R$89,90

Comissão
20%

Estimativa por venda
R$17,98

Compatibilidade
97%

Por que recomendamos?

✓ Seu nicho
✓ Seu público
✓ Histórico de creators semelhantes
✓ Demanda

[ AFILIAR-SE ]
```

---

# 39. Creator Content Assistant

Depois da afiliação:

```text
Como você quer divulgar?

[ Criar roteiro ]

[ Ideias de vídeos ]

[ Hooks ]

[ Analisar conteúdo ]

[ Ver conteúdos vencedores ]
```

A IA deve utilizar:

- produto;
- nicho;
- conteúdo anterior;
- performance;
- tendências;
- características do público.

---

# 40. Seller Dashboard

O Seller precisa enxergar dinheiro.

## Home

```text
GMV
R$18.420

Lucro estimado
R$4.820

Pedidos
214

Creators ativos
17

ROI
3,8x
```

Depois:

```text
Melhores creators

Creator A
R$8.990 GMV

Creator B
R$4.120 GMV

Creator C
R$2.810 GMV
```

---

# 41. Seller Navigation

```text
Início
Produtos
Creators
Campanhas
Conteúdo
Pedidos
Vendas
Analytics
Comissões
IA
Configurações
```

---

# 42. Seller Product Management

O Seller não deveria precisar cadastrar tudo manualmente se a integração permitir sincronização.

Fluxo:

```text
TikTok Shop
     ↓
Sincronizar
     ↓
Produtos
```

O sistema importa:

- produto;
- preço;
- estoque;
- imagens;
- categoria;
- identificadores;
- dados disponíveis.

---

# 43. Seller Product Economics

Página:

```text
Creatina X

Preço
R$89,90

Custo
R$30

Taxas estimadas
R$...

Frete
R$...

Comissão
R$...

Lucro estimado
R$...

Margem
...
```

Depois:

```text
Comissão recomendada

10% → margem X
15% → margem X
20% → margem X
25% → margem X
```

---

# 44. Seller Creator Discovery

```text
Encontre creators

[ Buscar ]

Filtros:

Nicho
Seguidores
Views
Engajamento
GMV
Conversão
Categoria
Localização
Performance
```

Resultado:

```text
Creator A

Match: 94%

Fitness
82k seguidores

GMV:
R$31.000

Suplementos:
Alta performance

[ Convidar ]
```

---

# 45. Seller Campaign Management

```text
Criar campanha

Nome:
Creatina Agosto

Produto:
Creatina X

Comissão:
20%

Objetivo:
500 vendas

Creators:
Selecionar
```

Depois:

```text
Campanha

GMV
R$18.420

Pedidos
214

Creators
17

ROI
3,8x
```

---

# 46. Matching Marketplace

O coração da plataforma é a interseção:

```text
                 PRODUCTS
                     │
                     │
              MATCHING ENGINE
                     │
                     │
                 CREATORS
```

Mas o matching não deve ser simplesmente:

```text
categoria = categoria
```

Deve considerar performance real.

Exemplo:

Creator:

```text
Fitness
50k seguidores
```

Produto:

```text
Suplemento
```

Match superficial:

```text
80%
```

Mas:

Creator:

```text
Fitness
50k seguidores
```

Histórico:

```text
0 vendas em suplementos
```

Match real:

```text
55%
```

Outro creator:

```text
25k seguidores
```

Histórico:

```text
R$120k GMV em suplementos
```

Match:

```text
96%
```

O sistema deve privilegiar **capacidade comercial**, não vaidade.

---

# 47. Recommendation Engine

Exemplos de recomendações para Creator:

```text
Você vende melhor produtos de até R$120.

Você deveria testar:

1. Creatina X
2. Whey Y
3. Pré-treino Z
```

Para Seller:

```text
Seu melhor creator é Creator A.

Encontramos 14 creators semelhantes.

5 possuem histórico comprovado em suplementos.

→ Convide estes 5 primeiro.
```

---

# 48. AI Layer

A IA não deve ser um chatbot isolado.

Ela deve estar conectada aos dados da plataforma.

## Creator

Pergunta:

> "O que eu deveria vender?"

A IA consulta:

- perfil;
- histórico;
- produtos;
- performance;
- tendências.

Resposta:

> "Teste estes produtos."

## Seller

Pergunta:

> "Quem eu deveria convidar?"

A IA consulta:

- produto;
- creators;
- histórico;
- performance.

Resposta:

> "Estes creators."

---

# 49. AI Use Cases

## Creator

- geração de hooks;
- geração de roteiros;
- ideias de conteúdo;
- análise de conteúdo;
- recomendação de produtos;
- previsão de potencial;
- análise de performance;
- recomendação de horários/formato quando os dados permitirem.

## Seller

- recomendação de creators;
- análise de campanha;
- recomendação de comissão;
- previsão de ROI;
- análise de produtos;
- identificação de creators vencedores;
- encontrar creators semelhantes;
- análise de criativos.

---

# 50. Notifications

Sistema de notificações baseado em eventos.

Creator:

```text
Você realizou sua primeira venda.

Seu vídeo de creatina está performando acima da média.

Encontramos 3 novos produtos para você.
```

Seller:

```text
Creator A gerou 12 vendas hoje.

Seu produto X está crescendo 31%.

Encontramos 7 creators semelhantes ao seu melhor creator.
```

---

# 51. Billing

A plataforma deve possuir billing independente do TikTok.

O TikTok processa as transações comerciais.

Nosso SaaS cobra pelo uso da plataforma.

## Creator Plans

Possível modelo:

```text
FREE
PRO
PREMIUM
```

Inicialmente, o Creator pode ter acesso gratuito limitado.

Objetivo:

> reduzir fricção de aquisição.

---

# 52. Seller Plans

Possível:

```text
START
PRO
SCALE
```

Critérios:

- número de creators;
- número de campanhas;
- analytics;
- IA;
- automações;
- volume de dados.

---

# 53. Monetização Estratégica

A plataforma possui dois lados monetizáveis.

```text
CREATOR
   │
   └── Subscription

SELLER
   │
   └── Subscription
```

Futuramente:

```text
Seller
   │
   └── Premium Creator Discovery
```

e eventualmente:

```text
Creator
   │
   └── Premium AI / Analytics
```

---

# 54. Network Effect

Esse é um dos principais ativos estratégicos.

Quanto mais creators:

```text
mais dados de performance
```

Quanto mais sellers:

```text
mais produtos
```

Quanto mais produtos:

```text
mais oportunidades
```

Quanto mais oportunidades:

```text
mais creators
```

Quanto mais vendas:

```text
mais dados
```

E mais dados:

```text
melhor matching
```

O loop:

```text
Creators
   ↓
Produtos
   ↓
Afiliações
   ↓
Conteúdo
   ↓
Vendas
   ↓
Performance Data
   ↓
Better Matching
   ↓
Mais Creators + Sellers
```

---

# 55. Core Competitive Advantage

O maior ativo da plataforma não deve ser a interface.

Deve ser o **grafo de Creator Commerce**.

Conceitualmente:

```text
Creator
   │
   ├── produz → Content
   │
   ├── promove → Product
   │
   ├── pertence → Niche
   │
   ├── possui → Audience
   │
   └── gera → Order

Seller
   │
   ├── possui → Product
   │
   ├── cria → Campaign
   │
   └── trabalha com → Creator

Product
   │
   ├── vendido por → Creator
   ├── pertence a → Seller
   └── gera → Order
```

Com o tempo, o sistema aprende:

```text
quem vende
o quê
para quem
com qual conteúdo
com qual comissão
com qual resultado
```

---

# 56. Data Model Simplificado

```text
User
 │
 └── Profile
       │
       ├── CreatorProfile
       │      │
       │      ├── ExternalAccount
       │      ├── Content
       │      ├── Affiliation
       │      └── Commission
       │
       └── SellerProfile
              │
              ├── ExternalAccount
              ├── Product
              └── Campaign
                     │
                     ├── CampaignProduct
                     └── CampaignCreator

Product
   │
   ├── ProductEconomics
   ├── Affiliation
   ├── CampaignProduct
   └── OrderItem

Creator
   │
   ├── Affiliation
   ├── CampaignCreator
   ├── Content
   └── Commission

Order
   │
   ├── OrderItem
   └── Commission
```

---

# 57. Segurança

Dados sensíveis:

- tokens OAuth;
- refresh tokens;
- documentos;
- informações financeiras.

Nunca armazenar tokens em texto puro.

Usar:

```text
Encryption at Rest
```

e controle de acesso.

Cada requisição deve validar:

```text
User
↓
Profile
↓
Resource
```

Nunca confiar apenas no ID enviado pelo frontend.

---

# 58. Multi-Tenant

A plataforma será multi-tenant.

Todos os dados precisam respeitar isolamento lógico.

Exemplo:

```text
User A
 └── Seller Profile A
       └── Product A

User B
 └── Seller Profile B
       └── Product B
```

User B nunca pode acessar Product A.

O backend deve validar ownership/permissões em todas as operações.

---

# 59. API Architecture

Estrutura conceitual:

```text
/api
├── auth
├── users
├── profiles
├── creators
├── sellers
├── products
├── affiliations
├── campaigns
├── content
├── orders
├── commissions
├── analytics
├── matching
├── recommendations
├── ai
├── notifications
├── billing
└── integrations
    └── tiktok
```

---

# 60. API Principle

O frontend nunca deve chamar diretamente APIs sensíveis do TikTok utilizando tokens privados.

Fluxo:

```text
Frontend
   ↓
Backend
   ↓
Integration Layer
   ↓
TikTok
```

---

# 61. Synchronization

A plataforma precisa ter dois mecanismos.

## Webhooks

Quando disponíveis:

```text
TikTok
   ↓
Webhook
   ↓
Backend
```

## Polling / Sync

Para dados que não possuem webhook:

```text
Cron
 ↓
Sync Job
 ↓
TikTok API
 ↓
Database
```

---

# 62. Idempotência

Toda sincronização precisa ser idempotente.

Exemplo:

Se o mesmo pedido chegar duas vezes:

```text
ORDER_CREATED
ORDER_CREATED
```

o sistema não pode criar duas vendas.

Utilizar identificadores externos únicos.

Exemplo:

```text
external_order_id
```

com constraint apropriada.

---

# 63. Estados Externos

Não assumir que os estados do TikTok serão iguais aos estados internos.

Criar uma camada de normalização.

Exemplo:

```text
TikTok Status
     ↓
Normalizer
     ↓
Internal OrderStatus
```

Isso facilita futuras integrações.

---

# 64. Observabilidade

Desde o MVP:

- logs estruturados;
- error tracking;
- métricas;
- health checks;
- monitoramento de jobs;
- monitoramento de integrações;
- auditoria de sincronização.

Principalmente:

```text
TikTok API
```

porque uma falha externa não pode parecer uma falha interna.

---

# 65. Audit Log

Registrar ações importantes.

```text
AuditLog
- id
- user_id
- profile_id
- action
- entity_type
- entity_id
- metadata
- created_at
```

Exemplos:

```text
CAMPAIGN_CREATED
CAMPAIGN_UPDATED
CREATOR_INVITED
COMMISSION_CHANGED
PRODUCT_IMPORTED
TIKTOK_CONNECTED
```

---

# 66. MVP — O que construir primeiro

Não construir tudo.

O MVP deve validar o principal loop.

## Creator MVP

```text
Cadastro
↓
Escolher Creator
↓
Conectar TikTok
↓
Perfil
↓
Descobrir produtos
↓
Ver produto
↓
Afiliação
↓
Acompanhar vendas/comissões
```

## Seller MVP

```text
Cadastro
↓
Escolher Seller
↓
Conectar TikTok Shop
↓
Importar produtos
↓
Configurar comissão
↓
Ver creators
↓
Convidar creator
↓
Acompanhar vendas
```

---

# 67. MVP Core

Prioridade:

### P0

- Auth
- User
- Profile
- Creator Profile
- Seller Profile
- TikTok OAuth
- Product Sync
- Creator/Product Discovery
- Affiliation
- Campaign
- Creator/Seller Matching básico
- Orders
- Commission
- Dashboard básico

### P1

- AI recommendations
- Content analytics
- Advanced matching
- Notifications
- Campaign analytics
- Product economics

### P2

- AI Content Assistant
- Advanced prediction
- Automated creator outreach
- Advanced seller analytics
- Advanced creator analytics
- Automated campaign optimization

---

# 68. O que NÃO construir no MVP

Não construir inicialmente:

- checkout próprio;
- sistema de pagamentos próprio;
- ERP;
- logística própria;
- marketplace financeiro;
- CRM gigante;
- editor de vídeo;
- rede social;
- sistema complexo de chat;
- dezenas de integrações;
- IA extremamente sofisticada.

O TikTok já resolve grande parte disso.

Nosso produto deve resolver:

> **descoberta + matching + inteligência + otimização.**

---

# 69. Creator First Launch

Apesar da arquitetura suportar os dois lados, a aquisição inicial pode priorizar creators.

Funil:

```text
TikTok
 ↓
Creator
 ↓
Cadastro gratuito
 ↓
Conectar TikTok
 ↓
Encontrar produtos
 ↓
Afiliação
 ↓
Primeira venda
 ↓
Primeira comissão
 ↓
Retenção
 ↓
Plano pago
```

O objetivo principal do onboarding deve ser:

> **levar o Creator à primeira oportunidade comercial o mais rápido possível.**

---

# 70. Seller Launch

Depois:

```text
Seller
 ↓
Conecta TikTok Shop
 ↓
Importa produtos
 ↓
Configura comissão
 ↓
Encontra creators
 ↓
Campanha
 ↓
Primeiras vendas
 ↓
ROI
 ↓
Retenção
```

---

# 71. Métricas do Produto

## Creator

Principais métricas:

```text
Creators cadastrados
Creators conectados
Creators ativos
Produtos visualizados
Afiliações
Conteúdos publicados
GMV
Pedidos
Comissões
Creators com primeira venda
Tempo até primeira venda
```

### North Star Metric

Uma candidata:

> **Creators ativos gerando vendas.**

Não apenas usuários cadastrados.

---

# 72. Seller Metrics

```text
Sellers cadastrados
Sellers conectados
Produtos ativos
Campanhas
Creators convidados
Creators ativos
Pedidos
GMV
Lucro
ROI
```

### North Star Metric

Uma candidata:

> **GMV gerado por creators ativos.**

---

# 73. Principal Funil do Creator

```text
Cadastro
   ↓
TikTok conectado
   ↓
Perfil analisado
   ↓
Produto visualizado
   ↓
Produto afiliado
   ↓
Conteúdo publicado
   ↓
Primeiro clique
   ↓
Primeira venda
   ↓
Primeira comissão
   ↓
Segunda venda
   ↓
Creator retido
```

O gargalo mais importante inicialmente provavelmente será:

```text
Cadastro → Primeira venda
```

---

# 74. Principal Funil do Seller

```text
Cadastro
   ↓
TikTok Shop conectado
   ↓
Produtos importados
   ↓
Campanha criada
   ↓
Creator convidado
   ↓
Creator aceitou
   ↓
Conteúdo publicado
   ↓
Primeira venda
   ↓
ROI positivo
   ↓
Seller retido
```

---

# 75. Produto como Marketplace de Dois Lados

A arquitetura deve permitir futuramente:

```text
Creators
     ↕
Matching
     ↕
Sellers
```

Mas não necessariamente assumir que toda relação será uma campanha.

Um Creator pode descobrir um produto organicamente.

Um Seller pode procurar um Creator diretamente.

Uma campanha pode existir ou não.

Por isso:

```text
Affiliation
```

e:

```text
Campaign
```

devem ser entidades diferentes.

---

# 76. Regra de Negócio Importante

Não misturar:

### Afiliação

> Creator está habilitado a promover um produto.

com:

### Campanha

> Seller criou uma iniciativa comercial envolvendo produto(s) e creator(s).

Isso evita problemas futuros no modelo.

---

# 77. Recommendation Loop

O sistema deve evoluir:

```text
Recommendation
      ↓
Creator action
      ↓
Content
      ↓
Sale
      ↓
Performance
      ↓
Feedback
      ↓
Better recommendation
```

E no Seller:

```text
Creator recommendation
      ↓
Invitation
      ↓
Content
      ↓
Sale
      ↓
ROI
      ↓
Feedback
      ↓
Better creator recommendation
```

Esse feedback loop é fundamental.

---

# 78. Estratégia de Dados

O sistema deve diferenciar:

### Dados brutos

Vindos do TikTok.

### Dados normalizados

Padronizados pelo nosso backend.

### Métricas calculadas

Exemplo:

```text
conversion_rate
roi
creator_score
product_score
match_score
```

### Insights

Exemplo:

```text
"Creator A possui performance acima da média."
```

### Recomendações

Exemplo:

```text
"Convide Creator B."
```

Arquiteturalmente:

```text
RAW DATA
   ↓
NORMALIZATION
   ↓
METRICS
   ↓
INSIGHTS
   ↓
RECOMMENDATIONS
```

---

# 79. Regra de Ouro da IA

A IA nunca deve inventar uma métrica.

Se o sistema não possui:

```text
conversion_rate
```

não afirmar:

> "Sua conversão é 4,8%."

Pode afirmar:

> "Não temos dados suficientes para calcular sua conversão."

Ou:

> "Estimativa baseada nos dados disponíveis."

Toda métrica deve ter:

```text
source
confidence
calculation_method
```

quando aplicável.

---

# 80. Integração TikTok — Ponto Crítico

Antes de implementar qualquer funcionalidade dependente do TikTok, validar:

- APIs disponíveis;
- APIs específicas para Brasil;
- OAuth;
- scopes;
- permissões;
- acesso a produtos;
- acesso a creators;
- acesso a afiliados;
- acesso a pedidos;
- acesso a comissões;
- acesso a conteúdo;
- acesso a analytics;
- webhooks;
- limites de API;
- políticas de uso;
- requisitos de aprovação.

Não implementar uma funcionalidade assumindo que a informação está disponível.

Arquitetura deve suportar:

```text
AVAILABLE
INFERRED
UNAVAILABLE
```

---

# 81. Integration Capability Matrix

Criar internamente uma matriz:

| Dado | TikTok fornece? | API | Webhook | Inferência |
|---|---|---|---|---|
| Produto | A validar | A validar | A validar | Não |
| Estoque | A validar | A validar | A validar | Não |
| Pedido | A validar | A validar | A validar | Não |
| Creator | A validar | A validar | A validar | Parcial |
| Comissão | A validar | A validar | A validar | Não |
| Conteúdo | A validar | A validar | A validar | Parcial |
| GMV | A validar | A validar | A validar | Parcial |
| Performance | A validar | A validar | A validar | Sim |
| Matching | Nosso | Nosso | Nosso | Sim |

Essa matriz deve ser fechada **antes do desenvolvimento das features dependentes**.

---

# 82. Arquitetura de Deploy

Inicialmente:

```text
                    Internet
                       │
                       ▼
                    CDN
                       │
                       ▼
                 Next.js App
                       │
              ┌────────┴────────┐
              │                 │
           API/Backend       Frontend
              │
      ┌───────┼────────┐
      │       │        │
 PostgreSQL Redis   Object Storage
      │       │
      │     Queue
      │       │
      │    Workers
      │
      └──── Integration
              │
            TikTok
```

---

# 83. Escalabilidade

Não começar com microservices.

Começar com:

```text
Modular Monolith
```

Estruturado por domínio.

Isso permite:

- desenvolvimento rápido;
- deploy simples;
- menor custo;
- menor complexidade;
- facilidade de debugging.

Quando necessário:

```text
Modular Monolith
      ↓
Extract Workers
      ↓
Extract Services
```

---

# 84. Possível evolução

### Fase 1

```text
Next.js
+
PostgreSQL
+
Redis
+
Workers
```

### Fase 2

Separar:

```text
Integration Service
Analytics Service
AI Service
```

### Fase 3

Se volume justificar:

```text
API Gateway
│
├── Identity Service
├── Commerce Service
├── Matching Service
├── Analytics Service
├── AI Service
└── Integration Services
```

Não fazer isso antes de existir necessidade real.

---

# 85. Segurança de OAuth

Fluxo:

```text
Creator/Seller
      ↓
Connect TikTok
      ↓
TikTok OAuth
      ↓
Authorization
      ↓
Callback
      ↓
Backend
      ↓
Encrypted Token Storage
```

Nunca expor:

```text
access_token
refresh_token
```

ao frontend.

---

# 86. Filosofia do Produto

Toda funcionalidade deve responder:

> **Qual decisão ela ajuda o usuário a tomar?**

Exemplos:

### Dashboard

Não:

> "Aqui estão seus dados."

Sim:

> "Aqui está o que está funcionando."

### Analytics

Não:

> "Você teve 10.000 views."

Sim:

> "Este formato gera 2,4x mais vendas."

### Creator Discovery

Não:

> "Aqui estão 500 creators."

Sim:

> "Estes 10 creators são os melhores candidatos."

### Product Discovery

Não:

> "Aqui estão 10.000 produtos."

Sim:

> "Estes 5 produtos têm maior potencial para você."

---

# 87. Visão Final

A plataforma deve evoluir para:

```text
                    CREATOR COMMERCE OS
                            │
             ┌──────────────┴──────────────┐
             │                             │
          CREATOR                        SELLER
             │                             │
      Descobrir produtos            Descobrir creators
             │                             │
      Afiliar-se                      Criar campanhas
             │                             │
      Criar conteúdo                 Ativar creators
             │                             │
          Vender                         Vender
             │                             │
      Ganhar comissão                 Gerar GMV
             │                             │
             └──────────────┬──────────────┘
                            │
                     DATA NETWORK
                            │
                     MATCHING ENGINE
                            │
                    RECOMMENDATION
                            │
                           AI
```

O produto começa como uma ferramenta.

Com dados suficientes, transforma-se em uma **rede inteligente de Creator Commerce**.

---

# 88. Ordem Recomendada de Desenvolvimento

## Fase 0 — Discovery Técnico

Antes de codificar:

1. Mapear APIs TikTok.
2. Validar OAuth.
3. Validar permissões.
4. Validar dados de Creator.
5. Validar dados de Seller.
6. Validar produtos.
7. Validar afiliação.
8. Validar pedidos.
9. Validar comissões.
10. Validar analytics.
11. Validar webhooks.
12. Validar limites.

Resultado:

```text
TikTok Capability Matrix
```

---

## Fase 1 — Foundation

Construir:

```text
Auth
Users
Profiles
Roles
Permissions
External Accounts
OAuth
```

---

## Fase 2 — Creator

```text
Creator Profile
TikTok Connection
Product Discovery
Product Detail
Affiliation
Basic Dashboard
Commission Tracking
```

Objetivo:

> Creator consegue encontrar e começar a promover produtos.

---

## Fase 3 — Seller

```text
Seller Profile
TikTok Shop Connection
Product Sync
Product Economics
Creator Discovery
Campaigns
Creator Invitations
Basic Dashboard
```

Objetivo:

> Seller consegue encontrar creators e ativá-los.

---

## Fase 4 — Commerce Data

```text
Orders
Order Items
Commissions
Content
Performance
Events
Webhooks
Synchronization
```

Objetivo:

> Ter o ciclo completo de dados.

---

## Fase 5 — Matching

```text
Creator → Product
Seller → Creator
```

Primeiro baseado em regras.

Depois:

```text
Machine Learning
```

---

## Fase 6 — Intelligence

```text
Recommendations
Insights
Alerts
Performance Analysis
AI Assistant
```

---

## Fase 7 — Optimization

```text
Creator Optimization
Seller Optimization
Campaign Optimization
Content Optimization
Commission Optimization
```

---

# 89. MVP Final

O MVP não precisa ser enorme.

Ele precisa conseguir realizar:

```text
                   CREATOR
                      │
                 Criar conta
                      ↓
                Conectar TikTok
                      ↓
               Ver produtos
                      ↓
                  Afiliar
                      ↓
                Gerar venda
                      ↓
                 Ver comissão


                   SELLER
                      │
                 Criar conta
                      ↓
             Conectar TikTok Shop
                      ↓
              Importar produto
                      ↓
              Ver creators
                      ↓
             Convidar creator
                      ↓
                 Gerar venda
                      ↓
                Ver resultado
```

Se esse loop funcionar, existe produto.

O resto é expansão.

---

# 90. Regra Estratégica Final

O TikTok Shop deve ser tratado como:

```text
TRANSACTION LAYER
```

Nossa plataforma deve ser:

```text
DISCOVERY
+
MATCHING
+
INTELLIGENCE
+
OPTIMIZATION
```

O objetivo não é competir com o TikTok.

O objetivo é fazer o usuário pensar:

> **"Eu consigo ganhar muito mais dinheiro usando o TikTok Shop através dessa plataforma."**

E o Seller:

> **"Eu consigo vender muito mais através de creators usando essa plataforma."**

Essa é a tese central do produto.