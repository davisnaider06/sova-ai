import { Flame, Play, Copy } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { viralScripts } from "@/lib/mock-data";

export default function ModeloViralPage() {
  return (
    <>
      <Topbar title="Modelo Viral" subtitle="Biblioteca de ganchos e formatos com maior taxa de viralização" />

      <div className="flex flex-col gap-4 p-6">
        {viralScripts.map((v) => (
          <Card key={v.id}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="subtle">{v.format}</Badge>
                  <span className="text-xs text-ink-muted">{v.duration}</span>
                </div>
                <p className="mt-2 text-base font-medium text-ink-primary">&quot;{v.hook}&quot;</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-brand">
                    <Flame className="h-3.5 w-3.5" /> {v.virality}% viralidade
                  </div>
                  <Progress value={v.virality} className="h-1.5 max-w-[160px]" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-3.5 w-3.5" /> Usar modelo
                </Button>
                <Button size="sm">
                  <Play className="h-3.5 w-3.5" /> Ver exemplo
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
