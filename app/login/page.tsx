'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Badge, IdCard, Eye, EyeOff, Wifi, Shield, Zap } from 'lucide-react'


export default function LoginPage() {
  const router = useRouter()

  const [chapa, setChapa] = useState('')
  const [cpf, setCpf] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapa || !cpf) {
      setError('Preencha todos os campos.')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    const result = await signIn('credentials', {
      redirect: false,
      chapa,
      cpf,
    })
    
    if (result?.ok) {
      router.push('/painel')
    } else {
      setError('Chapa ou CPF inválidos.')
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setIsLoading(true)
    signIn('google')
  }


  return (
  <div className="min-h-screen bg-green-600 relative overflow-hidden">
      {/* Background Pattern - Criativo mas sutil */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute top-20 right-20 w-24 h-24 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-20 left-20 w-20 h-20 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-28 h-28 border-2 border-white rounded-full"></div>
        </div>
      </div>

      {/* Status Bar Mobile - Só aparece em mobile */}

      {/* Header - Design mais clean */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center mobile-safe-left mobile-safe-right relative z-10">
        <div className="w-full text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="relative flex items-center">
              <Image
                src="/logo_branca.svg"
                alt="EPAMIG"
                width={120}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </div>
            <span className="text-white text-2xl font-bold flex items-center">Conecta</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal - Layout mais compacto */}
  <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-6 mobile-safe-left mobile-safe-right relative z-10">
  <div className="w-full max-w-sm">
          {/* Card Principal - Design mais clean */}
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            {/* Ícone Central - Mais simples */}
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Wifi className="text-white" size={28} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Shield className="text-white" size={12} />
                </div>
              </div>
             
            </div>

            {/* Formulário - Mais compacto */}
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Campo Chapa */}
                <div>
                  <label htmlFor="chapa" className="block text-sm font-semibold text-gray-700 mb-2">
                    Chapa
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                      <Badge size={18} />
                    </div>
                    <input
                      type="text"
                      id="chapa"
                      inputMode="numeric"
                      pattern="\d*"
                      autoComplete="off"
                      value={chapa}
                      onChange={(e) => setChapa(e.target.value.replace(/\D/g, ""))}
                      placeholder="Digite sua chapa"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 text-gray-800 placeholder-gray-500 font-medium text-base group-hover:border-gray-300"
                    />
                  </div>
                </div>

                {/* Campo CPF */}
                <div>
                  <label htmlFor="cpf" className="block text-sm font-semibold text-gray-700 mb-2">
                    CPF
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                      <IdCard size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="cpf"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={11}
                      autoComplete="off"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value.replace(/\D/g, ""))}
                      placeholder="Digite seu CPF"
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all duration-200 text-gray-800 placeholder-gray-500 font-medium text-base group-hover:border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Mensagem de erro */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 animate-shake">
                    <p className="text-red-600 text-sm font-medium text-center">{error}</p>
                  </div>
                )}

                {/* Botão de login */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Entrar
                    </>
                  )}
                </button>
              </form>

              {/* Separador - Mais criativo */}
              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <div className="px-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mx-auto"></div>
                </div>
                <span className="px-3 text-gray-500 text-sm font-medium">ou</span>
                <div className="px-3">
                  <div className="w-2 h-2 bg-green-600 rounded-full mx-auto"></div>
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Botão Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 text-base shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <Image
                  src="/google-icon.svg"
                  alt="Google"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
                Entrar com Google
              </button>
            </div>
          </div>

          {/* Footer Institucional */}
          <div className="text-center mt-4">
            <p className="text-white/80 text-xs">
              Sistema Integrado da EPAMIG
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Safe Area - Só em mobile */}

    </div>
  )
}
