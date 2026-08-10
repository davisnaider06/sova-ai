import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/brand/logo";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-12">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={32} />
      </Link>
      <SignUp />
    </div>
  );
}
