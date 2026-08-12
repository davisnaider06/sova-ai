// ---------------------------------------------------------------------------
// Categorias de produto — lista fixa, não texto livre.
//
// A diferença aparece no matching, não no cadastro. Com texto livre um seller
// escreve "suplemento", outro "suplementos" e um creator "Suplementação": para
// o sistema são três coisas diferentes, o match não acontece, e ninguém vê o
// erro — a tela só fica vazia. Com lista fixa todo mundo aponta para o mesmo
// `id` e o match funciona.
//
// O `id` é o que vai para o banco e nunca muda. O `label` é o que aparece na
// tela e pode ser reescrito à vontade. Acrescentar categoria é seguro; renomear
// ou remover um `id` quebra o dado já cadastrado.
//
// Espelham as categorias do TikTok Shop BR para o dia em que a importação
// existir — categoria importada cai direto num id nosso, sem tradução.
// ---------------------------------------------------------------------------

export type Category = {
  id: string;
  label: string;
  /// Palavras que o creator/seller pode usar para achar a categoria na busca.
  /// Não são valores gravados: existem só para o campo de busca do seletor.
  synonyms: string[];
};

export const CATEGORIES: Category[] = [
  { id: "beleza", label: "Beleza e cuidados pessoais", synonyms: ["skincare", "maquiagem", "cosmético", "perfume"] },
  { id: "suplementos", label: "Suplementos e nutrição", synonyms: ["whey", "creatina", "vitamina", "proteína"] },
  { id: "saude", label: "Saúde e bem-estar", synonyms: ["farmácia", "massagem", "ortopédico"] },
  { id: "moda-feminina", label: "Moda feminina", synonyms: ["roupa", "vestido", "blusa"] },
  { id: "moda-masculina", label: "Moda masculina", synonyms: ["roupa", "camisa", "bermuda"] },
  { id: "calcados", label: "Calçados", synonyms: ["tênis", "sandália", "sapato", "chinelo"] },
  { id: "acessorios", label: "Acessórios e joias", synonyms: ["bolsa", "relógio", "colar", "óculos"] },
  { id: "casa", label: "Casa e decoração", synonyms: ["cozinha", "organização", "cama", "banho"] },
  { id: "eletronicos", label: "Eletrônicos", synonyms: ["fone", "carregador", "celular", "gadget"] },
  { id: "eletrodomesticos", label: "Eletrodomésticos", synonyms: ["air fryer", "liquidificador", "cafeteira"] },
  { id: "esporte", label: "Esporte e lazer", synonyms: ["academia", "fitness", "camping", "bike"] },
  { id: "infantil", label: "Infantil e bebê", synonyms: ["criança", "brinquedo", "fralda"] },
  { id: "pet", label: "Pet", synonyms: ["cachorro", "gato", "ração", "petisco"] },
  { id: "automotivo", label: "Automotivo", synonyms: ["carro", "moto", "acessório automotivo"] },
  { id: "papelaria", label: "Papelaria e escritório", synonyms: ["caderno", "caneta", "home office"] },
  { id: "alimentos", label: "Alimentos e bebidas", synonyms: ["snack", "café", "doce"] },
  { id: "livros", label: "Livros e mídia", synonyms: ["livro", "curso", "ebook"] },
  { id: "ferramentas", label: "Ferramentas e construção", synonyms: ["furadeira", "reforma", "jardim"] },
  // Sempre por último. Sem esta saída, quem não se encaixa não consegue
  // cadastrar — e um cadastro bloqueado é pior que uma categoria imprecisa.
  { id: "outro", label: "Outro", synonyms: [] },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function findCategory(id: string | null | undefined): Category | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/// Rótulo para exibição. Categoria desconhecida (dado antigo, ou importado
/// antes de a lista crescer) devolve o próprio id em vez de sumir da tela —
/// dado estranho visível é melhor que dado invisível.
export function categoryLabel(id: string | null | undefined): string {
  if (!id) return "Sem categoria";
  return BY_ID.get(id)?.label ?? id;
}

export function isValidCategory(id: string): boolean {
  return BY_ID.has(id);
}

/// Busca por rótulo ou sinônimo, sem acento e sem caixa.
export function searchCategories(query: string): Category[] {
  const q = normalize(query);
  if (!q) return CATEGORIES;
  return CATEGORIES.filter(
    (c) =>
      normalize(c.label).includes(q) ||
      c.synonyms.some((s) => normalize(s).includes(q)) ||
      normalize(c.id).includes(q),
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    // Tira os acentos combinantes que o NFD separou, para "Calçados" casar
    // com "calcados". O intervalo é o bloco Combining Diacritical Marks.
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
