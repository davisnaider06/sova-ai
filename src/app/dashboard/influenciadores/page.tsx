import { AtSign, Play } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { influencers } from "@/lib/mock-data";

export default function InfluenciadoresPage() {
  return (
    <>
      <Topbar title="Influenciadores" subtitle="Criadores com maior match para o seu nicho" />

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {influencers.map((inf) => (
          <Card key={inf.id}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-selected/10 text-base text-ink-primary">{inf.avatar}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-primary">{inf.name}</p>
                  <p className="truncate text-xs text-ink-muted">{inf.handle}</p>
                </div>
                <Badge variant={inf.match >= 90 ? "good" : "warning"}>{inf.match}% match</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-2 p-2">
                  <p className="text-sm font-semibold text-ink-primary">{inf.followers}</p>
                  <p className="text-[10px] text-ink-muted">Seguidores</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-2">
                  <p className="text-sm font-semibold text-ink-primary">{inf.engagement}%</p>
                  <p className="text-[10px] text-ink-muted">Engajamento</p>
                </div>
                <div className="rounded-xl bg-surface-2 p-2">
                  <p className="text-sm font-semibold text-ink-primary">{inf.avgViews}</p>
                  <p className="text-[10px] text-ink-muted">Views médias</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Badge variant="subtle">{inf.niche}</Badge>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <AtSign className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
