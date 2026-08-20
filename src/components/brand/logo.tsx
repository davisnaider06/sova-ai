import Image from "next/image";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// A marca.
//
// O símbolo tem três barras, e a terceira é sólida na cor da tinta — escura na
// arte original, clara na versão para fundo escuro. Por isso são dois arquivos
// e não um: a barra escura desaparece no tema escuro e a clara desaparece no
// claro, e em qualquer um dos dois o símbolo aparece pela metade. Era esse o
// bug — o PNG que existia aqui tinha a barra branca, então a landing no modo
// claro mostrava só os dois traços verdes.
//
// A troca é feita por CSS (`dark:`), não por `useTheme()`: assim o componente
// continua sendo Server Component e nenhuma das páginas pisca a variante
// errada enquanto hidrata.
// ---------------------------------------------------------------------------

/// Largura ÷ altura da arte, já sem a margem transparente. `size` é a altura,
/// e a largura sai daqui — o símbolo não é quadrado, e forçá-lo num quadrado
/// era o que fazia a logo aparecer bem menor do que o `size` pedido.
const PROPORCAO = 419 / 512;

export function Logo({
  size = 32,
  showWordmark = true,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  const width = Math.round(size * PROPORCAO);

  // Com o nome escrito ao lado, o símbolo é decorativo: repetir "Sova AI" no
  // alt faria o leitor de tela anunciar a marca duas vezes seguidas.
  const alt = showWordmark ? "" : "Sova AI";

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo-tema-claro.png"
        alt={alt}
        width={width}
        height={size}
        className="block object-contain dark:hidden"
        priority
      />
      <Image
        src="/logo-tema-escuro.png"
        alt={alt}
        width={width}
        height={size}
        className="hidden object-contain dark:block"
        priority
      />
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight text-foreground">
          Sova <span className="text-brand-ink">AI</span>
        </span>
      )}
    </span>
  );
}
