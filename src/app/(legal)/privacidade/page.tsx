import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Sova",
  description: "Que dados a Sova coleta, por que, com quem compartilha e como excluir.",
};

const ATUALIZADO_EM = "14 de agosto de 2026";

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-ink-muted">Última atualização: {ATUALIZADO_EM}</p>

      <p>
        A Sova é uma plataforma que ajuda creators a encontrar produtos para promover e sellers a
        encontrar creators para promovê-los. Esta política descreve quais dados tratamos, para quê,
        e o que você pode exigir de nós a qualquer momento.
      </p>
      <p>
        Ela vale para o site e para o aplicativo web da Sova. O controlador dos dados é a empresa
        responsável pela Sova, contatável em <a href="mailto:davisnaider06@gmail.com">davisnaider06@gmail.com</a>.
      </p>

      <h2>1. Dados que coletamos</h2>

      <p>
        <strong>Dados de cadastro.</strong> Nome, e-mail e foto de perfil, fornecidos por você ao
        criar a conta. A autenticação é operada pelo Clerk; nós não armazenamos sua senha.
      </p>

      <p>
        <strong>Dados da sua conta do TikTok — apenas se você conectá-la.</strong> A conexão é
        opcional, feita por você através do login oficial do TikTok, e você escolhe quais permissões
        conceder. Com a sua autorização, recebemos:
      </p>

      <table>
        <thead>
          <tr>
            <th>Permissão</th>
            <th>O que recebemos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>user.info.basic</code>
            </td>
            <td>Identificador da conta, nome de exibição e foto</td>
          </tr>
          <tr>
            <td>
              <code>user.info.profile</code>
            </td>
            <td>Nome de usuário, biografia, link do perfil e selo de verificação</td>
          </tr>
          <tr>
            <td>
              <code>user.info.stats</code>
            </td>
            <td>Números de seguidores, de quem você segue, de curtidas e de vídeos</td>
          </tr>
          <tr>
            <td>
              <code>video.list</code>
            </td>
            <td>
              Seus vídeos <strong>públicos</strong>: título, descrição, duração, capa, link e
              contadores de visualizações, curtidas, comentários e compartilhamentos
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        Todos esses dados são <strong>da sua própria conta</strong>. A Sova não coleta dados de
        terceiros, não acessa suas mensagens diretas, não vê conteúdo privado e não publica nada em
        seu nome.
      </p>

      <p>
        <strong>Dados de uso da plataforma.</strong> Produtos que você cadastra ou promove,
        afiliações, campanhas, pedidos importados e comissões — ou seja, o que você mesmo registra
        ao usar o produto.
      </p>

      <h2>2. Para que usamos</h2>

      <ul>
        <li>Mostrar a você o desempenho da sua própria conta e do seu próprio conteúdo.</li>
        <li>
          Recomendar produtos compatíveis com o seu público, e recomendar creators a sellers com
          base em compatibilidade de nicho e desempenho.
        </li>
        <li>Calcular comissões, margens e resultados das campanhas de que você participa.</li>
        <li>Operar a conta: autenticação, suporte, segurança e prevenção a abuso.</li>
      </ul>

      <p>
        <strong>Não vendemos seus dados.</strong> Não usamos seus dados para publicidade de
        terceiros e não os cedemos a corretores de dados.
      </p>

      <h2>3. Com quem compartilhamos</h2>

      <p>Somente com os provedores necessários para a plataforma funcionar:</p>

      <table>
        <thead>
          <tr>
            <th>Provedor</th>
            <th>Para quê</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clerk</td>
            <td>Autenticação e gestão de contas</td>
          </tr>
          <tr>
            <td>Neon</td>
            <td>Banco de dados</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Hospedagem da aplicação</td>
          </tr>
          <tr>
            <td>Anthropic</td>
            <td>
              Geração de roteiros e sugestões de conteúdo. Enviamos apenas dados do produto (nome,
              categoria, preço, comissão) — <strong>nunca</strong> seus dados pessoais nem os do seu
              público
            </td>
          </tr>
        </tbody>
      </table>

      <p>
        Também podemos divulgar dados quando exigido por lei ou ordem judicial. Nesses casos,
        avisaremos você sempre que for legalmente possível.
      </p>

      <h2>4. Segurança</h2>

      <p>
        Os tokens de acesso da sua conta do TikTok são guardados <strong>criptografados</strong> com
        AES-256-GCM e nunca são expostos ao navegador. O acesso aos dados é isolado por perfil: as
        consultas do produto só alcançam registros do perfil autenticado.
      </p>
      <p>
        Nenhum sistema é infalível. Se ocorrer um incidente que possa acarretar risco relevante a
        você, comunicaremos você e a autoridade competente conforme a LGPD.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>

      <p>
        Mantemos seus dados enquanto sua conta existir. Ao desconectar o TikTok, os tokens são
        apagados imediatamente e a autorização é revogada junto ao TikTok. Ao excluir a conta,
        removemos seus dados pessoais em até 30 dias, ressalvados registros que a lei obrigue a
        manter.
      </p>

      <h2>6. Seus direitos</h2>

      <p>
        Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode a qualquer momento pedir:
        confirmação de tratamento, acesso aos seus dados, correção, anonimização, portabilidade,
        eliminação, informação sobre compartilhamentos e revogação do consentimento.
      </p>
      <p>
        Para exercer qualquer um deles, escreva para{" "}
        <a href="mailto:davisnaider06@gmail.com">davisnaider06@gmail.com</a>. Respondemos em até 15 dias.
      </p>
      <p>
        A conexão com o TikTok é baseada no seu consentimento, e você pode retirá-lo sozinho a
        qualquer momento em <strong>Configurações → Desconectar</strong>, sem precisar falar
        conosco. Você também pode revogar o acesso diretamente nas configurações do seu TikTok.
      </p>

      <h2>7. Cookies</h2>

      <p>
        Usamos apenas cookies necessários: os de sessão, para manter você conectado, e um cookie
        temporário durante a autorização do TikTok, que existe para impedir ataques de falsificação
        de requisição. Não usamos cookies de publicidade nem de rastreamento entre sites.
      </p>

      <h2>8. Crianças e adolescentes</h2>

      <p>
        A Sova não se destina a menores de 18 anos e não coletamos intencionalmente dados de
        menores. Se identificarmos um cadastro nessa condição, a conta será removida.
      </p>

      <h2>9. Mudanças nesta política</h2>

      <p>
        Se alterarmos esta política de forma relevante, atualizaremos a data no topo e avisaremos
        pelo e-mail cadastrado antes de a mudança entrar em vigor.
      </p>

      <h2>10. Contato</h2>

      <p>
        Dúvidas sobre privacidade ou exercício de direitos:{" "}
        <a href="mailto:davisnaider06@gmail.com">davisnaider06@gmail.com</a>.
      </p>
    </>
  );
}
