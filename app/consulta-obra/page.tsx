"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import ObraDetalhes from "@/components/ObraDetalhes";
import "./consulta-obra.css";

interface Arquivo {
  id: number;
  tipo: string;
  nome: string;
  url: string;
  obra_id?: number;
}

interface ArquivoContratoBase {
  nome: string;
  url: string;
  historico_id: number;
  valor: number | null;
}

interface ObraContratoInfo {
  contrato_numero: string;
  instrumento_nome: string;
  label: string;
}

interface Obra {
  id: number;
  contrato_id: number;
  status_id: number;
  unidade_id: number;
  regional_nome: string;
  numero_contrato: string | null;
  objeto_contrato: string | null;
  valor_contrato: number | null;
  instrumento_nome?: string | null;
  arquivos: Arquivo[];
  arquivos_contrato?: Arquivo[];
  arquivos_contrato_base?: ArquivoContratoBase[];
  obras_contrato_info?: { [obraId: number]: ObraContratoInfo };
}

interface ContratoOption {
  numero: string;
  objeto: string;
  display: string;
}

interface StatusCount {
  status_id: number;
  total: number;
}

interface Regional {
  id: number;
  nome: string;
}

const statusNames: { [key: number]: string } = {
  1: "Sem Pagamento",
  2: "Não Iniciado",
  3: "Em Andamento",
  4: "Início de Paralisação",
  5: "Paralisado",
  6: "Concluído",
  7: "Elaboração de Projetos",
};

const statusColors: { [key: number]: string } = {
  1: "#ef4444", // red-500
  2: "#f59e0b", // amber-500
  3: "#3b82f6", // blue-500
  4: "#f97316", // orange-500
  5: "#6b7280", // gray-500
  6: "#10b981", // green-500
  7: "#8b5cf6", // violet-500
};

const tipoArquivoLabels: { [key: string]: string } = {
  "Relatorio": "Relatório de Acompanhamento",
  "Fiscal": "Nota Fiscal",
  "Cronograma": "Cronograma de Acompanhamento",
  "Medicaopdf": "Medição",
  "Aditivo": "Aditivo da Obra",
  "projeto_aditivado": "Projeto Aditivado",
};

// Funções auxiliares movidas para fora para evitar recriação
const getTipoArquivoLabel = (tipo: string): string => {
  return tipoArquivoLabels[tipo] || tipo;
};

const getStatusName = (statusId: number): string => {
  return statusNames[statusId] || `Status ${statusId}`;
};

const getStatusColor = (statusId: number): string => {
  return statusColors[statusId] || "#6b7280";
};

const formatarValor = (valor: number | null): string => {
  if (!valor || valor === 0 || isNaN(valor)) return "";

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
};

export default function ConsultaObra() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [statusCount, setStatusCount] = useState<StatusCount[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [contratosDisponiveis, setContratosDisponiveis] = useState<ContratoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados dos filtros
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedUnidade, setSelectedUnidade] = useState<string>('');
  const [contratoSearch, setContratoSearch] = useState<string>('');
  const [showContratoDropdown, setShowContratoDropdown] = useState<boolean>(false);
  const [modalArquivos, setModalArquivos] = useState<Arquivo[] | null>(null);
  const [showModalArquivos, setShowModalArquivos] = useState<boolean>(false);
  const [modalContrato, setModalContrato] = useState<{numero: string, objeto: string} | null>(null);
  const [showModalContrato, setShowModalContrato] = useState<boolean>(false);
  const [showRelatorioFinanceiro, setShowRelatorioFinanceiro] = useState<boolean>(false);
  const [abaAtiva, setAbaAtiva] = useState<'status' | 'regional' | 'graficos'>('status');
  const [obraSelecionada, setObraSelecionada] = useState<Obra | null>(null);

  const abrirDetalhesObra = (obra: Obra) => {
    setObraSelecionada(obra);
  };

  const fecharDetalhesObra = () => {
    setObraSelecionada(null);
  };

  const fecharModalArquivos = () => {
    setShowModalArquivos(false);
    setModalArquivos(null);
  };

  const abrirModalContrato = (numero: string, objeto: string) => {
    setModalContrato({ numero, objeto });
    setShowModalContrato(true);
  };

  const fecharModalContrato = () => {
    setShowModalContrato(false);
    setModalContrato(null);
  };

  const abrirRelatorioFinanceiro = () => {
    setShowRelatorioFinanceiro(true);
  };

  const fecharRelatorioFinanceiro = () => {
    setShowRelatorioFinanceiro(false);
  };

  const getTotalObras = useCallback(() => {
    return statusCount.reduce((acc, item) => acc + item.total, 0);
  }, [statusCount]);

  const getPercentage = useCallback((total: number): number => {
    const totalObras = getTotalObras();
    return totalObras > 0 ? (total / totalObras) * 100 : 0;
  }, [getTotalObras]);

  // Cálculos financeiros por status (memoizado)
  const financeirosPorStatus = useMemo(() => {
    const financeiros: { [key: number]: { total: number; valor: number; obras_com_valor: number } } = {};
    
    obras.forEach(obra => {
      if (!financeiros[obra.status_id]) {
        financeiros[obra.status_id] = { total: 0, valor: 0, obras_com_valor: 0 };
      }
      financeiros[obra.status_id].total += 1;
      
      if (obra.valor_contrato && !isNaN(obra.valor_contrato) && obra.valor_contrato > 0) {
        financeiros[obra.status_id].valor += obra.valor_contrato;
        financeiros[obra.status_id].obras_com_valor += 1;
      }
    });

    return Object.entries(financeiros).map(([statusId, data]) => ({
      status_id: parseInt(statusId),
      status_nome: getStatusName(parseInt(statusId)),
      cor: getStatusColor(parseInt(statusId)),
      total_obras: data.total,
      obras_com_valor: data.obras_com_valor,
      valor_total: data.valor
    })).sort((a, b) => b.valor_total - a.valor_total);
  }, [obras]);

  // Cálculos financeiros por regional (memoizado)
  const financeirosPorRegional = useMemo(() => {
    const financeiros: { [key: string]: { total: number; valor: number; obras_com_valor: number } } = {};
    
    obras.forEach(obra => {
      const regional = obra.regional_nome || 'Não informado';
      if (!financeiros[regional]) {
        financeiros[regional] = { total: 0, valor: 0, obras_com_valor: 0 };
      }
      financeiros[regional].total += 1;
      
      if (obra.valor_contrato && !isNaN(obra.valor_contrato) && obra.valor_contrato > 0) {
        financeiros[regional].valor += obra.valor_contrato;
        financeiros[regional].obras_com_valor += 1;
      }
    });

    return Object.entries(financeiros).map(([nome, data]) => ({
      regional_nome: nome,
      total_obras: data.total,
      obras_com_valor: data.obras_com_valor,
      valor_total: data.valor
    })).sort((a, b) => b.valor_total - a.valor_total);
  }, [obras]);

  // Calcular totais gerais (memoizado)
  const totaisGerais = useMemo(() => {
    const total_obras = obras.length;
    
    const obrasComValor = obras.filter(obra =>
      obra.valor_contrato && !isNaN(obra.valor_contrato) && obra.valor_contrato > 0
    );
    
    const valor_total = obrasComValor.reduce((acc, obra) => acc + (obra.valor_contrato || 0), 0);
    const obras_sem_valor = total_obras - obrasComValor.length;
    const valor_medio = obrasComValor.length > 0 ? valor_total / obrasComValor.length : 0;

    return {
      total_obras,
      obras_com_valor: obrasComValor.length,
      valor_total,
      obras_sem_valor,
      valor_medio
    };
  }, [obras]);

  const fetchObras = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== "all") params.append("status_id", selectedStatus);
      if (selectedUnidade !== "all") params.append("unidade_id", selectedUnidade);
      
      const response = await fetch(`/api/consulta-obra?${params.toString()}`);
      const data = await response.json();

      console.log("Resposta da API:", data);

      if (data.success) {
        console.log("Total de obras recebidas:", data.obras?.length);

        // Agrupa as obras por numero_contrato, mantendo apenas a mais recente (maior id)
        const obrasAgrupadas: { [key: string]: Obra } = {};
        data.obras.forEach((obra: Obra) => {
          const key = obra.numero_contrato || `sem-contrato-${obra.id}`;
          if (!obrasAgrupadas[key] || obra.id > obrasAgrupadas[key].id) {
            obrasAgrupadas[key] = obra;
          }
        });
        const obrasProcessadas = Object.values(obrasAgrupadas);

        setObras(obrasProcessadas);
        setStatusCount(data.statusCount);
        if (data.regionais) setRegionais(data.regionais);
        
        // Extrair contratos únicos disponíveis com objeto
        const contratosMap = new Map<string, ContratoOption>();
        obrasProcessadas.forEach((obra: Obra) => {
          if (obra.numero_contrato) {
            const key = obra.numero_contrato;
            if (!contratosMap.has(key)) {
              contratosMap.set(key, {
                numero: obra.numero_contrato,
                objeto: obra.objeto_contrato || "Sem descrição",
                display: `${obra.numero_contrato} - ${obra.objeto_contrato || "Sem descrição"}`
              });
            }
          }
        });
        
        const contratos = Array.from(contratosMap.values()).sort((a, b) => 
          a.numero.localeCompare(b.numero)
        );
        setContratosDisponiveis(contratos);
      } else {
        console.error("Erro da API:", data.error, data.details);
        setError(data.error || "Erro ao carregar obras");
      }
    } catch (err) {
      console.error("Erro ao buscar obras:", err);
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedUnidade]);

  useEffect(() => {
    fetchObras();
  }, [fetchObras]);

  const handleClearFilters = () => {
    setSelectedStatus("all");
    setSelectedUnidade("all");
    setContratoSearch("");
  };

  // Filtrar obras por contrato digitado (memoizado)
  const obrasFiltradas = useMemo(() => {
    if (!contratoSearch) return obras;

    const searchTerm = contratoSearch.toLowerCase();

    return obras.filter((obra) => {
      const numeroContrato = obra.numero_contrato?.toLowerCase() || "";
      return numeroContrato.includes(searchTerm);
    });
  }, [obras, contratoSearch]);

  // Filtrar lista de contratos conforme digitação (memoizado)
  const contratosFiltrados = useMemo(() =>
    contratosDisponiveis.filter((contrato) =>
      contrato.display.toLowerCase().includes(contratoSearch.toLowerCase())
    ), [contratosDisponiveis, contratoSearch]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-24">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Consulta de Obras Públicas
          </h1>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: '#025C3E20' }}
              >
                <option value="all">Todos os Status</option>
                {Object.entries(statusNames).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Regional
              </label>
              <select
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                style={{ borderColor: '#025C3E20' }}
              >
                <option value="all">Todas as Regionais</option>
                {regionais.map((regional) => (
                  <option key={regional.id} value={regional.id}>
                    {regional.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Nº Contrato
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={contratoSearch}
                  onChange={(e) => {
                    setContratoSearch(e.target.value);
                    setShowContratoDropdown(true);
                  }}
                  onFocus={() => setShowContratoDropdown(true)}
                  placeholder="Digite para buscar..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    borderColor: showContratoDropdown ? '#025C3E' : '#e5e7eb',
                    boxShadow: showContratoDropdown ? '0 0 0 3px rgba(2, 92, 62, 0.1)' : 'none'
                  }}
                />
                <svg 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {showContratoDropdown && contratosFiltrados.length > 0 && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowContratoDropdown(false)}
                  ></div>
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                    {contratosFiltrados.map((contrato, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setContratoSearch(contrato.numero);
                          setShowContratoDropdown(false);
                        }}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm" style={{ color: '#025C3E' }}>
                            {contrato.numero}
                          </span>
                          <span className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {contrato.objeto}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity font-medium"
                style={{ backgroundColor: '#025C3E' }}
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
            <span className="ml-3 text-gray-600">Carregando obras...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela de Obras */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="text-white" style={{ backgroundColor: '#025C3E' }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Nº Contrato
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Valor
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">
                          Regional
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold">
                          Arquivos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {obrasFiltradas.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            Nenhuma obra encontrada
                          </td>
                        </tr>
                      ) : (
                        obrasFiltradas.map((obra) => (
                          <tr
                            key={obra.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm">
                              {obra.numero_contrato ? (
                                <button
                                  onClick={() => abrirModalContrato(obra.numero_contrato || '', obra.objeto_contrato || '')}
                                  className="group w-full text-left p-3 transition-all hover:shadow-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4" style={{ color: '#025C3E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="font-semibold" style={{ color: '#025C3E' }}>
                                        {obra.numero_contrato}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 rounded" style={{ 
                                      backgroundColor: '#025C3E',
                                      color: 'white'
                                    }}>
                                      Ver detalhes
                                    </span>
                                  </div>
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">Sem contrato</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {formatarValor(obra.valor_contrato)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className="px-3 py-1 rounded-full text-white font-medium text-xs"
                                style={{
                                  backgroundColor: getStatusColor(obra.status_id),
                                }}
                              >
                                {getStatusName(obra.status_id)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {obra.regional_nome || "Não informado"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => abrirDetalhesObra(obra)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all hover:shadow-lg"
                                style={{ backgroundColor: '#025C3E' }}
                                title="Ver detalhes da obra"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Detalhes
                                {obra.arquivos && obra.arquivos.length > 0 && (
                                  <span className="ml-1 bg-white bg-opacity-30 px-2 py-0.5 rounded-full text-xs">
                                    {obra.arquivos.length}
                                  </span>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Total de obras: <strong>{obrasFiltradas.length}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfico de Status */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Total de Obras: {obras.length}
                </h2>
                
                <div className="space-y-4">
                  {statusCount.map((item) => (
                    <div key={item.status_id} className="status-item">
                      <div className="flex justify-between items-center mb-2">
                        <span
                          className="text-sm font-medium flex items-center gap-2"
                          style={{ color: getStatusColor(item.status_id) }}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getStatusColor(item.status_id),
                            }}
                          ></span>
                          {getStatusName(item.status_id)}
                        </span>
                        <span className="text-sm font-bold text-gray-700">
                          {item.total}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${getPercentage(item.total)}%`,
                            backgroundColor: getStatusColor(item.status_id),
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {getPercentage(item.total).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>

                {statusCount.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum dado disponível
                  </p>
                )}

                {/* Botão Relatório Financeiro */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={abrirRelatorioFinanceiro}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-lg transition-all hover:shadow-lg"
                    style={{ backgroundColor: '#025C3E' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#014830';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#025C3E';
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Relatório Financeiro
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Modal de Arquivos */}
      {showModalArquivos && modalArquivos && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={fecharModalArquivos}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal - Fixo */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#1E3A8A' }}>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Arquivos PDF ({modalArquivos.length})
                </h3>
              </div>
              <button
                onClick={fecharModalArquivos}
                className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded"
                title="Fechar modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo do Modal - Com Scroll */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalArquivos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum arquivo disponível</p>
              ) : (
                <div className="space-y-3">
                  {modalArquivos.map((arquivo) => (
                    <a
                      key={arquivo.id}
                      href={arquivo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-700 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex-shrink-0 mr-4">
                        <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded whitespace-nowrap" style={{ backgroundColor: '#1E3A8A', color: 'white' }}>
                            {getTipoArquivoLabel(arquivo.tipo)}
                          </span>
                          <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-800">
                            {arquivo.nome}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Clique para abrir em nova aba
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do Modal - Fixo no rodapé */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end shadow-lg">
              <button
                onClick={fecharModalArquivos}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: '#dc2626' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Contrato */}
      {showModalContrato && modalContrato && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={fecharModalContrato}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal - Fixo */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025C3E' }}>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Detalhes do Contrato
                </h3>
              </div>
              <button
                onClick={fecharModalContrato}
                className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded"
                title="Fechar modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo do Modal - Com Scroll se necessário */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600 block mb-2">
                    Número do Contrato
                  </label>
                  <p className="text-2xl font-bold" style={{ color: '#025C3E' }}>
                    {modalContrato.numero}
                  </p>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-semibold text-gray-600 block mb-2">
                    Objeto do Contrato
                  </label>
                  <p className="text-base text-gray-800 leading-relaxed">
                    {modalContrato.objeto || "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer do Modal - Fixo no rodapé */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end shadow-lg">
              <button
                onClick={fecharModalContrato}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: '#dc2626' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Relatório Financeiro */}
      {showRelatorioFinanceiro && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={fecharRelatorioFinanceiro}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025C3E' }}>
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Relatório Financeiro - Auditoria de Obras
                </h3>
              </div>
              <button
                onClick={fecharRelatorioFinanceiro}
                className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Abas */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
              <div className="flex">
                <button
                  onClick={() => setAbaAtiva('status')}
                  className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
                    abaAtiva === 'status' 
                      ? 'border-b-2 text-white' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                  style={abaAtiva === 'status' ? { borderColor: '#025C3E', backgroundColor: '#025C3E' } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Por Status
                  </div>
                </button>
                <button
                  onClick={() => setAbaAtiva('regional')}
                  className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
                    abaAtiva === 'regional' 
                      ? 'border-b-2 text-white' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                  style={abaAtiva === 'regional' ? { borderColor: '#025C3E', backgroundColor: '#025C3E' } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Gráfico Financeiro
                  </div>
                </button>
                <button
                  onClick={() => setAbaAtiva('graficos')}
                  className={`flex-1 px-6 py-3 font-semibold text-sm transition-all ${
                    abaAtiva === 'graficos' 
                      ? 'border-b-2 text-white' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                  style={abaAtiva === 'graficos' ? { borderColor: '#025C3E', backgroundColor: '#025C3E' } : {}}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Análise Geral
                  </div>
                </button>
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Aba: Por Status */}
              {abaAtiva === 'status' && (
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Extrato Financeiro por Status</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border">Qtd Obras</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">Valor Total</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border">% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeirosPorStatus.map((item, index) => {
                          const totais = totaisGerais;
                          const percentual = totais.valor_total > 0 ? (item.valor_total / totais.valor_total * 100) : 0;
                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.cor }}></span>
                                  <span className="font-medium">{item.status_nome}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center border font-semibold">{item.total_obras}</td>
                              <td className="px-4 py-3 text-right border font-bold text-green-700">
                                {item.valor_total > 0 ? formatarValor(item.valor_total) : (
                                  <span className="text-gray-400 font-normal text-sm">Sem valor</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right border text-gray-600">
                                {item.valor_total > 0 ? `${percentual.toFixed(2)}%` : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-200 font-bold">
                          <td className="px-4 py-3 border">TOTAL GERAL</td>
                          <td className="px-4 py-3 text-center border">{totaisGerais.total_obras}</td>
                          <td className="px-4 py-3 text-right border text-green-800">
                            {totaisGerais.valor_total > 0 ? formatarValor(totaisGerais.valor_total) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right border">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Aba: Por Regional - Agora mostra Gráfico de Pizza por Status */}
              {abaAtiva === 'regional' && (
                <div>
                  <h4 className="text-lg font-bold text-gray-800 mb-6 text-center">Financeiro por Status</h4>
                  
                  <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
                    {/* Gráfico de Pizza (SVG) */}
                    <div className="relative" style={{ width: '320px', height: '320px' }}>
                      <svg viewBox="0 0 200 200" className="transform -rotate-90">
                        {(() => {
                          const financeiros = financeirosPorStatus;
                          const totais = totaisGerais;
                          let currentAngle = 0;
                          
                          return financeiros.map((item, index) => {
                            if (item.valor_total === 0) return null;
                            
                            const percentage = totais.valor_total > 0 ? (item.valor_total / totais.valor_total) : 0;
                            const angle = percentage * 360;
                            const radius = 80;
                            const centerX = 100;
                            const centerY = 100;
                            
                            // Calcular coordenadas do arco
                            const startAngle = currentAngle;
                            const endAngle = currentAngle + angle;
                            
                            const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
                            const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
                            const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
                            const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            const pathData = [
                              `M ${centerX} ${centerY}`,
                              `L ${startX} ${startY}`,
                              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                              'Z'
                            ].join(' ');
                            
                            currentAngle += angle;
                            
                            return (
                              <path
                                key={index}
                                d={pathData}
                                fill={item.cor}
                                stroke="white"
                                strokeWidth="2"
                                className="transition-opacity hover:opacity-80"
                              />
                            );
                          });
                        })()}
                        
                        {/* Círculo branco no centro para efeito de donut */}
                        <circle cx="100" cy="100" r="50" fill="white" />
                      </svg>
                      
                      {/* Texto no centro */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {totaisGerais.total_obras}
                        </div>
                        <div className="text-sm text-gray-600">Obras</div>
                      </div>
                    </div>
                    
                    {/* Legenda */}
                    <div className="space-y-3">
                      {financeirosPorStatus.map((item, index) => {
                        const totais = totaisGerais;
                        const percentual = totais.valor_total > 0 ? (item.valor_total / totais.valor_total * 100) : 0;
                        
                        return (
                          <div key={index} className="flex items-center gap-3 min-w-[280px]">
                            <div 
                              className="w-6 h-6 rounded flex-shrink-0"
                              style={{ backgroundColor: item.cor }}
                            ></div>
                            <div className="flex-1">
                              <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold text-gray-700">
                                  {item.status_nome}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {item.total_obras} {item.total_obras === 1 ? 'obra' : 'obras'}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline mt-0.5">
                                <span className="text-sm font-bold text-green-700">
                                  {item.valor_total > 0 ? formatarValor(item.valor_total) : (
                                    <span className="text-gray-400 font-normal text-xs">Sem valor</span>
                                  )}
                                </span>
                                {item.valor_total > 0 && (
                                  <span className="text-xs font-semibold text-gray-600">
                                    {percentual.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total */}
                      <div className="pt-3 mt-3 border-t-2 border-gray-300">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-bold text-gray-800">
                                TOTAL GERAL
                              </span>
                              <span className="text-xs text-gray-600">
                                {totaisGerais.total_obras} obras
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline mt-0.5">
                              <span className="text-base font-bold text-green-800">
                                {totaisGerais.valor_total > 0 ? formatarValor(totaisGerais.valor_total) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </span>
                              <span className="text-xs font-bold text-gray-700">
                                100%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba: Análise Geral */}
              {abaAtiva === 'graficos' && (
                <div className="space-y-6">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">Análise Geral do Portfólio</h4>
                  
                  {/* Cards de Resumo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <div className="text-sm text-blue-700 font-medium">Total de Obras</div>
                      <div className="text-2xl font-bold text-blue-900">{totaisGerais.total_obras}</div>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <div className="text-sm text-green-700 font-medium">Valor Total</div>
                      <div className="text-xl font-bold text-green-900">
                        {totaisGerais.valor_total > 0 ? formatarValor(totaisGerais.valor_total) : (
                          <span className="text-gray-400 text-lg">Sem valor</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <div className="text-sm text-yellow-700 font-medium">Valor Médio</div>
                      <div className="text-xl font-bold text-yellow-900">
                        {totaisGerais.valor_medio > 0 ? formatarValor(totaisGerais.valor_medio) : (
                          <span className="text-gray-400 text-lg">Sem valor</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <div className="text-sm text-red-700 font-medium">Sem Valor Informado</div>
                      <div className="text-2xl font-bold text-red-900">{totaisGerais.obras_sem_valor}</div>
                    </div>
                  </div>

                  {/* Gráfico de Barras - Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="font-bold text-gray-700 mb-4">Distribuição de Valores por Status</h5>
                    <div className="space-y-3">
                      {financeirosPorStatus.map((item, index) => {
                        const totais = totaisGerais;
                        const percentual = totais.valor_total > 0 ? (item.valor_total / totais.valor_total * 100) : 0;
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{item.status_nome}</span>
                              <span className="text-sm font-bold text-gray-900">
                                {item.valor_total > 0 ? formatarValor(item.valor_total) : (
                                  <span className="text-gray-400 font-normal text-xs">Sem valor</span>
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div 
                                className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold transition-all"
                                style={{ 
                                  width: `${percentual}%`,
                                  backgroundColor: item.cor,
                                  minWidth: percentual > 0 ? '40px' : '0'
                                }}
                              >
                                {percentual > 5 && `${percentual.toFixed(1)}%`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gráfico de Barras - Regional */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h5 className="font-bold text-gray-700 mb-4">Distribuição de Valores por Regional</h5>
                    <div className="space-y-3">
                      {financeirosPorRegional.map((item, index) => {
                        const totais = totaisGerais;
                        const percentual = totais.valor_total > 0 ? (item.valor_total / totais.valor_total * 100) : 0;
                        const cores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                        const cor = cores[index % cores.length];
                        return (
                          <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{item.regional_nome}</span>
                              <span className="text-sm font-bold text-gray-900">
                                {item.valor_total > 0 ? formatarValor(item.valor_total) : (
                                  <span className="text-gray-400 font-normal text-xs">Sem valor</span>
                                )}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                              <div 
                                className="h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-semibold transition-all"
                                style={{ 
                                  width: `${percentual}%`,
                                  backgroundColor: cor,
                                  minWidth: percentual > 0 ? '40px' : '0'
                                }}
                              >
                                {percentual > 5 && `${percentual.toFixed(1)}%`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Dados atualizados:</span> {new Date().toLocaleString('pt-BR')}
              </div>
              <button
                onClick={fecharRelatorioFinanceiro}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
                style={{ backgroundColor: '#dc2626' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Obra */}
      {obraSelecionada && (
        <ObraDetalhes obra={obraSelecionada} onClose={fecharDetalhesObra} />
      )}
    </div>
  );
}