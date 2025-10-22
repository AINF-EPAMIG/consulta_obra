"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeIcon, ClockIcon } from "@heroicons/react/24/outline";

type MenuItem = { label: string; icon: JSX.Element; href: string };

const menuComum: MenuItem[] = [
  { label: 'Painel', icon: <HomeIcon className="w-5 h-5" />, href: '/painel' },
  { label: 'Meu histórico', icon: <ClockIcon className="w-5 h-5" />, href: '/historico' },
];

const menuEspecial: MenuItem[] = [
  // itens específicos foram removidos para simplificar o header (Início e Histórico)
];

export default function MenuPrincipal() {
  const { data: session } = useSession();
  const email = session?.user?.email;
  const [isEspecial, setIsEspecial] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;
    console.log("Email do usuário logado:", email);
    fetch(`/api/usuario?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        console.log("Resposta da API /api/usuario:", data);
        setIsEspecial(data.exists);
      })
      .finally(() => setLoading(false));
  }, [email]);

  const menu = isEspecial ? menuEspecial : menuComum;

  if (loading) return null;

  return (
    <nav className="flex bg-white rounded-t-2xl p-2 shadow justify-center gap-2 mt-4">
      {menu.map(item => (
        <Link key={item.label} href={item.href} className="flex items-center px-4 py-2 hover:bg-gray-100 rounded-xl font-semibold text-[#025C3E] transition-all">
          {item.icon}
          <span className="ml-2 hidden sm:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
