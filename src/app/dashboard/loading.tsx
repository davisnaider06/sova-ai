import { Skeleton } from "@/components/ui/skeleton";

// O que aparece no instante do clique.
//
// Sem este arquivo, o Next segura a navegação inteira até o servidor terminar
// de renderizar: você clica no menu e a tela antiga fica parada, sem sinal de
// que algo aconteceu. Era a queixa de "as transições estão devagares" — parte
// da lentidão era real, mas boa parte era a **ausência de resposta ao clique**.
//
// Com ele, o Next troca a tela imediatamente e transmite o conteúdo quando
// fica pronto. A barra lateral não pisca: ela vive no layout, que não recarrega
// entre páginas.
export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Carregando" className="flex flex-col">
      {/* Pílula do cabeçalho */}
      <div className="glass-pill sticky top-3 z-30 mx-3 mt-3 flex items-center justify-between gap-4 rounded-full px-5 py-3.5 sm:mx-6">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3.5 w-56 max-w-full" />
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        {/* Faixa de indicadores */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-2xl" />
          ))}
        </div>

        {/* Corpo */}
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
