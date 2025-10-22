"use client";
import { ClipboardList, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileFooter() {
  const router = useRouter();

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-[#d78777] flex justify-around items-center h-14 z-50">
      <button className="flex flex-col items-center text-white" onClick={() => router.push("/painel")}>
        <Home size={26} />
        <span className="text-xs mt-1">Menu</span>
      </button>
      <button
        className="flex flex-col items-center text-white"
        onClick={() => router.push("/painel/meus-dados")}
      >
        <ClipboardList size={26} />
        <span className="text-xs mt-1">Meus Dados</span>
      </button>
    </footer>
  );
}
