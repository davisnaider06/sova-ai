import type { NormalizedVideo } from "@/lib/tiktok/normalize";

// ---------------------------------------------------------------------------
// Métricas da conta, calculadas sobre os vídeos já normalizados.
//
// A regra que governa este arquivo: **cada número precisa sair de dados que
// temos**. A Display API dá views, curtidas, comentários, compartilhamentos,
// duração e data. Ela não dá alcance, retenção, taxa de conclusão, origem do
// tráfego nem dados demográficos — então nada aqui finge calcular isso.
//
// Onde a amostra é pequena demais para sustentar uma conclusão, a função
// devolve null e a tela diz que faltam dados, em vez de exibir um número que
// só parece informação.
// ---------------------------------------------------------------------------

/// Abaixo disso, "acima da média" é ruído: com 3 vídeos, um viral torna todos
/// os outros "abaixo da média" e a leitura fica sem valor.
export const MIN_VIDEOS_FOR_ANALYSIS = 5;

export type AccountMetrics = {
  videoCount: number;
  totalViews: number;
  medianViews: number | null;
  averageEngagementRate: number | null;
  /// Vídeos por semana, calculado sobre o período coberto pela amostra.
  postingFrequencyPerWeek: number | null;
  /// Vídeos com views acima da mediana da própria conta.
  aboveMedian: string[];
  /// Null quando não há vídeos suficientes para uma leitura honesta.
  durationInsight: DurationInsight | null;
};

export type DurationInsight = {
  shortBucketMedianViews: number;
  longBucketMedianViews: number;
  /// Segundos que separam os dois grupos (a mediana das durações).
  splitSeconds: number;
  /// Qual grupo performa melhor, ou null quando a diferença é pequena demais
  /// para afirmar qualquer coisa.
  betterBucket: "short" | "long" | null;
};

export function computeAccountMetrics(videos: NormalizedVideo[]): AccountMetrics {
  const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0);
  const medianViews = median(videos.map((v) => v.viewCount));

  const withEngagement = videos.filter((v) => v.engagementRate !== null);
  const averageEngagementRate =
    withEngagement.length > 0
      ? round4(
          withEngagement.reduce((acc, v) => acc + (v.engagementRate ?? 0), 0) /
            withEngagement.length,
        )
      : null;

  return {
    videoCount: videos.length,
    totalViews,
    medianViews,
    averageEngagementRate,
    postingFrequencyPerWeek: postingFrequency(videos),
    aboveMedian:
      medianViews === null
        ? []
        : videos.filter((v) => v.viewCount > medianViews).map((v) => v.videoId),
    durationInsight: durationInsight(videos),
  };
}

/// Publicações por semana no período coberto pela amostra.
///
/// Null com menos de dois vídeos datados: um vídeo só não define intervalo, e
/// dividir por zero dia daria infinito.
export function postingFrequency(videos: NormalizedVideo[]): number | null {
  const dates = videos
    .map((v) => v.publishedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) return null;

  const spanDays =
    (dates[dates.length - 1].getTime() - dates[0].getTime()) / 86_400_000;
  if (spanDays < 1) return null;

  return Math.round((dates.length / (spanDays / 7)) * 100) / 100;
}

/// Compara vídeos curtos e longos, cortando pela mediana de duração.
///
/// Usa mediana em vez de um corte fixo (tipo "30 segundos") porque o que é
/// curto varia por creator: quem publica sempre entre 45 e 90 segundos não tem
/// nenhum vídeo "curto" num corte absoluto, e a comparação não aconteceria.
export function durationInsight(videos: NormalizedVideo[]): DurationInsight | null {
  const usable = videos.filter(
    (v) => v.durationSeconds !== null && v.durationSeconds > 0 && v.viewCount > 0,
  );
  if (usable.length < MIN_VIDEOS_FOR_ANALYSIS) return null;

  const splitSeconds = median(usable.map((v) => v.durationSeconds as number));
  if (splitSeconds === null) return null;

  const short = usable.filter((v) => (v.durationSeconds as number) <= splitSeconds);
  const long = usable.filter((v) => (v.durationSeconds as number) > splitSeconds);

  // Se todos os vídeos caem de um lado só, não há comparação a fazer.
  if (short.length === 0 || long.length === 0) return null;

  const shortMedian = median(short.map((v) => v.viewCount)) ?? 0;
  const longMedian = median(long.map((v) => v.viewCount)) ?? 0;

  // Diferença abaixo de 20% é ruído amostral com poucas dezenas de vídeos.
  // Afirmar "vídeos curtos performam melhor" com 5% de diferença seria vender
  // acaso como padrão.
  const larger = Math.max(shortMedian, longMedian);
  const smaller = Math.min(shortMedian, longMedian);
  const meaningful = larger > 0 && (larger - smaller) / larger >= 0.2;

  return {
    shortBucketMedianViews: shortMedian,
    longBucketMedianViews: longMedian,
    splitSeconds,
    betterBucket: meaningful ? (shortMedian > longMedian ? "short" : "long") : null,
  };
}

/// Mediana, não média.
///
/// Um vídeo viral distorce a média a ponto de tornar "acima da média" quase
/// impossível — com um vídeo de 1 milhão entre nove de mil, a média fica em
/// 100 mil e nove vídeos viram "abaixo da média". A mediana descreve o vídeo
/// típico da conta, que é a pergunta real.
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
