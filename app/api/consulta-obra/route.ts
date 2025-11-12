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
       FROM obra o
       LEFT JOIN regional r ON o.unidade_id = r.id
       ${whereClause}
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
    const contratosMap = new Map<number, { numero_contrato?: string; objetoh?: string; valor?: number }>();
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
      const [contratosHistAll] = await connectionContratos.query<RowDataPacket[]>(
        `SELECT id, numero_contratoh, objetoh, dotacao_orcamentariah, valorh
         FROM historico 
         WHERE id IN (${placeholdersHistAll})
         ORDER BY CAST(SUBSTRING_INDEX(numero_contratoh, '/', 1) AS UNSIGNED) DESC, id DESC`,
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
                `SELECT id FROM obra WHERE contrato_numero = ? AND id != ?`,
                [obra.contrato_numero, obra.id]
              );

              if (obrasRelacionadas && obrasRelacionadas.length > 0) {
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
            }
          } catch (arquivoError) {
            console.error(`Erro ao buscar arquivos da obra ${obra.id}:`, arquivoError);
            arquivos = [];
            arquivosContrato = [];
          }
          
          return {
            ...obra,
            numero_contrato: contrato?.numero_contrato || null,
            objeto_contrato: contrato?.objetoh || null,
            valor_contrato: contrato?.valor ?? null,
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
            }))
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
        o.status_id,
        COUNT(*) as total
       FROM obra o
       ${whereClause}
       GROUP BY o.status_id,
       o.status_id
       ORDER BY o.status_id ASC,o.status_id ASC`,
      queryParams
    );

    // Buscar lista de regionais para o filtro
    const [regionais] = await connectionObras.query<RowDataPacket[]>(
      `SELECT id, nome FROM regional ORDER BY nome ASC`
    );

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
