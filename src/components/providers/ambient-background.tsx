// Brilho ambiente atrás de toda a aplicação.
//
// No tema escuro ele é o que dá profundidade: manchas de cor num fundo quase
// preto, com o verde da marca puxando a atenção.
//
// No tema claro esses mesmos borrões pintavam a página inteira de verde e
// lilás — era a maior fonte de cor da tela, competindo com o gráfico. Aqui o
// claro fica branco de verdade, com um cinza quase imperceptível só para o
// fundo não ficar chapado.
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page">
      <div className="absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-black/[0.02] blur-[130px] dark:bg-brand/20" />
      <div className="absolute top-[15%] right-[5%] h-[380px] w-[380px] rounded-full bg-black/[0.015] blur-[130px] dark:bg-sky-500/15" />
      <div className="absolute bottom-[-10%] left-[30%] h-[460px] w-[460px] rounded-full bg-black/[0.02] blur-[140px] dark:bg-violet-500/10" />
    </div>
  );
}
