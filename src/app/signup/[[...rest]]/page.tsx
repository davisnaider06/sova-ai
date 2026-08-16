import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={32} />
      </Link>
      {/* Depois de criar a conta e verificar o e-mail, o destino é o dashboard
          — e é o portão de assinatura que decide o resto: quem já pagou entra
          direto, quem não pagou cai em /assinatura.

          Mandar para /assinatura fixo aqui puniria justamente quem fez o
          caminho certo (pagar antes de se cadastrar), com uma tela de "assine"
          para alguém que acabou de assinar.

          Está no componente, e não só nas variáveis de ambiente, porque os
          nomes `NEXT_PUBLIC_CLERK_AFTER_*` foram descontinuados: o Clerk os
          ignora em silêncio e manda o usuário para a landing. Era o que estava
          acontecendo. */}
      <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/login" />
    </div>
  );
}
