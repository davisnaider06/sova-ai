"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles, Clapperboard, Mic, Hash, MessageSquareQuote, Copy, Check } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { PrototypeNotice } from "@/components/ui/prototype-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const scenes = [
  { title: "Cena 1 — Gancho", detail: "Close no problema do dia a dia em 2s, texto na tela chamando atenção." },
  { title: "Cena 2 — Unboxing", detail: "Abertura do produto com reação genuína, destaque no detalhe premium." },
  { title: "Cena 3 — Demonstração", detail: "Uso real do produto resolvendo o problema mostrado no gancho." },
  { title: "Cena 4 — Resultado", detail: "Antes/depois ou reação final + prova social (avaliação, print de comentário)." },
];

const narration =
  "Tom: animado e próximo. Ritmo: rápido nos primeiros 3s, desacelera na demonstração. Trilha sugerida: som em alta no TikTok Shop dessa semana.";

export default function ConteudoIaPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setReady(false);
  }

  function generate() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setReady(true);
    }, 1600);
  }

  const caption = "Achei esse produto e minha vida mudou, corre que a promoção é por tempo limitado #tiktokshop";
  const cta = "Toca no link da vitrine antes que esgote de novo";

  return (
    <>
      <Topbar title="Conteúdo IA" subtitle="Envie a foto do produto e receba um vídeo pronto para gravar" />

      <div className="flex flex-col gap-6 p-6">
        <PrototypeNotice what="A geração de roteiro ainda não está ligada a um modelo de IA." />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Produto enviado" className="h-40 w-40 rounded-2xl object-cover" />
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                className="flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong text-ink-muted transition-colors hover:border-brand hover:text-brand"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs">Enviar foto</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                {preview ? "Trocar foto" : "Escolher foto do produto"}
              </Button>
              <Button onClick={generate} disabled={!preview || loading}>
                {loading ? "Gerando..." : "Gerar vídeo com IA"} <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border-hairline bg-surface-1 py-16 text-center">
            <Sparkles className="h-6 w-6 animate-pulse text-brand" />
            <p className="text-sm text-ink-secondary">Criando roteiro, cenas, legenda e narração...</p>
          </div>
        )}

        {ready && !loading && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-brand" /> Roteiro por cenas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scenes.map((s) => (
                  <div key={s.title} className="rounded-xl bg-surface-2 p-3">
                    <p className="text-sm font-medium text-ink-primary">{s.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{s.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareQuote className="h-4 w-4 text-brand" /> Legenda & CTA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-secondary">{caption}</p>
                  <p className="rounded-xl bg-brand/10 p-3 text-sm font-medium text-brand">{cta}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${caption}\n\n${cta}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copiado" : "Copiar tudo"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-brand" /> Narração
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-secondary">{narration}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-brand" /> Hashtags
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {["#tiktokshop", "#achadinhos", "#tiktokmademebuyit", "#viralvideo"].map((h) => (
                    <Badge key={h} variant="subtle">
                      {h}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
