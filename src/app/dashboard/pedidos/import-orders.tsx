"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, NativeSelect } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatBRL } from "@/lib/money";
import {
  CSV_TEMPLATE_HEADERS,
  IMPORT_IDLE,
  type ImportReport,
} from "@/lib/integration/orders-contract";
import { importOrders } from "./actions";

// O modelo é gerado no cliente a partir das MESMAS constantes que o parser usa.
// Um modelo escrito à mão num arquivo separado é o tipo de coisa que sai de
// sincronia com o importador e só é descoberta pelo cliente.
const TEMPLATE_EXAMPLE = [
  "PED-1001;03/08/2026;Creatina Monohidratada 300g;1;129,90;129,90;Entregue;@joana.fit",
  "PED-1002;04/08/2026;Whey Protein 900g;2;189,90;379,80;Enviado;",
];

export function ImportOrders() {
  const [state, formAction] = useActionState(importOrders, IMPORT_IDLE);
  const [fileName, setFileName] = useState<string | null>(null);

  function downloadTemplate() {
    const csv = [CSV_TEMPLATE_HEADERS.join(";"), ...TEMPLATE_EXAMPLE].join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-pedidos-sova.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-primary">Importar pedidos</p>
          <p className="mt-0.5 max-w-xl text-xs text-ink-muted">
            Exporte os pedidos do painel do TikTok Shop e suba aqui. A atribuição
            roda na importação e as comissões são geradas com a taxa vigente na
            data da venda.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-3 hover:text-ink-primary"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar modelo
        </button>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
          <Field label="Arquivo CSV" htmlFor="file">
            <label
              htmlFor="file"
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border-strong bg-surface-2 px-4 text-sm text-ink-muted transition-colors hover:border-brand hover:text-ink-secondary"
            >
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">{fileName ?? "Escolher arquivo..."}</span>
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </Field>

          <Field
            label="Janela de atribuição"
            htmlFor="windowDays"
            hint="Dias entre o conteúdo e a venda."
          >
            <NativeSelect id="windowDays" name="windowDays" defaultValue="7">
              <option value="1">1 dia</option>
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
            </NativeSelect>
          </Field>
        </div>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Importando...">Importar</SubmitButton>
        </div>
      </form>

      {state.status === "error" && (
        <p className="flex items-center gap-2 rounded-xl bg-status-critical/10 px-4 py-3 text-sm text-ink-primary">
          <AlertCircle className="h-4 w-4 shrink-0 text-status-critical" />
          {state.message}
        </p>
      )}

      {state.status === "done" && <ImportSummary report={state.report} />}
    </Card>
  );
}

function ImportSummary({ report }: { report: ImportReport }) {
  const nothingImported = report.ordersCreated === 0 && report.ordersSkipped === 0;

  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-primary">
        {report.ordersCreated > 0 ? (
          <CheckCircle2 className="h-4 w-4 text-status-good" />
        ) : (
          <AlertCircle className="h-4 w-4 text-status-warning" />
        )}
        {nothingImported
          ? "Nenhum pedido importado"
          : `${report.ordersCreated} ${report.ordersCreated === 1 ? "pedido importado" : "pedidos importados"}`}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="GMV" value={formatBRL(report.gmvCents)} />
        <Stat label="Atribuídos" value={String(report.attributed)} />
        <Stat label="Sem atribuição" value={String(report.unattributed)} />
        <Stat label="Comissões" value={formatBRL(report.commissionTotalCents)} />
      </div>

      {/* Reimportar o mesmo arquivo é seguro — e o relatório diz isso em vez de
          fingir que nada aconteceu. */}
      {report.ordersSkipped > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          {report.ordersSkipped}{" "}
          {report.ordersSkipped === 1 ? "pedido já existia" : "pedidos já existiam"} e{" "}
          {report.ordersSkipped === 1 ? "foi ignorado" : "foram ignorados"}. Reimportar
          o mesmo arquivo não duplica venda nem comissão.
        </p>
      )}

      {report.unattributed > 0 && (
        <p className="mt-2 text-xs text-ink-muted">
          Pedidos sem atribuição são vendas orgânicas ou casos em que mais de um
          creator estava ativo e nenhum publicou dentro da janela.
        </p>
      )}

      {report.errors.length > 0 && (
        <div className="mt-4 border-t border-border-hairline pt-3">
          <p className="text-xs font-medium text-status-warning">
            {report.errors.length}{" "}
            {report.errors.length === 1 ? "linha com problema" : "linhas com problema"}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {report.errors.slice(0, 8).map((e, i) => (
              <li key={i} className="text-xs text-ink-muted">
                <Badge variant="subtle" className="mr-1.5 px-1.5 py-0 text-[10px]">
                  linha {e.line}
                </Badge>
                {e.message}
              </li>
            ))}
            {report.errors.length > 8 && (
              <li className="text-xs text-ink-muted">
                e mais {report.errors.length - 8}...
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink-primary">{value}</p>
    </div>
  );
}
