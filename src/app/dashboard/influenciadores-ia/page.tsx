import { Bot, Video, Wand2 } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiInfluencers } from "@/lib/mock-data";

const statusVariant = {
  Pronta: "good",
  Gerando: "warning",
  Rascunho: "subtle",
} as const;

export default function InfluenciadoresIaPage() {
  return (
    <>
      <Topbar title="Influenciadores IA" subtitle="Avatares digitais prontos para gravar seus vídeos" />

      <div className="flex flex-col gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {aiInfluencers.map((ai) => (
            <Card key={ai.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-selected/10 text-xl font-semibold text-ink-primary">
                    {ai.avatar}
                  </span>
                  <Badge variant={statusVariant[ai.status]}>{ai.status}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink-primary">{ai.name}</p>
                <p className="text-xs text-ink-muted">{ai.style} · {ai.voice}</p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1">
                    <Video className="h-3.5 w-3.5" /> Gravar vídeo
                  </Button>
                  <Button size="sm" variant="outline">
                    <Wand2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <button className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong p-8 text-ink-muted transition-colors hover:border-brand-ink hover:text-brand-ink">
            <Bot className="h-8 w-8" />
            <span className="text-sm font-medium">Criar novo avatar IA</span>
          </button>
        </div>
      </div>
    </>
  );
}
