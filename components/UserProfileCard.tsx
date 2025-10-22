// components/UserProfileCard.tsx
import { User } from "lucide-react";
import Image from "next/image";

interface Props {
  nome: string;
  cargo?: string;
  chapa?: string;
  email?: string;
  foto?: string | null;
}

export default function UserProfileCard({ nome, cargo, chapa, email, foto }: Props) {
  return (
    <div className="bg-gradient-to-r from-[#3A8144] to-[#6DB08D] rounded-xl shadow mb-4 px-4 py-3 flex items-center gap-3 w-full min-h-[76px]">
      <div className="flex-shrink-0">
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/30 overflow-hidden shadow-lg">
          {foto ? (
            <Image src={foto.startsWith("http") ? foto : `/uploads/${foto}`} alt="Foto do usuário" className="w-full h-full object-cover rounded-xl" width={56} height={56} />
          ) : (
            <User className="text-white" size={28} />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg md:text-xl font-bold text-white leading-tight truncate">{nome}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-white/90 text-xs md:text-sm font-medium">
          {cargo && <span>Cargo: {cargo}</span>}
          {chapa && <span>Chapa: {chapa}</span>}
          {email && <span>{email}</span>}
        </div>
      </div>
    </div>
  );
}
