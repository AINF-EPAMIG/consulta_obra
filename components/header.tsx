// components/Header.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { Globe, Mail } from "lucide-react"

export default function Header() {
  return (
    <header className="bg-white shadow-md z-50 w-full border-b border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-6 py-4">
        {/* Tudo em uma única linha */}
        <div className="flex items-center justify-between">
          {/* Logo à esquerda */}
          <div className="flex-shrink-0">
            <Image src="/epamig_logo.svg" alt="EPAMIG Logo" width={150} height={52} priority />
          </div>
          
          {/* Textos centralizados */}
          <div className="flex-1 text-center px-8">
            <h1 className="font-semibold text-lg leading-tight" style={{ color: '#025C3E' }}>
              Empresa de Pesquisa Agropecuária de Minas Gerais
            </h1>
            <p className="text-gray-600 text-sm font-normal mt-0.5">
              Secretaria de Estado de Agricultura, Pecuária e Abastecimento
            </p>
          </div>
          
          {/* Links alinhados à direita */}
          <div className="flex items-center space-x-5 flex-shrink-0">
            <Link 
              href="https://www.epamig.br" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
              style={{ color: '#025C3E' }}
            >
              <Globe size={20} strokeWidth={2} /> 
              <span>Site Oficial</span>
            </Link>
            
            <Link 
              href="https://mail.google.com/mail/u/0/#inbox" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
              style={{ color: '#025C3E' }}
            >
              <Mail size={20} strokeWidth={2} />
              <span>E-mail</span>
            </Link>
            
            <Link 
              href="https://empresade125369.rm.cloudtotvs.com.br/Corpore.Net/Login.aspx" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity text-gray-700"
            >
              <Image src="/icon_totvs.svg" alt="Portal ADM" width={20} height={20} />
              <span>Portal ADM</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
