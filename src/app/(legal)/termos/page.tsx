import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Serviço — Sova",
  description: "As regras de uso da plataforma Sova.",
};

const ATUALIZADO_EM = "14 de agosto de 2026";

export default function TermosPage() {
  return (
    <>
      <h1>Termos de Serviço</h1>
      <p className="text-sm text-ink-muted">Última atualização: {ATUALIZADO_EM}</p>

      <p>
        Estes termos regem o uso da Sova. Ao criar uma conta, você concorda com eles. Se não
        concordar, não use a plataforma.
      </p>

      <h2>1. O que a Sova é</h2>

      <p>
        A Sova é uma camada de descoberta, compatibilidade e análise para creator commerce. Ela
        ajuda creators a encontrar produtos para promover e sellers a encontrar creators, além de
        calcular comissões, margens e desempenho.
      </p>
      <p>
        <strong>A Sova não processa vendas nem pagamentos.</strong> As transações acontecem no
        TikTok Shop ou em outra plataforma de comércio, sob as regras dela. Não somos parte na
        relação comercial entre creator e seller, não intermediamos pagamento de comissão e não
        garantimos que qualquer comissão seja efetivamente paga.
      </p>

      <h2>2. Conta</h2>

      <ul>
        <li>Você precisa ter 18 anos ou mais.</li>
        <li>Os dados de cadastro devem ser verdadeiros e mantidos atualizados.</li>
        <li>Você é responsável pelo que acontece na sua conta e por manter suas credenciais em segurança.</li>
        <li>Uma conta pode ter perfil de creator, de seller, ou os dois.</li>
      </ul>

      <h2>3. Conexão com o TikTok</h2>

      <p>
        Conectar sua conta do TikTok é opcional. Ao conectar, você autoriza a Sova a ler os dados
        descritos na <a href="/privacidade">Política de Privacidade</a>, e apenas eles.
      </p>
      <p>
        Você pode desconectar quando quiser, pela plataforma ou pelas configurações do seu TikTok. O
        uso das APIs do TikTok também está sujeito aos termos do próprio TikTok, e mudanças ou
        interrupções nessas APIs podem afetar funcionalidades da Sova sem aviso prévio.
      </p>

      <h2>4. Uso aceitável</h2>

      <p>Ao usar a Sova, você concorda em não:</p>

      <ul>
        <li>Violar leis, direitos de terceiros ou os termos do TikTok ou de outras plataformas.</li>
        <li>Tentar acessar dados de outros usuários ou contornar os controles de acesso.</li>
        <li>Extrair dados da plataforma de forma automatizada sem autorização escrita.</li>
        <li>Publicar conteúdo enganoso sobre produtos, ou divulgar afiliação de forma que descumpra as regras de publicidade aplicáveis.</li>
        <li>Sobrecarregar, testar ou interferir na infraestrutura da plataforma.</li>
      </ul>

      <p>Podemos suspender ou encerrar contas que descumpram estas regras.</p>

      <h2>5. Conteúdo gerado por inteligência artificial</h2>

      <p>
        A Sova oferece sugestões de roteiro, legenda e ideias de conteúdo geradas por IA. São{" "}
        <strong>sugestões</strong>: você é responsável por revisar, adaptar e verificar tudo antes
        de publicar, inclusive as declarações sobre o produto e a sinalização de conteúdo
        publicitário exigida por lei e pelas regras da plataforma onde publicar.
      </p>

      <h2>6. Estimativas e projeções</h2>

      <p>
        Compatibilidade, margem, comissão recomendada e potencial de ganho são{" "}
        <strong>estimativas calculadas sobre os dados disponíveis</strong>, exibidas junto com a
        origem e o grau de confiança de cada número. Não são promessa de resultado. Desempenho
        comercial depende do produto, do nicho, da execução e de fatores fora do nosso controle.
      </p>

      <h2>7. Planos e pagamento</h2>

      <p>
        Funcionalidades pagas, quando disponíveis, terão preço e condições informados no momento da
        contratação. Alterações de preço serão comunicadas com antecedência e valerão apenas para
        ciclos seguintes.
      </p>

      <h2>8. Propriedade intelectual</h2>

      <p>
        A plataforma, sua marca e seu código pertencem à Sova. O conteúdo que você cadastra ou
        produz continua seu — você nos concede apenas a licença necessária para operar o serviço
        para você.
      </p>

      <h2>9. Disponibilidade e limitação de responsabilidade</h2>

      <p>
        A plataforma é fornecida &quot;no estado em que se encontra&quot;. Não garantimos operação
        ininterrupta nem ausência de erros, e dependemos de serviços de terceiros — como TikTok,
        Clerk, Neon e Vercel — que podem falhar ou mudar.
      </p>
      <p>
        Na máxima extensão permitida pela lei aplicável, não respondemos por lucros cessantes ou
        danos indiretos decorrentes do uso da plataforma. Nada aqui afasta direitos que o Código de
        Defesa do Consumidor garanta a você.
      </p>

      <h2>10. Encerramento</h2>

      <p>
        Você pode encerrar sua conta quando quiser. Podemos encerrar ou suspender o acesso em caso
        de descumprimento destes termos ou de exigência legal. Após o encerramento, seus dados
        seguem o previsto na <a href="/privacidade">Política de Privacidade</a>.
      </p>

      <h2>11. Lei aplicável</h2>

      <p>
        Estes termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do usuário
        para dirimir controvérsias.
      </p>

      <h2>12. Contato</h2>

      <p>
        Dúvidas sobre estes termos: <a href="mailto:atlasassessoria@gmail.com">atlasassessoria@gmail.com</a>.
      </p>
    </>
  );
}
