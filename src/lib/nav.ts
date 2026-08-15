import {
  BarChart3,
  Bot,
  Compass,
  FileText,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Package,
  Radar,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ProfileType } from "@/generated/prisma";

// ---------------------------------------------------------------------------
// Navegação por papel.
//
// Creator e Seller são duas experiências sobre o mesmo núcleo de dados, e um
// mesmo usuário pode ser os dois. Por isso o menu não é uma constante: ele é
// derivado do Profile ativo, do mesmo jeito que os dados são.
//
// A alternativa — um menu só, com itens escondidos por condicional espalhada
// pelo componente — é o caminho para um seller ver "Minhas Comissões" vazio e
// achar que o produto está quebrado.
// ---------------------------------------------------------------------------

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /// Aparece na barra inferior do mobile (espaço para 4 + o botão de menu).
  mobile?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

const SELLER: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, mobile: true },
      { href: "/dashboard/produtos", label: "Produtos", icon: Package, mobile: true },
      { href: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/dashboard/afiliacoes", label: "Afiliações", icon: Handshake, mobile: true },
      { href: "/dashboard/creators", label: "Encontrar creators", icon: Users },
      { href: "/dashboard/pedidos", label: "Pedidos", icon: Receipt, mobile: true },
      { href: "/dashboard/comissoes", label: "Comissões", icon: Wallet },
    ],
  },
  {
    title: "Ferramentas IA",
    items: [
      { href: "/dashboard/pagina-vendas", label: "Página de vendas", icon: FileText },
      { href: "/dashboard/inteligencia-mercado", label: "Inteligência de mercado", icon: Radar },
    ],
  },
];

const CREATOR: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, mobile: true },
      { href: "/dashboard/descobrir", label: "Descobrir produtos", icon: Compass, mobile: true },
      { href: "/dashboard/minhas-afiliacoes", label: "Minhas afiliações", icon: Handshake, mobile: true },
      { href: "/dashboard/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/dashboard/conteudo", label: "Meu conteúdo", icon: Video },
      { href: "/dashboard/conteudo-ia", label: "Assistente de conteúdo", icon: Bot },
      { href: "/dashboard/desempenho", label: "Desempenho", icon: BarChart3 },
      { href: "/dashboard/comissoes", label: "Comissões", icon: Wallet, mobile: true },
    ],
  },
];

const SECONDARY: NavItem[] = [
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

/// Só administradores veem. Esconder o link não é a proteção — a rota chama
/// `requireAdmin()` — mas mostrar um menu que leva a um redirect é ruído.
const ADMIN: NavItem = { href: "/dashboard/admin", label: "Administração", icon: ShieldCheck };

export function navFor(type: ProfileType): NavSection[] {
  return type === "SELLER" ? SELLER : CREATOR;
}

export function secondaryNav(isAdmin = false): NavItem[] {
  return isAdmin ? [...SECONDARY, ADMIN] : SECONDARY;
}

/// Itens da barra inferior do mobile. O último slot é sempre "Menu", então
/// aqui cabem 4 — os marcados com `mobile`, na ordem em que aparecem na lateral.
export function mobileNavFor(type: ProfileType): NavItem[] {
  return navFor(type)
    .flatMap((section) => section.items)
    .filter((item) => item.mobile)
    .slice(0, 4);
}

/// Um item está ativo quando a rota é exatamente ele (caso do "/dashboard", que
/// senão ficaria aceso o tempo todo) ou quando a rota atual é filha dele.
export function isNavItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}
