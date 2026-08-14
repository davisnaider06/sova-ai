# Integração TikTok — conta do creator (Login Kit / Display API)

> Implementada em 13/08/2026. Complementa o `SAAS_TIKTOK_SHOP_CNPJ_OAUTH_IA.md`,
> que traz a pesquisa e as decisões; este documento traz o que existe no código.

---

## 1. O que esta integração é — e o que ela não é

São **duas superfícies diferentes** do TikTok, e confundi-las gera expectativa errada:

| | Esta integração | TikTok Shop |
|---|---|---|
| Produto | Login Kit + Display API | TikTok Shop Partner Center |
| Autoriza | o próprio creator, pela conta dele | o seller, pela loja dele |
| Entrega | perfil e vídeos públicos do creator | produtos, pedidos, GMV, afiliados |
| Estado | **implementada** (pendente de aprovação da app) | **não implementada** — depende do Partner Center |

**Nenhum scope desta integração dá venda, comissão ou GMV.** Análise de mercado,
tendências de categoria e faturamento de concorrente são dados do Shop e seguem
fora do alcance. Ver §12 do documento de pesquisa.

## 2. O que a integração destrava hoje

1. **Análise da conta do creator** — perfil, vídeos e métricas derivadas.
2. **Sinal `CONNECTED` no motor de matching.** É o efeito mais imediato: antes,
   toda métrica de creator era `DECLARED` com confiança 0,30 (número digitado no
   cadastro). Com a conta conectada, seguidores passam a valer 0,80 e o ranking
   de match muda de verdade — ver `src/lib/matching.ts`.

---

## 3. Configurar a aplicação no TikTok

1. Acesse **developers.tiktok.com** e crie uma aplicação.
2. Adicione o produto **Login Kit**.
3. Adicione o produto **TikTok API** (Display API), necessário para
   `/v2/user/info/` e `/v2/video/list/`.
4. Em Login Kit, cadastre a **Redirect URI**. Precisa bater exatamente com
   `TIKTOK_REDIRECT_URI`, incluindo esquema e barra final:
   - desenvolvimento: `http://localhost:3000/api/tiktok/callback`
   - produção: `https://SEU-DOMINIO/api/tiktok/callback`
5. Solicite os scopes da §4.
6. Copie **Client Key** e **Client Secret** para o `.env.local`.

### Variáveis de ambiente

```bash
TIKTOK_CLIENT_KEY="aw..."
TIKTOK_CLIENT_SECRET="..."
TIKTOK_REDIRECT_URI="http://localhost:3000/api/tiktok/callback"

# AES-256-GCM para os tokens. Gere com: openssl rand -base64 32
TOKEN_ENCRYPTION_KEY="..."
```

Sem `TOKEN_ENCRYPTION_KEY` o botão de conectar é bloqueado **antes** de o
usuário autorizar — gravar token de terceiro em claro não é opção. Trocar a
chave depois invalida os tokens guardados e força reconexão.

## 4. Scopes pedidos

Centralizados em `src/lib/tiktok/config.ts`; não há string de scope espalhada.

| Scope | Para quê |
|---|---|
| `user.info.basic` | open_id, avatar, display name |
| `user.info.profile` | bio, link do perfil, verificação, username |
| `user.info.stats` | seguidores, seguindo, curtidas, nº de vídeos |
| `video.list` | vídeos públicos do próprio usuário |

O usuário pode conceder menos do que pedimos. O código lida com isso: os campos
de perfil são montados a partir dos scopes **efetivamente concedidos**, porque
pedir um campo sem o scope correspondente derruba a chamada inteira.

## 5. Endpoints usados

Todos conferidos na documentação oficial, nenhum deduzido.

| Uso | Método e URL |
|---|---|
| Autorizar | `GET https://www.tiktok.com/v2/auth/authorize/` |
| Trocar code / renovar | `POST https://open.tiktokapis.com/v2/oauth/token/` |
| Revogar | `POST https://open.tiktokapis.com/v2/oauth/revoke/` |
| Perfil | `GET https://open.tiktokapis.com/v2/user/info/` |
| Vídeos | `POST https://open.tiktokapis.com/v2/video/list/` |

**PKCE não se aplica a web** — é exigido apenas para mobile e desktop. Aqui a
proteção é o `state` mais o client secret, que nunca sai do servidor.

Vidas úteis documentadas: **access token 24 horas**, **refresh token 365 dias**.
O refresh devolve um refresh token novo, e gravamos os dois — guardar só o
access faria a conexão morrer em um ano sem motivo aparente.

## 6. Arquitetura

```
src/lib/tiktok/
  config.ts       scopes, endpoints, env          (sem dependência do resto)
  crypto.ts       AES-256-GCM (node:crypto)
  oauth.ts        autorização, troca, refresh, revogação, state
  client.ts       HTTP + envelope de erro         (sem banco)
  profile.ts      /v2/user/info/
  videos.ts       /v2/video/list/ com paginação
  normalize.ts    resposta bruta → nosso modelo
  metrics.ts      métricas derivadas
  connection.ts   persistência, refresh, desconexão  (único a tocar banco)
  sync.ts         orquestra tudo
  state.ts        cookie httpOnly do CSRF

src/app/api/tiktok/callback/route.ts
src/app/dashboard/configuracoes/tiktok-actions.ts
src/app/dashboard/configuracoes/tiktok-card.tsx
```

Nada fora de `src/lib/tiktok/` chama a API do TikTok. Se o TikTok mudar um
endpoint, o estrago fica dentro deste módulo.

### Onde os dados são guardados

| Dado | Onde | Por quê |
|---|---|---|
| Conexão e tokens | `ExternalAccount` (já existia) | Modelado no Sprint 1 exatamente para isto. O matching já lê essa tabela para saber se a audiência é medida ou declarada; uma tabela paralela criaria duas verdades. |
| Vídeos | `TikTokVideo` (nova) | **Não** em `Content` — ver abaixo. |
| Seguidores e afins | `ProfileMetric` com `source=CONNECTED` | Série append-only com procedência. É o que alimenta a confiança do match. |
| Retrato do perfil | `ExternalAccount.metadata` | Username, avatar, bio — dado de vitrine, não de domínio. |

**Por que vídeo não vai para `Content`:** `Content.publishedAt` alimenta o
serviço de atribuição de comissões (`src/lib/attribution.ts`) — é ele que decide
de quem é a venda. Importar em massa os vídeos do creator, a maioria sem relação
com produto nenhum, colocaria vídeos irrelevantes como candidatos à atribuição e
**a comissão iria para a pessoa errada**. Quando um vídeo for reconhecido como
promoção de um produto, aí sim vira `Content` — por decisão explícita.

## 7. Segurança

- **Tokens cifrados em repouso** com AES-256-GCM. GCM é autenticado: adulterar o
  texto cifrado faz a decifragem falhar em vez de devolver lixo tratado como
  token. Formato `v1.<iv>.<tag>.<dados>`, com prefixo de versão para migração.
- **Client secret só no servidor.** Há teste garantindo que ele nunca entra na
  URL de autorização, que vai para o navegador.
- **Nenhum token cruza para o cliente.** A página de configurações não lê sequer
  o campo cifrado.
- **CSRF por `state`** em cookie httpOnly, de uso único, comparado em tempo
  constante.
- **O dono da conexão vem da sessão do servidor**, nunca da query string.
- **Uma conta TikTok só se liga a um perfil.** A segunda tentativa é recusada com
  mensagem clara, não com erro de constraint.

## 8. Como testar

```bash
# Unitários (não precisam de banco nem de credenciais)
npm test

# Banco: isolamento, conta duplicada, ciclo do token, desconexão
npx tsx --conditions=react-server scripts/test-tiktok.ts
```

Fluxo manual, depois de configurar as variáveis:

1. Entre como creator e vá em **Configurações → Integrações**
2. **Conectar TikTok** → autorize no TikTok → você volta para a mesma aba
3. **Sincronizar agora** → perfil e vídeos são coletados
4. Confira que `ProfileMetric` ganhou linhas com `source=CONNECTED`
5. **Desconectar** → tokens apagados, conexão marcada como revogada

## 9. Limitações conhecidas

- **Depende de aprovação da app no TikTok.** Login Kit e TikTok API precisam ser
  aprovados; sem isso o OAuth não completa. Nada aqui está marcado como
  disponível ao usuário final antes disso.
- **A sincronização roda dentro da requisição**, com teto de
  `SYNC_VIDEO_LIMIT` (60) vídeos. O modelo `Job` existe no schema mas nunca teve
  worker nem cron; quando houver fila, `syncConnection` vira o corpo do job e
  nada mais muda.
- **Métricas por vídeo são um retrato**, não série temporal. Cada sync sobrescreve
  os contadores e atualiza `fetchedAt`. Guardar o histórico exigiria uma tabela de
  série, que ainda não se justifica.
- **`coverImageUrl` expira em 6 horas** por política do TikTok. Guardamos por
  conveniência; nenhuma tela deve tratá-lo como permanente.
- **Só o que a Display API entrega.** Alcance, retenção, taxa de conclusão,
  origem do tráfego e dados demográficos **não** vêm nesta API — e por isso não
  são calculados em lugar nenhum. `metrics.ts` devolve `null` quando a amostra
  não sustenta a conclusão, em vez de exibir número que só parece informação.

## 10. O que ainda depende de aprovação do TikTok

| Funcionalidade | Estado |
|---|---|
| OAuth (conectar conta) | código pronto · **precisa de Login Kit aprovado** |
| Perfil (`/v2/user/info/`) | código pronto · **precisa de TikTok API aprovada** |
| Vídeos (`/v2/video/list/`) | código pronto · **precisa do scope `video.list` concedido** |
| Análise por IA sobre os vídeos | **não implementada** — depende de dados reais primeiro |
| Qualquer dado de TikTok Shop | **não implementada** — outra autorização, outro portal |

## 11. Fontes

- [Manage User Access Tokens](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [Login Kit for Web](https://developers.tiktok.com/doc/login-kit-web/)
- [Get User Info](https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info)
- [List Videos](https://developers.tiktok.com/doc/tiktok-api-v2-video-list)
- [Video Object](https://developers.tiktok.com/doc/tiktok-api-v2-video-object)
