"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Home, ClipboardList, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation"; // IMPORTANTE

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter(); // PARA O REDIRECT MANUAL

  return (
    <footer
      className="w-full fixed bottom-0 left-0 z-50"
      style={{
        background: "linear-gradient(90deg, #2e7d32 0%, #3A8144 100%)",
        borderTop: "none",
      }}
    >
      <nav className="flex justify-around py-2 px-2">
        <Link
          href="/painel"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/painel"
              ? "text-white font-bold"
              : "text-white opacity-80 hover:opacity-100"
          } transition min-w-0 flex-1`}
        >
          <Home size={20} className="sm:w-6 sm:h-6" />
          <span className="text-center">Painel</span>
        </Link>
        <Link
          href="/painel/meus-dados"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/painel/meus-dados"
              ? "text-white font-bold"
              : "text-white opacity-80 hover:opacity-100"
          } transition min-w-0 flex-1`}
        >
          <ClipboardList size={20} className="sm:w-6 sm:h-6" />
          <span className="text-center">Meus Dados</span>
        </Link>
        <button
          onClick={async () => {
            await signOut({ redirect: false });
            router.push("/login");
          }}
          className="flex flex-col items-center text-xs text-white opacity-80 hover:opacity-100 transition min-w-0 flex-1"
          type="button"
        >
          <LogOut size={20} className="sm:w-6 sm:h-6" />
          <span className="text-center">Sair</span>
        </button>
      </nav>
    </footer>
  );
}
