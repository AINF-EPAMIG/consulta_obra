import { NextRequest, NextResponse } from "next/server";
import { obrasDB, contratosDB } from "@/lib/db";
import { RowDataPacket, PoolConnection } from "mysql2/promise";

export async function GET(request: NextRequest) {
  let connectionObras: PoolConnection | undefined;
  let connectionContratos: PoolConnection | undefined;
  
  try {
    // Obter parâmetros de filtro da URL
    const { searchParams } = new URL(request.url);
    const statusId = searchParams.get('status_id');
    const unidadeId = searchParams.get('unidade_id');
    
    // Tentar obter conexão com banco de obras
    connectionObras = await obrasDB.getConnection();
    console.log("Conexão com banco de obras estabelecida");
    
  // Construir query com filtros dinâmicos
  const whereConditions: string[] = [];
  const queryParams: unknown[] = [];
    
    if (statusId && statusId !== 'all') {
      whereConditions.push('o.status_id = ?');
      queryParams.push(parseInt(statusId));
    }
    
    if (unidadeId && unidadeId !== 'all') {
      whereConditions.push('o.unidade_id = ?');
      queryParams.push(parseInt(unidadeId));
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Buscar obras com nome da regional - conectar ao banco de contratos para ordenar
    connectionContratos = await contratosDB.getConnection();
    console.log("Conexão com banco de contratos estabelecida");
    
    // Buscar obras com nome da regional e número do contrato para ordenar por ano
    const [obras] = await connectionObras.query<RowDataPacket[]>(
      `SELECT 
        o.id,
        o.contrato_id,
        o.contrato_numero,
        o.status_id,
        o.unidade_id,
        r.nome as regional_nome
       FROM (
          SELECT 
              *,
              ROW_NUMBER() OVER (PARTITION BY contrato_numero ORDER BY id DESC) as rn
          FROM obra
       ) o
       LEFT JOIN regional r ON o.unidade_id = r.id
       ${whereClause.replace('o.', '')}
       AND o.rn = 1
       ORDER BY o.contrato_id DESC, o.id DESC`,
      queryParams
    );

    console.log(`Total de obras encontradas: ${obras.length}`);

    // Filtrar apenas obras que possuem contrato_id válido
    const obrasComContratoId = obras.filter(obra => 
      obra.contrato_id && obra.contrato_id !== null && obra.contrato_id > 0
    );
    console.log(`Obras com contrato_id válido: ${obrasComContratoId.length} de ${obras.length}`);
    
    // Coletar IDs únicos de contratos para buscar em batch
    const contratoIds = [...new Set(obrasComContratoId.map(obra => obra.contrato_id))];
    console.log(`IDs únicos de contratos a buscar: ${contratoIds.join(', ')}`);
    
    // Buscar todos os contratos de uma vez (mais eficiente)
    const contratosMap = new Map<number, { numero_contrato?: string; objetoh?: string; valor?: number; instrumento_nome?: string; nome_area?: string | null }>();
    if (contratoIds.length > 0) {
      const placeholders = contratoIds.map(() => '?').join(',');

      // Primeiro tentar obter dados da tabela principal `contratos` (se existir)
      try {
        const [contratosPrincipais] = await connectionContratos.query<RowDataPacket[]>(
          `SELECT id, numero_contrato as numero_contratoh, objeto as objetoh, valor
           FROM contratos
           WHERE id IN (${placeholders})`,
          contratoIds
        );

        if (contratosPrincipais && contratosPrincipais.length > 0) {
        contratosPrincipais.forEach((c: RowDataPacket) => {
          const id = c.id as number;
          contratosMap.set(id, {
            numero_contrato: c.numero_contratoh as string,
            objetoh: c.objetoh as string,
            valor: Number(c.valor) || undefined,
          });
        });
          console.log(`Contratos encontrados na tabela contratos: ${contratosPrincipais.length}`);
        }
      } catch {
        // Se a tabela `contratos` não existir ou ocorrer erro, vamos usar o historico como fallback
        console.log('Tabela `contratos` não disponível ou falha na consulta, usando `historico` como fallback.');
      }

      // Buscar dados no `historico` para todos os IDs — usar `valorh` como fonte primária do valor
      const placeholdersHistAll = contratoIds.map(() => '?').join(',');

      // Fazer JOIN explícito com `area` via `area_idh` e selecionar `nome_area`
      const [contratosHistAll] = await connectionContratos.query<RowDataPacket[]>(
        `SELECT h.id, h.numero_contratoh, h.objetoh, h.dotacao_orcamentariah, h.valorh, i.nome_instrumento, a.nome_area
         FROM historico h
         LEFT JOIN instrumento i ON i.id = h.instrumento_id
         LEFT JOIN area a ON a.id = h.area_idh
         WHERE h.id IN (${placeholdersHistAll})
         ORDER BY CAST(SUBSTRING_INDEX(h.numero_contratoh, '/', 1) AS UNSIGNED) DESC, h.id DESC`,
        contratoIds
      );

      contratosHistAll.forEach((contrato: RowDataPacket) => {
        const id = contrato.id as number;
        // Atualizar ou criar entrada no mapa — valor deve vir de valorh
        const existing = contratosMap.get(id) || {};
        contratosMap.set(id, {
          numero_contrato: existing.numero_contrato || (contrato.numero_contratoh as string),
          objetoh: existing.objetoh || (contrato.objetoh as string),
          // Priorizar valorh do historico (valorh) como número
          valor: Number(contrato.valorh as unknown) || undefined,
          instrumento_nome: contrato.nome_instrumento as string || 'Sem instrumento',
          nome_area: contrato.nome_area as string || null,
        });
        console.log(`✅ Contrato (hist) ${id}: ${contrato.numero_contratoh} - Valor: R$ ${contrato.valorh || 'NULL'}`);
      });
    }
    
    // Buscar informações dos contratos para cada obra
    const obrasComContratos = await Promise.all(
      obras.map(async (obra) => {
        try {
          console.log(`Processando obra ID ${obra.id}, contrato_id: ${obra.contrato_id}, status_id: ${obra.status_id}`);
          
          // Verificar se contrato_id existe e é válido
          if (!obra.contrato_id || obra.contrato_id === null || obra.contrato_id === 0) {
            console.log(`⚠️  Obra ${obra.id} sem contrato_id válido`);
            
            // Buscar arquivos mesmo sem contrato
            let arquivos: RowDataPacket[] = [];
            try {
              const [result] = await connectionObras!.query<RowDataPacket[]>(
                `SELECT id, tipo, nome_arquivo, path_servidor
                 FROM arquivoobra 
                 WHERE obra_id = ? AND extensao = 'pdf' AND tipo != 'Contrato'
                 ORDER BY id ASC`,
                [obra.id]
              );
              arquivos = result || [];
            } catch (arquivoError) {
              console.error(`Erro ao buscar arquivos da obra ${obra.id}:`, arquivoError);
            }
            
            return {
              ...obra,
              numero_contrato: null,
              objeto_contrato: null,
              valor_contrato: null,
              arquivos: arquivos.map((arq: RowDataPacket) => ({
                id: arq.id,
                tipo: (arq.tipo as string) || 'PDF',
                nome: (arq.nome_arquivo as string) || (arq.nome as string) || 'Arquivo sem nome',
                url: `https://epamigsistema.com/obras/web/${arq.path_servidor}`
              }))
            };
          }
          
          // Buscar dados do contrato no Map (já carregado)
          const contrato = contratosMap.get(Number(obra.contrato_id));
          
          if (contrato) {
            console.log(`✅ Contrato encontrado para obra ${obra.id}: ${contrato.numero_contrato} - Valor: R$ ${contrato.valor ?? 'NULL'}`);
          } else {
            console.log(`❌ Contrato ${obra.contrato_id} não encontrado para obra ${obra.id}`);
          }
          
          // Buscar arquivos da obra - agrupados por contrato_numero
          let arquivos: RowDataPacket[] = [];
          let arquivosContrato: RowDataPacket[] = [];
          let arquivosContratoBase: RowDataPacket[] = [];
          const obrasComContratoInfo: { [obraId: number]: { contrato_numero: string; instrumento_nome: string; label: string } } = {};

          try {
            // Buscar arquivos da própria obra
            const [result] = await connectionObras!.query<RowDataPacket[]>(
              `SELECT id, tipo, nome_arquivo, path_servidor, obra_id
               FROM arquivoobra 
               WHERE obra_id = ?
               ORDER BY tipo ASC, id ASC`,
              [obra.id]
            );
            arquivos = result || [];
            console.log(`📄 Arquivos para obra ${obra.id}: ${arquivos.length}`);

            // Se a obra tem contrato, buscar também arquivos de outras obras com mesmo contrato_numero
            if (contrato?.numero_contrato && obra.contrato_numero) {
              // Buscar todas as obras com mesmo contrato_numero
              const [obrasRelacionadas] = await connectionObras!.query<RowDataPacket[]>(
                `SELECT id, contrato_id FROM obra WHERE contrato_numero = ? AND id != ?`,
                [obra.contrato_numero, obra.id]
              );

              // Criar mapa de informações das obras (contrato_numero + instrumento)
              obrasComContratoInfo[obra.id] = {
                contrato_numero: contrato.numero_contrato || 'N/A',
                instrumento_nome: contrato.instrumento_nome || 'Sem instrumento',
                label: `${contrato.numero_contrato || 'N/A'} - ${contrato.instrumento_nome || 'Sem instrumento'}`
              };

              if (obrasRelacionadas && obrasRelacionadas.length > 0) {
                // Buscar informações de contrato para cada obra relacionada
                for (const obraRel of obrasRelacionadas) {
                  const contratoRel = contratosMap.get(Number(obraRel.contrato_id));
                  if (contratoRel) {
                    obrasComContratoInfo[obraRel.id] = {
                      contrato_numero: contratoRel.numero_contrato || 'N/A',
                      instrumento_nome: contratoRel.instrumento_nome || 'Sem instrumento',
                      label: `${contratoRel.numero_contrato || 'N/A'} - ${contratoRel.instrumento_nome || 'Sem instrumento'}`
                    };
                  } else {
                    obrasComContratoInfo[obraRel.id] = {
                      contrato_numero: obra.contrato_numero || 'N/A',
                      instrumento_nome: 'Sem contrato',
                      label: `Obra #${obraRel.id} - Sem contrato`
                    };
                  }
                }

                const obraIds = obrasRelacionadas.map((o: RowDataPacket) => o.id);
                const placeholders = obraIds.map(() => '?').join(',');

                // Buscar arquivos de todas as obras relacionadas
                const [resultRelacionados] = await connectionObras!.query<RowDataPacket[]>(
                  `SELECT id, tipo, nome_arquivo, path_servidor, obra_id
                   FROM arquivoobra 
                   WHERE obra_id IN (${placeholders})
                   ORDER BY obra_id ASC, tipo ASC, id ASC`,
                  obraIds
                );
                arquivosContrato = resultRelacionados || [];
                console.log(`📄 Arquivos do contrato ${obra.contrato_numero}: ${arquivosContrato.length}`);
              }

              // Buscar arquivos do contrato na base 'contratos'
              try {
                // Buscar todos os contratos com o mesmo numero_contratoh
                const [contratosRelacionados] = await connectionContratos!.query<RowDataPacket[]>(
                  `SELECT id, numero_contratoh, valorh 
                   FROM historico 
                   WHERE numero_contratoh = ?`,
                  [obra.contrato_numero]
                );

                if (contratosRelacionados && contratosRelacionados.length > 0) {
                  const historicoIds = contratosRelacionados.map((c: RowDataPacket) => c.id);
                  const placeholdersHist = historicoIds.map(() => '?').join(',');

                  // Buscar arquivos desses contratos
                  const [arquivosHist] = await connectionContratos!.query<RowDataPacket[]>(
                    `SELECT a.nome_arquivo, a.path_servidor, a.historico_id, h.valorh
                     FROM arquivo a
                     INNER JOIN historico h ON a.historico_id = h.id
                     WHERE a.historico_id IN (${placeholdersHist})`,
                    historicoIds
                  );
                  arquivosContratoBase = arquivosHist || [];
                  console.log(`📄 Arquivos da base contratos para ${obra.contrato_numero}: ${arquivosContratoBase.length}`);
                }
              } catch (contratoBaseError) {
                console.error(`Erro ao buscar arquivos da base contratos:`, contratoBaseError);
                arquivosContratoBase = [];
              }
            }
          } catch (arquivoError) {
            console.error(`Erro ao buscar arquivos da obra ${obra.id}:`, arquivoError);
            arquivos = [];
            arquivosContrato = [];
            arquivosContratoBase = [];
          }

          return {
            ...obra,
            numero_contrato: contrato?.numero_contrato || null,
            objeto_contrato: contrato?.objetoh || null,
            valor_contrato: contrato?.valor ?? null,
            instrumento_nome: contrato?.instrumento_nome || null,
            regional_nome: contrato?.nome_area || obra.regional_nome,
            arquivos: arquivos.map((arq: RowDataPacket) => ({
              id: arq.id,
              tipo: (arq.tipo as string) || 'Arquivo',
              nome: (arq.nome_arquivo as string) || (arq.nome as string) || 'Arquivo sem nome',
              url: `https://epamigsistema.com/obras/web/${arq.path_servidor}`,
              obra_id: arq.obra_id
            })),
            arquivos_contrato: arquivosContrato.map((arq: RowDataPacket) => ({
              id: arq.id,
              tipo: (arq.tipo as string) || 'Arquivo',
              nome: (arq.nome_arquivo as string) || (arq.nome as string) || 'Arquivo sem nome',
              url: `https://epamigsistema.com/obras/web/${arq.path_servidor}`,
              obra_id: arq.obra_id
            })),
            arquivos_contrato_base: arquivosContratoBase.map((arq: RowDataPacket) => ({
              nome: (arq.nome_arquivo as string) || 'Arquivo sem nome',
              url: `https://epamig.tech/contratos/web/${arq.path_servidor}`,
              historico_id: arq.historico_id,
              valor: arq.valorh ? Number(arq.valorh) : null
            })),
            obras_contrato_info: obrasComContratoInfo
          };
        } catch (error) {
          console.error(`❌ Erro ao processar obra ${obra.id}:`, error);
          return {
            ...obra,
            numero_contrato: null,
            objeto_contrato: null,
            valor_contrato: null,
            arquivos: []
          };
        }
      })
    );

    // Buscar contagem por status para o gráfico (com filtros aplicados)
    const [statusCount] = await connectionObras.query<RowDataPacket[]>(
      `SELECT 
          status_id,
          COUNT(*) as total
       FROM (
          SELECT 
              o.status_id,
              ROW_NUMBER() OVER (PARTITION BY o.contrato_numero ORDER BY o.id DESC) as rn
          FROM obra o
          ${whereClause}
       ) as subquery
       WHERE rn = 1
       GROUP BY status_id
       ORDER BY status_id ASC`,
      queryParams
    );

    // Buscar lista de regionais/áreas para o filtro
    let regionais: RowDataPacket[] = [];
      try {
      // Preferir lista de áreas (nome_area) se disponível na base de contratos
      const [areas] = await connectionContratos.query<RowDataPacket[]>(
        `SELECT id, nome_area as nome FROM area WHERE situacao_area = 'Ativo' ORDER BY nome_area ASC`
      );
      if (areas && areas.length > 0) {
        regionais = areas;
      } else {
        const [reg] = await connectionObras.query<RowDataPacket[]>(
          `SELECT id, nome FROM regional ORDER BY nome ASC`
        );
        regionais = reg;
      }
    } catch (areaErr) {
      console.warn('Não foi possível listar `area`, usando `regional` como fallback:', areaErr);
      const [regFallback] = await connectionObras.query<RowDataPacket[]>(
        `SELECT id, nome FROM regional ORDER BY nome ASC`
      );
      regionais = regFallback;
    }

    console.log(`Total de status diferentes: ${statusCount.length}`);

    // Ordenar obras pelo ano do contrato (primeiros 4 dígitos de numero_contrato) em ordem decrescente
    const obrasOrdenadas = obrasComContratos.sort((a, b) => {
      const anoA = a.numero_contrato ? parseInt(a.numero_contrato.split('/')[0]) : 0;
      const anoB = b.numero_contrato ? parseInt(b.numero_contrato.split('/')[0]) : 0;
      return anoB - anoA; // Ordem decrescente (ano mais recente primeiro)
    });

    return NextResponse.json({
      success: true,
      obras: obrasOrdenadas,
      statusCount,
      regionais,
    });
    
  } catch (error: unknown) {
    console.error("Erro detalhado ao buscar obras:", error);

    // Type guard para erro do banco/SQL
    const isDbError = (e: unknown): e is { code?: string; sqlMessage?: string; message?: string } => {
      return typeof e === 'object' && e !== null && (
        'code' in (e as object) || 'sqlMessage' in (e as object) || 'message' in (e as object)
      );
    };

    // Verificar tipo de erro
    let errorMessage = "Erro ao buscar obras do banco de dados";

    if (isDbError(error)) {
      if (error.code === 'ECONNREFUSED') {
        errorMessage = "Não foi possível conectar ao banco de dados. Verifique se o MySQL está rodando.";
      } else if (error.code === 'ER_NO_SUCH_TABLE') {
        errorMessage = "Tabela 'obra' não encontrada no banco de dados.";
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        errorMessage = "Banco de dados 'obra' não encontrado.";
      } else if (error.sqlMessage) {
        errorMessage = `Erro SQL: ${error.sqlMessage}`;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: isDbError(error) && error.message ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    // Garantir que as conexões sejam liberadas
    if (connectionObras) {
      connectionObras.release();
    }
    if (connectionContratos) {
      connectionContratos.release();
    }
  }
}