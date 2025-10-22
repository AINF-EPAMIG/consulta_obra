"use client"

import Image from "next/image";
import { signOut, useSession } from "next-auth/react";

export default function HeaderPainel() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header
      className="w-full z-50 bg-white border-b border-gray-200 flex flex-col sm:flex-row items-center sm:justify-between px-2 sm:px-6 py-2 shadow-sm"
      style={{ minHeight: 64 }}
    >
      {/* Logo EPAMIG */}
      <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[140px] mb-2 sm:mb-0">
        <Image src="/epamig.svg" alt="EPAMIG" width={90} height={40} className="sm:w-[120px] sm:h-[50px] w-[90px] h-[40px]" priority />
      </div>
      {/* Texto central */}
      <div className="flex-1 flex flex-col items-center text-center px-1">
        <span className="text-sm sm:text-xl font-bold text-[#025C3E] leading-tight">Empresa de Pesquisa Agropecuária de Minas Gerais</span>
        <span className="text-xs sm:text-xs font-semibold text-[#025C3E]">Secretaria de Estado de Agricultura, Pecuária e Abastecimento de Minas Gerais</span>
      </div>
      {/* Usuário à direita */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-[100px] sm:min-w-[180px] justify-end mt-2 sm:mt-0">
        {user && (
          <>
            <div className="flex flex-col items-end max-w-[110px] sm:max-w-none">
              <span className="text-[10px] sm:text-xs text-[#025C3E] font-medium truncate max-w-full">{user.email}</span>
              <button
                onClick={async () => {
                  try {
                    await signOut({ callbackUrl: '/', redirect: true });
                  } finally {
                    window.location.href = '/';
                  }
                }}
                className="flex items-center gap-1 text-red-600 hover:underline text-xs sm:text-base font-medium mt-1"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5m0 0l-5-5m5 5H9m-4 5V7a2 2 0 012-2h6"/></svg>
                Sair
              </button>
            </div>
            {user.image && (
              <Image src={user.image} alt={user.email || "avatar"} width={36} height={36} className="rounded-full border border-gray-300 w-[36px] h-[36px] sm:w-[44px] sm:h-[44px]" />
            )}
          </>
        )}
      </div>
    </header>
  );
}
