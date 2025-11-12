"use client";

import { useState } from "react";

interface Arquivo {
  id: number;
  tipo: string;
  nome: string;
  url: string;
  obra_id?: number;
}

interface ArquivoContrato {
  id: number;
  tipo: string;
  nome: string;
  url: string;
  obra_id: number;
}

interface Obra {
  id: number;
  contrato_id: number;
  status_id: number;
  numero_contrato: string | null;
  objeto_contrato: string | null;
  valor_contrato: number | null;
  regional_nome: string;
  arquivos: Arquivo[];
  arquivos_contrato?: ArquivoContrato[];
}

interface ObraDetalhesProps {
  obra: Obra;
  onClose: () => void;
}

const tiposProjetos: { [key: string]: { label: string; icon: string } } = {
  'projeto_arquitetonico_pdf': { label: 'Projeto Arquitetônico (PDF)', icon: '📐' },
  'projeto_arquitetonico_dwg': { label: 'Projeto Arquitetônico (DWG)', icon: '📐' },
  'projeto_estrutural_pdf': { label: 'Projeto Estrutural (PDF)', icon: '🏗️' },
  'projeto_estrutural_dwg': { label: 'Projeto Estrutural (DWG)', icon: '🏗️' },
  'projeto_fundacoes_pdf': { label: 'Projeto de Fundações (PDF)', icon: '⚓' },
  'projeto_fundacoes_dwg': { label: 'Projeto de Fundações (DWG)', icon: '⚓' },
  'projeto_hidrossanitario_pdf': { label: 'Projeto Hidrossanitário (PDF)', icon: '💧' },
  'projeto_hidrossanitario_dwg': { label: 'Projeto Hidrossanitário (DWG)', icon: '💧' },
  'projeto_eletrico_pdf': { label: 'Projeto Elétrico (PDF)', icon: '⚡' },
  'projeto_eletrico_dwg': { label: 'Projeto Elétrico (DWG)', icon: '⚡' },
  'projeto_luminotecnico_pdf': { label: 'Projeto Luminotécnico (PDF)', icon: '💡' },
  'projeto_luminotecnico_dwg': { label: 'Projeto Luminotécnico (DWG)', icon: '💡' },
  'projeto_terraplanagem_pdf': { label: 'Projeto Terraplanagem (PDF)', icon: '🏔️' },
  'projeto_terraplanagem_dwg': { label: 'Projeto Terraplanagem (DWG)', icon: '🏔️' },
  'projeto_pci_pdf': { label: 'Projeto PCI (PDF)', icon: '🔥' },
  'projeto_pci_dwg': { label: 'Projeto PCI (DWG)', icon: '🔥' },
  'arquivo_outros': { label: 'Outros Arquivos', icon: '📁' },
};

const tiposDocumentos: { [key: string]: { label: string; icon: string } } = {
  'Basico': { label: 'Básico', icon: '📄' },
  'Executivo': { label: 'Executivo', icon: '📋' },
  'Obra_foto': { label: 'Foto da Obra', icon: '📸' },
};

const tiposMedicao: { [key: string]: { label: string; icon: string } } = {
  'Relatorio': { label: 'Relatório de Acompanhamento', icon: '📊' },
  'Fiscal': { label: 'Nota Fiscal', icon: '💰' },
  'Cronograma': { label: 'Cronograma de Acompanhamento', icon: '📅' },
  'Acompanhamento_Medicao_XLS': { label: 'Acompanhamento Medição XLS', icon: '📈' },
  'Medicaopdf': { label: 'Medição PDF', icon: '📏' },
};

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
  1: "#ef4444",
  2: "#f59e0b",
  3: "#3b82f6",
  4: "#f97316",
  5: "#6b7280",
  6: "#10b981",
  7: "#8b5cf6",
};

export default function ObraDetalhes({ obra, onClose }: ObraDetalhesProps) {
  const [abaAtiva, setAbaAtiva] = useState<'projetos' | 'documentos' | 'medicao'>('projetos');

  // Agrupar arquivos por tipo
  const agruparArquivosPorTipo = (arquivos: Arquivo[]) => {
    const grupos: { [key: string]: Arquivo[] } = {};
    arquivos.forEach(arq => {
      if (!grupos[arq.tipo]) {
        grupos[arq.tipo] = [];
      }
      grupos[arq.tipo].push(arq);
    });
    return grupos;
  };

  const arquivosPorTipo = agruparArquivosPorTipo(obra.arquivos);
  const arquivosContratoPorTipo = obra.arquivos_contrato
    ? agruparArquivosPorTipo(obra.arquivos_contrato)
    : {};

  const formatarValor = (valor: number | null): string => {
    if (!valor || valor === 0 || isNaN(valor)) return "Não informado";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const renderArquivo = (arquivo: Arquivo, mostrarOrigem: boolean = false) => (
    <div
      key={arquivo.id}
      className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
    >
      <a
        href={arquivo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-sm text-green-700 hover:text-green-900 truncate flex items-center gap-2"
      >
        <span className="text-green-600">📥</span>
        <span className="truncate">{arquivo.nome}</span>
      </a>
      {mostrarOrigem && arquivo.obra_id !== obra.id && (
        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
          Aditivo
        </span>
      )}
    </div>
  );

  const renderSecaoProjetos = () => {
    const projetosNaObra = Object.keys(tiposProjetos).filter(tipo => arquivosPorTipo[tipo]);
    const projetosNoContrato = Object.keys(tiposProjetos).filter(tipo => arquivosContratoPorTipo[tipo]);

    if (projetosNaObra.length === 0 && projetosNoContrato.length === 0) {
      return <p className="text-gray-500 text-center py-8">Nenhum projeto cadastrado</p>;
    }

    // Combinar projetos únicos
    const tiposUnicos = [...new Set([...projetosNaObra, ...projetosNoContrato])];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {tiposUnicos.map(tipo => {
          const config = tiposProjetos[tipo];
          const arquivosDaObra = arquivosPorTipo[tipo] || [];
          const arquivosDoContrato = arquivosContratoPorTipo[tipo] || [];
          const todosArquivos = [...arquivosDaObra, ...arquivosDoContrato];

          return (
            <div key={tipo} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <h4 className="font-semibold text-sm text-gray-800">{config.label}</h4>
              </div>
              <div className="space-y-2">
                {todosArquivos.map(arq => renderArquivo(arq, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSecaoDocumentos = () => {
    const documentosNaObra = Object.keys(tiposDocumentos).filter(tipo => arquivosPorTipo[tipo]);
    const documentosNoContrato = Object.keys(tiposDocumentos).filter(tipo => arquivosContratoPorTipo[tipo]);

    if (documentosNaObra.length === 0 && documentosNoContrato.length === 0) {
      return <p className="text-gray-500 text-center py-8">Nenhum documento cadastrado</p>;
    }

    const tiposUnicos = [...new Set([...documentosNaObra, ...documentosNoContrato])];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {tiposUnicos.map(tipo => {
          const config = tiposDocumentos[tipo];
          const arquivosDaObra = arquivosPorTipo[tipo] || [];
          const arquivosDoContrato = arquivosContratoPorTipo[tipo] || [];
          const todosArquivos = [...arquivosDaObra, ...arquivosDoContrato];

          return (
            <div key={tipo} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <h4 className="font-semibold text-sm text-gray-800">{config.label}</h4>
              </div>
              <div className="space-y-2">
                {todosArquivos.map(arq => renderArquivo(arq, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSecaoMedicao = () => {
    const medicoesNaObra = Object.keys(tiposMedicao).filter(tipo => arquivosPorTipo[tipo]);
    const medicoesNoContrato = Object.keys(tiposMedicao).filter(tipo => arquivosContratoPorTipo[tipo]);

    if (medicoesNaObra.length === 0 && medicoesNoContrato.length === 0) {
      return <p className="text-gray-500 text-center py-8">Nenhum documento de medição cadastrado</p>;
    }

    const tiposUnicos = [...new Set([...medicoesNaObra, ...medicoesNoContrato])];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {tiposUnicos.map(tipo => {
          const config = tiposMedicao[tipo];
          const arquivosDaObra = arquivosPorTipo[tipo] || [];
          const arquivosDoContrato = arquivosContratoPorTipo[tipo] || [];
          const todosArquivos = [...arquivosDaObra, ...arquivosDoContrato];

          return (
            <div key={tipo} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{config.icon}</span>
                <h4 className="font-semibold text-sm text-gray-800">{config.label}</h4>
              </div>
              <div className="space-y-2">
                {todosArquivos.map(arq => renderArquivo(arq, true))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-800 to-green-600 text-white p-6 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Detalhes da Obra</h2>
            <p className="text-green-100 text-sm">{obra.regional_nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Informações do Contrato */}
        <div className="bg-green-50 border-b-2 border-green-800 p-4">
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
            <span>📋</span> Contrato Associado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Nº Contrato</p>
              <p className="font-semibold text-gray-900">
                {obra.numero_contrato || 'Não informado'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Valor</p>
              <p className="font-semibold text-green-700">
                {formatarValor(obra.valor_contrato)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Status</p>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: statusColors[obra.status_id] }}
              >
                {statusNames[obra.status_id]}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Objeto</p>
              <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                {obra.objeto_contrato || 'Não informado'}
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setAbaAtiva('projetos')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                abaAtiva === 'projetos'
                  ? 'border-green-800 text-green-800 bg-white'
                  : 'border-transparent text-gray-600 hover:text-green-800 hover:border-gray-300'
              }`}
            >
              📐 Projetos de Engenharia
            </button>
            <button
              onClick={() => setAbaAtiva('documentos')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                abaAtiva === 'documentos'
                  ? 'border-green-800 text-green-800 bg-white'
                  : 'border-transparent text-gray-600 hover:text-green-800 hover:border-gray-300'
              }`}
            >
              📁 Documentos da Obra
            </button>
            <button
              onClick={() => setAbaAtiva('medicao')}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                abaAtiva === 'medicao'
                  ? 'border-green-800 text-green-800 bg-white'
                  : 'border-transparent text-gray-600 hover:text-green-800 hover:border-gray-300'
              }`}
            >
              📊 Medição e Acompanhamento
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {abaAtiva === 'projetos' && renderSecaoProjetos()}
          {abaAtiva === 'documentos' && renderSecaoDocumentos()}
          {abaAtiva === 'medicao' && renderSecaoMedicao()}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

