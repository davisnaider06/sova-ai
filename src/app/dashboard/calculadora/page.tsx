import { Topbar } from "@/components/layout/topbar";
import { CommissionCalculator } from "@/components/seller/commission-calculator";

// A calculadora funciona sem produto cadastrado e sem integração nenhuma — é
// matemática. Por isso ela é a primeira coisa que entrega valor no dia 1, antes
// de qualquer dado externo existir.
export default function CalculadoraPage() {
  return (
    <>
      <Topbar
        title="Calculadora de comissão"
        subtitle="Até quanto dá para pagar de creator sem quebrar sua margem"
      />
      <div className="px-3 py-5 sm:px-6">
        <CommissionCalculator />
      </div>
    </>
  );
}
