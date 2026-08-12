// ---------------------------------------------------------------------------
// Validação de formulário para Server Actions.
//
// Server Action é um endpoint POST público: qualquer um pode chamar com o
// payload que quiser. Então "o formulário já valida no cliente" não vale como
// garantia — a validação daqui é a única que conta, e a do browser é conforto.
//
// Sem lib de schema de propósito: são poucas regras, e um validador de 90
// linhas que a equipe lê inteiro erra menos que um schema que ninguém revisa.
// ---------------------------------------------------------------------------

export type FieldErrors = Record<string, string>;

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message?: string; errors: FieldErrors };

export const IDLE: ActionState = { status: "idle" };

export function fail(errors: FieldErrors, message?: string): ActionState {
  return { status: "error", errors, message };
}

export function succeed(message?: string): ActionState {
  return { status: "success", message };
}

/// Coletor de erros: acumula tudo e devolve de uma vez, em vez de estourar no
/// primeiro problema. Formulário que revela um erro por submit é o jeito mais
/// rápido de perder o usuário no terceiro campo.
export class Validator {
  readonly errors: FieldErrors = {};

  constructor(private readonly data: FormData) {}

  private raw(key: string): string {
    const v = this.data.get(key);
    return typeof v === "string" ? v.trim() : "";
  }

  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  optionalText(key: string, max = 2000): string | null {
    const v = this.raw(key);
    if (v === "") return null;
    if (v.length > max) {
      this.errors[key] = `Máximo de ${max} caracteres.`;
      return null;
    }
    return v;
  }

  text(key: string, label: string, { min = 1, max = 200 } = {}): string {
    const v = this.raw(key);
    if (v.length < min) {
      this.errors[key] = min === 1 ? `${label} é obrigatório.` : `Mínimo de ${min} caracteres.`;
      return "";
    }
    if (v.length > max) {
      this.errors[key] = `Máximo de ${max} caracteres.`;
      return "";
    }
    return v;
  }

  /// Valor monetário em centavos. `required` distingue "campo vazio" de "zero",
  /// que são coisas diferentes: frete grátis é 0, frete não informado é null.
  money(
    key: string,
    label: string,
    { required = false, min = 0 }: { required?: boolean; min?: number } = {},
  ): number | null {
    const v = this.raw(key);
    if (v === "") {
      if (required) this.errors[key] = `${label} é obrigatório.`;
      return null;
    }
    const cents = parseCentsLocal(v);
    if (cents === null) {
      this.errors[key] = "Valor inválido.";
      return null;
    }
    if (cents < min * 100) {
      this.errors[key] = `Não pode ser menor que ${min}.`;
      return null;
    }
    return cents;
  }

  /// Percentual digitado (0 a 100) devolvido como fração (0 a 1), que é como o
  /// banco guarda taxa.
  percent(
    key: string,
    label: string,
    { required = false, max = 100 }: { required?: boolean; max?: number } = {},
  ): number | null {
    const v = this.raw(key);
    if (v === "") {
      if (required) this.errors[key] = `${label} é obrigatório.`;
      return null;
    }
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n)) {
      this.errors[key] = "Valor inválido.";
      return null;
    }
    if (n < 0 || n > max) {
      this.errors[key] = `Informe um valor entre 0 e ${max}.`;
      return null;
    }
    return Math.round(n * 100) / 10000;
  }

  int(
    key: string,
    label: string,
    { required = false, min = 0 }: { required?: boolean; min?: number } = {},
  ): number | null {
    const v = this.raw(key);
    if (v === "") {
      if (required) this.errors[key] = `${label} é obrigatório.`;
      return null;
    }
    const n = Number(v);
    if (!Number.isInteger(n)) {
      this.errors[key] = "Informe um número inteiro.";
      return null;
    }
    if (n < min) {
      this.errors[key] = `Não pode ser menor que ${min}.`;
      return null;
    }
    return n;
  }

  /// Valor que precisa pertencer a um conjunto conhecido — enum do Prisma,
  /// categoria, status. É a barreira contra POST forjado com valor inventado.
  oneOf<T extends string>(key: string, label: string, allowed: readonly T[]): T {
    const v = this.raw(key) as T;
    if (!allowed.includes(v)) {
      this.errors[key] = `${label} inválido.`;
      return allowed[0];
    }
    return v;
  }

  url(key: string): string | null {
    const v = this.raw(key);
    if (v === "") return null;
    try {
      const parsed = new URL(v);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        this.errors[key] = "Use um endereço http ou https.";
        return null;
      }
      return v;
    } catch {
      this.errors[key] = "Endereço inválido.";
      return null;
    }
  }

  /// Lista vinda de checkboxes com o mesmo `name`.
  many<T extends string>(key: string, allowed: readonly T[]): T[] {
    return this.data
      .getAll(key)
      .filter((v): v is string => typeof v === "string")
      .filter((v): v is T => (allowed as readonly string[]).includes(v));
  }

  id(key: string, label: string): string {
    const v = this.raw(key);
    if (v === "") this.errors[key] = `${label} é obrigatório.`;
    return v;
  }
}

// Cópia local de parseCents para o módulo não depender de money.ts — mantém
// este arquivo utilizável tanto no servidor quanto em testes isolados.
function parseCentsLocal(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const sep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;

  let normalized: string;
  if (sep === null) {
    normalized = cleaned;
  } else {
    const cut = cleaned.lastIndexOf(sep);
    normalized = `${cleaned.slice(0, cut).replace(/[.,]/g, "")}.${cleaned
      .slice(cut + 1)
      .replace(/[.,]/g, "")}`;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
