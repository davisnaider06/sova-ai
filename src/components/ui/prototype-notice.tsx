import { FlaskConical } from "lucide-react";

// Aviso de protótipo.
//
// Estas telas vieram do escopo anterior (pesquisa de produto + geração de copy)
// e ainda rodam sobre dado de exemplo. Elas continuam no produto porque a camada
// de IA está na visão (§49 da arquitetura), mas mostrar número inventado sem
// dizer que é inventado é o mesmo erro que a §79 proíbe — e é o tipo de coisa
// que só aparece na frente do cliente.

export function PrototypeNotice({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-status-warning/30 bg-status-warning/10 px-4 py-3">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
      <p className="text-xs text-ink-secondary">
        <span className="font-medium text-ink-primary">Protótipo.</span> {what} Os
        números desta tela são exemplos para validar o formato — não vêm dos seus
        dados nem de nenhuma fonte externa.
      </p>
    </div>
  );
}
