'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LayoutGrid, FileText, LogOut, Menu } from 'lucide-react'

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botão mobile */}
      <div className="md:hidden bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <span className="font-bold">EPAMIG</span>
        <button onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu size={24} />
        </button>
      </div>

      {/* Menu lateral mobile */}
      {open && (
        <div className="md:hidden bg-green-800 text-white px-4 py-2 space-y-2">
          <Link href="/painel" className="flex items-center gap-2 hover:text-gray-300">
            <LayoutGrid size={18} /> Painel
          </Link>
          <Link href="/projetos" className="flex items-center gap-2 hover:text-gray-300">
            <FileText size={18} /> Projetos
          </Link>
          <button className="flex items-center gap-2 text-red-300">
            <LogOut size={18} /> Sair
          </button>
        </div>
      )}

      {/* Sidebar normal */}
      <aside className="hidden md:flex md:flex-col bg-green-700 text-white w-64 p-4 space-y-4">
        <h2 className="text-xl font-bold">EPAMIG</h2>
        <Link href="/painel" className="flex items-center gap-2 hover:text-gray-300">
          <LayoutGrid size={18} /> Painel
        </Link>
        <Link href="/projetos" className="flex items-center gap-2 hover:text-gray-300">
          <FileText size={18} /> Projetos
        </Link>
        <button className="flex items-center gap-2 text-red-300 mt-auto">
          <LogOut size={18} /> Sair
        </button>
      </aside>
    </>
  )
}
