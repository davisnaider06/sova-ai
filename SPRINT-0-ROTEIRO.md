# Sprint 0 — Roteiro de campo

> Complementa o `SPRINT-0-TIKTOK.md`. Aquele é **o que sabemos**; este é
> **o que fazer, na ordem, com o navegador aberto**.
> Escrito em 12/08/2026.
>
> Regra de ouro: **os passos 1 a 3 são irreversíveis.** Do 4 em diante dá pra
> errar e refazer. Não pule a ordem.

---

## Passo 0 — Três decisões antes de abrir o navegador

Nenhuma delas se resolve clicando. Resolva no papel primeiro.

### 0.1 Qual CNPJ vai no cadastro

O Partner Center pede pessoa jurídica com documento. Precisa estar decidido
**qual** entidade é a dona do app, porque ela fica amarrada à conta.

Tenha em mãos antes de começar:

- [ ] CNPJ ativo (cartão CNPJ / comprovante de inscrição)
- [ ] Razão social e endereço exatamente como estão na Receita
- [ ] Documento do responsável legal (o nome tem que bater com o do cadastro)
- [ ] E-mail corporativo — **não** use o pessoal. Esse e-mail vira a identidade
      da conta de developer e aparece pra sellers depois

> Se ainda **não existe CNPJ**, isso é o bloqueio real do Sprint 0. Não tem
> contorno técnico. Os Sprints 2 e 3 seguem sem ele.

### 0.2 Business region + target market — **a escolha sem volta**

| Campo | Valor pra Sova | Por quê |
|---|---|---|
| Portal | `partner.tiktokshop.com` | o `.us.` é só pra empresa registrada nos EUA |
| Business region | Brasil | segue o CNPJ do passo 0.1 |
| Target market | BR | são lojas brasileiras que a Sova atende |

**Definida uma vez, sem edição depois.** Errar aqui = conta nova.

### 0.3 Custom App ou Public App

Decisão que não estava no levantamento anterior e aparece na criação do app:

| Tipo | O que é | Pra Sova |
|---|---|---|
| **Custom App** | integra um número limitado de lojas, sem listagem pública | ✅ **comece aqui** |
| **Public App** | vai pra App Store do TikTok Shop, exige review | depois |

Custom App **converte para Public depois** — essa é reversível, ao contrário
da região. Comece em Custom: destrava o desenvolvimento sem entrar na fila de
review.

---

## Passo 1 — Criar a conta de developer

1. Abrir `https://partner.tiktokshop.com` — **confira que não tem `.us.` na
   URL** antes de clicar em qualquer coisa
2. Registrar com o e-mail corporativo do passo 0.1
3. Escolher o perfil **App Developer** (não "Service Partner" nem "Agency")
4. Preencher os dados da empresa com o CNPJ

⚠️ Se em algum momento o formulário mostrar um seletor de país/região,
**pare e confirme que está Brasil** antes de avançar.

---

## Passo 2 — Criar o app

Menu lateral → **App & Service** → criar app.

Campos a preencher, e o valor:

- [ ] **Business region:** Brasil
- [ ] **Target market:** BR
- [ ] **App type:** Custom App
- [ ] **Business category:** a que descrever ferramenta de afiliados /
      creator marketing. Anote qual você escolheu — pode limitar scopes
- [ ] **Redirect URI:** `http://localhost:3000/api/auth/tiktok/callback`
      (e depois a de produção na Vercel; dá pra adicionar mais tarde)

Ao final você recebe **App Key** e **App Secret**. Guarde-os — vão pro
`.env.local`, nunca pro git. Me avise quando tiver e eu preparo as variáveis.

---

## Passo 3 — Criar a Development Shop

Ainda no Partner Center, procure **Development Shop** (ou "Test Shop").

É uma loja de mentira, com produtos e pedidos de mentira, pra validar o fluxo
sem depender de um cliente real. Sem ela, o Sprint 5 só testa em produção.

- [ ] Development Shop criada
- [ ] Anotado se ela é **BR** ou cai num mercado default (isso importa: loja de
      teste em mercado errado não valida os scopes do BR)

---

## Passo 4 — As perguntas a responder logado

São as 6 do `SPRINT-0-TIKTOK.md` §6, mais uma que a pesquisa de 12/08 levantou.
**Copie este bloco e vá preenchendo.**

### Pergunta 0 (nova) — o Brasil tem o programa de afiliados?

> **Por que entrou:** fontes públicas listam o *Affiliate Partner program* (TAP)
> como disponível em Indonésia, Malásia, Filipinas, Tailândia, Vietnã e Reino
> Unido — **sem o Brasil**. Isso é o programa de parceiros, que pode ser
> diferente das APIs de afiliado. Mas se as duas coisas andarem juntas, é o
> achado mais importante do Sprint 0 e derruba a premissa do Sprint 4.
>
> **Onde olhar:** a lista de APIs disponíveis pro seu app depois de criado, com
> target market BR. Se as famílias `Affiliate Seller` / `Affiliate Creator`
> aparecerem lá, está respondido.

```
R0: ____________________________________________
```

### Perguntas 1 a 6

```
R1 — Affiliate Seller API disponível em BR? (esp.: busca de creators)
____________________________________________

R2 — Affiliate Creator API disponível em BR?
____________________________________________

R3 — Quais scopes o app consegue pedir? Quais são automáticos e quais entram
     em fila de aprovação? (copiar a lista inteira, mesmo a parte óbvia)
____________________________________________

R4 — Quais eventos de webhook existem? Existe webhook de PEDIDO?
____________________________________________

R5 — Rate limit por app e por loja?
____________________________________________

R6 — Requisito de aprovação e prazo típico?
____________________________________________
```

---

## Passo 5 — Como me entregar as respostas

Três caminhos, do mais barato pro mais completo:

1. **Colar aqui no chat.** Preenche o bloco acima e cola. Funciona pra tudo
   menos a R3, que é uma tabela longa
2. **Print da tela.** Serve bem pra R3 e R5 — eu leio imagem
3. **Eu leio direto do navegador.** A doc do `/docv2` é renderizada por
   JavaScript e exige login — foi por isso que a pesquisa parou onde parou.
   Com a extensão do Claude no Chrome instalada e você logado no Partner
   Center, eu abro a doc e respondo as 7 perguntas sozinho, sem copy-paste.
   Instalação em `claude.ai/chrome` (hoje a extensão **não** está conectada
   nesta máquina — precisa instalar e reiniciar o Chrome)

O caminho 3 é o que fecha a Capability Matrix inteira, não só as 7 perguntas.

---

## O que eu faço enquanto isso

Nada aqui depende do TikTok — é o ponto inteiro da §4 do `DECISOES-E-PLANO.md`.

| Sprint | Conteúdo | Bloqueado pelo Sprint 0? |
|---|---|---|
| 2 | CRUD de `Product`, `ProductEconomics`, calculadora de comissão | não |
| 3 | `CreatorProfile`, product discovery, fluxo de `Affiliation` | não |
| 4 | Matching v1 | **parcialmente** — as R1/R2 definem se tem sinal `CONNECTED` |
| 5 | Integration Layer + adapter CSV | não (o TikTok entra como 2º adapter) |

Se o Sprint 0 travar (sem CNPJ, ou R0 negativa), o caminho é **Sprint 5 antes
do 4**: o adapter de CSV vira a fonte principal e o produto anda igual.

### Duas perguntas que me destravam agora, sem TikTok nenhum

- [ ] O dashboard atual é protótipo descartável, ou já foi mostrado/prometido
      pra alguém? (muda se eu reescrevo ou preservo as 13 páginas)
- [ ] Janela de atribuição em dias — sugestão inicial: **7**. Confirma?
