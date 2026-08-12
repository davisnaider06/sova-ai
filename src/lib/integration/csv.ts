// ---------------------------------------------------------------------------
// Parser de CSV.
//
// Escrito à mão, e de propósito: o arquivo que chega é exportado do painel do
// TikTok Shop por um vendedor brasileiro usando Excel. Isso significa, na
// prática, BOM no começo, ponto-e-vírgula como separador, CRLF, e campos com
// vírgula dentro de aspas ("Kit 2 unidades, sabor limão"). Um `split(",")`
// morre em todos esses casos.
//
// O delimitador é detectado pela linha de cabeçalho em vez de configurado: quem
// exporta a planilha não sabe qual usou.
// ---------------------------------------------------------------------------

export type CsvTable = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

const DELIMITERS = [";", ",", "\t", "|"] as const;

export function parseCsv(input: string): CsvTable {
  // BOM do Excel: invisível, mas gruda no primeiro cabeçalho e faz "pedido_id"
  // virar "﻿pedido_id", que não bate com nada.
  const text = input.replace(/^﻿/, "");
  if (text.trim() === "") return { headers: [], rows: [] };

  const delimiter = detectDelimiter(text);
  const records = tokenize(text, delimiter);
  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0].map((h) => normalizeHeader(h));

  const rows = records
    .slice(1)
    // Linha em branco no fim do arquivo é regra, não exceção.
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = (cells[i] ?? "").trim();
      });
      return row;
    });

  return { headers, rows };
}

/// Vence o delimitador que aparece mais vezes na primeira linha — fora de aspas.
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? undefined : text.search(/\r?\n/));

  let best = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = countOutsideQuotes(firstLine, d);
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, delimiter: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === delimiter && !inQuotes) count++;
  }
  return count;
}

/// Varredura caractere a caractere: é o que permite aspas com o delimitador
/// dentro, e aspas escapadas por duplicação ("" dentro do campo).
function tokenize(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // CRLF: o \n seguinte fecha a linha.
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

/// Cabeçalho normalizado: minúsculo, sem acento, com underscore.
/// "Preço Unitário" e "preco_unitario" precisam chegar na mesma chave, senão o
/// mapeamento vira uma tabela de sinônimos que nunca acaba.
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/// Procura a primeira coluna presente entre os nomes aceitos. Devolve string
/// vazia quando nenhuma existe — o chamador decide se isso é erro.
export function pick(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}
