"use client";

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { plans } from "@/lib/mock-data";
import { formatCurrencyBRL } from "@/lib/utils";

export default function ConfiguracoesPage() {
  const { user } = useUser();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const [storeName, setStoreName] = useState("Rocha Store BR");

  async function handleSaveProfile() {
    if (!user) return;
    const formName = nameRef.current?.value.trim() || "";
    setSaving(true);
    const [firstName, ...rest] = formName.split(" ");
    await user.update({ firstName, lastName: rest.join(" ") });
    setSaving(false);
  }

  return (
    <>
      <Topbar title="Configurações" subtitle="Gerencie sua conta, loja e plano" />

      <div className="p-6">
        <Tabs defaultValue="perfil">
          <TabsList>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="loja">Loja</TabsTrigger>
            <TabsTrigger value="plano">Plano & Cobrança</TabsTrigger>
            <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Dados pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    ref={nameRef}
                    key={user?.id}
                    defaultValue={user?.fullName || user?.firstName || ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={email} disabled />
                </div>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loja">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Loja conectada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="store">Nome da loja</Label>
                  <Input id="store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                </div>
                <div className="rounded-xl bg-surface-2 p-4 text-sm text-ink-secondary">
                  Integração com TikTok Shop: <Badge variant="good" className="ml-1">Conectada</Badge>
                </div>
                <Button variant="outline">Reconectar loja</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plano">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {plans.map((plan) => {
                const active = plan.name === "Pro";
                return (
                  <Card key={plan.id} className={active ? "border-brand p-5 shadow-[0_0_0_1px_var(--brand)]" : "p-5"}>
                    {active && <Badge className="mb-3 w-fit">Plano atual</Badge>}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{plan.tagline}</p>
                    <p className="mt-4 text-2xl font-semibold">
                      {formatCurrencyBRL(plan.price)}
                      <span className="text-sm text-ink-muted">/mês</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-ink-secondary">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button className="mt-5 w-full" variant={active ? "outline" : "default"} disabled={active}>
                      {active ? "Plano atual" : "Fazer upgrade"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="notificacoes">
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Preferências de notificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["Novas oportunidades de produto", "Alertas de concorrência", "Relatório semanal de GMV"].map((n) => (
                  <label key={n} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm text-ink-secondary">
                    {n}
                    <input type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--brand)]" />
                  </label>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
