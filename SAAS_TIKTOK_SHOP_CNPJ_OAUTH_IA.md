# SaaS TikTok Shop — CNPJ, OAuth e análise de contas TikTok

> Pesquisa realizada em 13/08/2026.
>
> Objetivo: registrar o que precisamos considerar para construir o SaaS sem depender de CNPJ no início, especialmente a funcionalidade de o usuário conectar a própria conta TikTok para análise pela IA.

## 1. Conclusão executiva

**Não precisamos de CNPJ simplesmente para desenvolver o SaaS ou implementar a arquitetura de conexão com o TikTok.**

A parte crítica não é o CNPJ do nosso SaaS, mas sim:

1. criar uma aplicação no TikTok for Developers;
2. obter aprovação para os produtos/APIs necessários;
3. solicitar os scopes corretos;
4. fazer o usuário autorizar o acesso via OAuth;
5. trabalhar somente com os dados que o TikTok efetivamente disponibilizar para a aplicação.

A documentação oficial atual do TikTok mostra que o fluxo de Display API utiliza Login Kit + autorização do usuário e scopes como `user.info.basic` e `video.list`. A própria documentação informa que a aplicação precisa ter aprovação para Login Kit e TikTok API antes de usar esse fluxo. 

## 2. O usuário poderá conectar a própria conta?

**Sim, esse é o fluxo correto.**

Não devemos pedir a senha do TikTok.

O fluxo deverá ser:

```text
Usuário
   |
   | Clicar em "Conectar TikTok"
   v
Nosso Frontend
   |
   v
TikTok OAuth / Login Kit
   |
   | Usuário faz login e autoriza
   v
TikTok
   |
   | authorization code
   v
Nosso Backend
   |
   | troca code por access token
   v
Tokens armazenados com segurança
   |
   v
APIs do TikTok
   |
   v
Dados autorizados
   |
   v
Motor de análise
   |
   v
IA
```

A documentação oficial descreve justamente a obtenção de authorization code e access token para utilização das Display APIs. 

## 3. O que podemos obter para analisar a conta?

### Perfil

A documentação de scopes do TikTok lista:

- `user.info.basic` — informações básicas do perfil;
- `user.info.profile` — informações adicionais, como bio, links e status de verificação;
- `user.info.stats` — estatísticas como curtidas, seguidores, seguindo e quantidade de vídeos.

Isso significa que a arquitetura pode ser preparada para coletar, conforme aprovação e autorização:

```text
Perfil
├── nome/display name
├── avatar
├── bio
├── link do perfil
├── verificação
├── seguidores
├── seguindo
├── curtidas
└── quantidade de vídeos
```

## 4. Vídeos do próprio usuário

O scope `video.list` permite ler os vídeos públicos do usuário.

A documentação atual do endpoint de consulta de vídeos informa campos como:

- ID;
- data de criação;
- descrição;
- duração;
- título;
- URL;
- visualizações;
- curtidas;
- comentários;
- compartilhamentos;
- informações de vídeo.

Isso é **muito importante para o nosso produto**, porque permite construir uma camada de inteligência sobre o histórico de conteúdo do usuário.

Exemplo:

```text
Conta TikTok
      |
      v
Últimos vídeos
      |
      v
Métricas
      |
      v
Normalização
      |
      v
Análise
      |
      v
IA
```

A IA poderia posteriormente responder coisas como:

- quais formatos tiveram melhor desempenho;
- quais vídeos estão acima/abaixo da média da conta;
- quais temas aparecem nos conteúdos de maior performance;
- relação entre duração e performance;
- frequência de publicação;
- padrões de conteúdo;
- oportunidades de novos conteúdos;
- sugestões de ofertas e criativos.

**Importante:** a IA só deve analisar aquilo que efetivamente recebemos da API ou de fontes que tenhamos autorização legítima para utilizar.

## 5. Um detalhe importante: Research API NÃO é o caminho do nosso SaaS

Durante a pesquisa apareceu uma API que parece extremamente poderosa: **Research API**.

Ela permite consultar dados públicos de contas e vídeos, incluindo métricas como:

- follower count;
- likes;
- video count;
- views;
- comments;
- shares;
- hashtags;
- descrição;
- duração;
- etc.

Porém, **não devemos basear nosso SaaS nessa API**.

O próprio TikTok informa que Research Tools são destinadas a pesquisa independente e possuem requisitos específicos de elegibilidade. Para aplicações comerciais, o TikTok informa explicitamente que creators, advertisers e commercial users não são elegíveis para Research Tools.

Portanto:

**Research API ≠ API principal do nosso SaaS.**

Nosso caminho deve ser:

**Login Kit + TikTok API/Display API + scopes autorizados pelo usuário + APIs específicas que o produto realmente precisar.**

## 6. CNPJ: o que isso muda?

Para o desenvolvimento inicial:

**CNPJ não é o bloqueio.**

Podemos desenvolver:

- frontend;
- backend;
- OAuth;
- banco de dados;
- armazenamento de tokens;
- integração com API;
- dashboard;
- análise;
- IA;
- CRM;
- sellers;
- creators;
- ofertas;
- analytics;
- arquitetura de pagamentos;
- integração com Hubla;
- etc.

O que pode bloquear ou limitar uma funcionalidade é a **aprovação do produto/API pelo TikTok**, e não simplesmente o fato de nosso SaaS ainda não possuir CNPJ.

Por isso, não devemos assumir:

> "Tenho CNPJ = tenho acesso a todas as APIs."

Isso é falso.

A aprovação e os scopes disponíveis são determinantes.

## 7. Arquitetura recomendada para não ficarmos presos ao TikTok

A integração deve ser isolada.

```text
                    NOSSO SAAS
                         |
              +----------+----------+
              |                     |
           Core SaaS            TikTok Module
              |                     |
              |              +------+------+
              |              |             |
              |           OAuth        API Client
              |              |             |
              |              +------+------+
              |                     |
              |                  TikTok
              |
              +-----------------------------+
              |
           AI Engine
              |
       Dados normalizados
```

Não devemos espalhar chamadas da API do TikTok pelo sistema inteiro.

Criar uma camada específica, por exemplo:

```text
src/
├── modules/
│   ├── auth/
│   ├── seller/
│   ├── creator/
│   ├── analytics/
│   ├── ai/
│   └── tiktok/
│       ├── oauth/
│       ├── client/
│       ├── profile/
│       ├── videos/
│       ├── metrics/
│       └── webhooks/
```

Assim, se o TikTok mudar uma API, scope ou endpoint, alteramos principalmente o módulo TikTok.

## 8. Banco de dados

Também não devemos armazenar apenas o access token.

A integração deve ter uma entidade própria para a conexão:

```text
tiktok_connection

id
user_id
tiktok_open_id
access_token
refresh_token
expires_at
scopes
status
created_at
updated_at
```

Os tokens devem ser tratados como credenciais sensíveis.

O client secret da aplicação também **nunca pode ficar no frontend**.

Ele deve permanecer exclusivamente no backend.

## 9. Fluxo de conexão

O UX pode ser:

```text
Dashboard
    |
    v
"Conectar TikTok"
    |
    v
Tela explicando o que será acessado
    |
    v
TikTok OAuth
    |
    v
Usuário autoriza
    |
    v
Callback do nosso backend
    |
    v
Troca authorization code
    |
    v
Salva conexão
    |
    v
Sincronização inicial
    |
    +---- Perfil
    |
    +---- Vídeos
    |
    +---- Métricas disponíveis
    |
    v
Processamento
    |
    v
IA gera análise
```

## 10. O que a IA deveria fazer inicialmente

Não recomendo começar tentando construir uma IA gigantesca.

O MVP deveria fazer:

### Análise do perfil

```text
- tamanho da audiência
- crescimento, quando disponível
- frequência de conteúdo
- posicionamento
- bio
- nicho
```

### Análise dos vídeos

```text
- visualizações
- curtidas
- comentários
- compartilhamentos
- duração
- descrição
- data
```

### Classificação

Criar uma classificação interna:

```text
performance_score
engagement_rate
content_type
topic
hook
format
duration_bucket
```

### Resultado para o usuário

Algo como:

```text
ANÁLISE DA SUA CONTA

Seu conteúdo de melhor desempenho possui:
- duração média de X segundos
- determinado padrão de abertura
- determinado tema
- determinado formato

Conteúdos desse grupo tiveram performance
X vezes superior à média da conta.

Oportunidade:
produzir mais conteúdos com o padrão X.
```

Isso é muito mais valioso do que simplesmente colocar um chatbot dentro do SaaS.

## 11. O que NÃO devemos prometer no MVP

Não devemos prometer:

- acesso irrestrito à conta;
- acesso a qualquer métrica existente no aplicativo TikTok;
- acesso a dados privados que a API não disponibiliza;
- análise de qualquer conta sem autorização quando a funcionalidade depender de dados autorizados;
- acesso à Research API como se fosse uma API comercial;
- automação de qualquer ação do TikTok sem verificar o scope/API correspondente.

## 12. TikTok Shop e a conta TikTok são módulos diferentes

Isso é importante para nossa arquitetura.

Temos pelo menos dois contextos:

```text
TikTok Account
        |
        +-- Perfil
        +-- Vídeos
        +-- Métricas
        +-- Conteúdo
        +-- IA

TikTok Shop
        |
        +-- Produtos
        +-- Pedidos
        +-- Vendas
        +-- Ofertas
        +-- Afiliados
        +-- Seller
```

Não devemos misturar os dois.

O usuário pode conectar uma conta TikTok para análise de conteúdo e, em outro fluxo, conectar/autorizar recursos relacionados ao TikTok Shop.

## 13. Estratégia para começar sem CNPJ

A estratégia mais segura para nosso estágio é:

### Fase 1 — Construção

```text
MVP
├── Auth
├── Seller
├── Creator
├── Dashboard
├── Banco
├── IA
├── TikTok OAuth
└── TikTok API
```

### Fase 2 — Validar acesso

Antes de desenvolver dezenas de funcionalidades dependentes do TikTok:

1. criar conta no TikTok for Developers;
2. criar aplicação;
3. verificar quais produtos estão disponíveis;
4. solicitar Login Kit;
5. solicitar TikTok API/Display API;
6. verificar os scopes disponíveis;
7. implementar OAuth;
8. conectar uma conta de teste;
9. confirmar exatamente quais dados conseguimos obter.

### Fase 3 — Construir em cima do que foi aprovado

Somente depois disso definimos exatamente:

```text
API disponível
      ↓
dados disponíveis
      ↓
modelo de dados
      ↓
features
      ↓
IA
```

Isso reduz muito o risco de construir uma funcionalidade que a API não permite.

## 14. Conclusão

A resposta para a nossa dúvida inicial é:

**Você pode começar o desenvolvimento do SaaS sem CNPJ.**

Para a funcionalidade:

> "Usuário conecta o TikTok e nossa IA analisa a conta"

o caminho técnico existe através do ecossistema oficial de APIs do TikTok, com OAuth, consentimento do usuário e scopes específicos.

A documentação atual confirma a existência de scopes para informações básicas, perfil, estatísticas e vídeos públicos. 

**O principal gargalo é aprovação da aplicação e disponibilidade dos scopes/APIs, não o CNPJ em si.**

Portanto, a decisão arquitetural correta agora é:

> **Construir o SaaS de forma independente da API do TikTok, encapsular toda a integração em um módulo próprio e validar as permissões oficiais antes de amarrar funcionalidades críticas a elas.**

### Fontes oficiais consultadas

- TikTok for Developers — Display API / Getting Started
- TikTok for Developers — API Scopes
- TikTok for Developers — Video Query
- TikTok for Developers — Research API
- TikTok for Developers — Research API FAQ
- TikTok for Developers — Research API Codebook
