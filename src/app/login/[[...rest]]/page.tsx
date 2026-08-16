import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={32} />
      </Link>
      {/* Mesmo destino do cadastro: o portão de assinatura decide para onde a
          pessoa vai de fato. Explícito aqui porque as variáveis
          `NEXT_PUBLIC_CLERK_AFTER_*` foram descontinuadas e são ignoradas. */}
      <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/signup" />
    </div>
  );
}
