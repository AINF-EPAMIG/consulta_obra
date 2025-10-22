-- Script de teste para verificar obras e contratos
-- Execute no MySQL Workbench ou cliente MySQL

-- ====================================
-- TESTE PRINCIPAL: Busca Refinada
-- ====================================
-- Mostra apenas obras com contrato_id válido e seu respectivo contrato
SELECT 
    o.id AS obra_id,
    o.contrato_id,
    o.status_id,
    CASE 
        WHEN o.status_id = 1 THEN 'Sem Pagamento'
        WHEN o.status_id = 2 THEN 'Não Iniciado'
        WHEN o.status_id = 3 THEN 'Em Andamento'
        WHEN o.status_id = 4 THEN 'Início de Paralisação'
        WHEN o.status_id = 5 THEN 'Paralisado'
        WHEN o.status_id = 6 THEN 'Concluído'
        WHEN o.status_id = 7 THEN 'Elaboração de Projetos'
    END AS status_nome,
    r.nome AS regional_nome,
    h.numero_contratoh,
    h.objetoh,
    h.valorh,
    CASE 
        WHEN h.id IS NULL THEN '❌ Contrato não encontrado'
        WHEN h.valorh IS NULL THEN '⚠️ Valor NULL'
        ELSE '✅ OK'
    END AS diagnostico
FROM obras.obra o
LEFT JOIN obras.regional r ON o.unidade_id = r.id
LEFT JOIN contratos.historico h ON o.contrato_id = h.id
WHERE o.contrato_id IS NOT NULL 
  AND o.contrato_id > 0
ORDER BY o.status_id, o.id DESC;

-- ====================================
-- ANÁLISE POR STATUS
-- ====================================
SELECT 
    CASE 
        WHEN o.status_id = 1 THEN 'Sem Pagamento'
        WHEN o.status_id = 2 THEN 'Não Iniciado'
        WHEN o.status_id = 3 THEN 'Em Andamento'
        WHEN o.status_id = 4 THEN 'Início de Paralisação'
        WHEN o.status_id = 5 THEN 'Paralisado'
        WHEN o.status_id = 6 THEN 'Concluído'
        WHEN o.status_id = 7 THEN 'Elaboração de Projetos'
    END AS status_nome,
    COUNT(*) AS total_obras,
    COUNT(CASE WHEN o.contrato_id IS NOT NULL AND o.contrato_id > 0 THEN 1 END) AS com_contrato_id,
    COUNT(CASE WHEN h.id IS NOT NULL THEN 1 END) AS contrato_encontrado,
    COUNT(CASE WHEN h.valorh IS NOT NULL AND h.valorh > 0 THEN 1 END) AS com_valor,
    SUM(CASE WHEN h.valorh IS NOT NULL THEN h.valorh ELSE 0 END) AS valor_total
FROM obras.obra o
LEFT JOIN contratos.historico h ON o.contrato_id = h.id
GROUP BY o.status_id
ORDER BY o.status_id;

-- ====================================
-- CONTRATOS ÚNICOS COM VALORES
-- ====================================
SELECT 
    h.id,
    h.numero_contratoh,
    h.valorh,
    COUNT(o.id) AS qtd_obras_vinculadas
FROM contratos.historico h
INNER JOIN obras.obra o ON h.id = o.contrato_id
WHERE h.valorh IS NOT NULL AND h.valorh > 0
GROUP BY h.id, h.numero_contratoh, h.valorh
ORDER BY h.valorh DESC;

-- ====================================
-- PROBLEMAS: Obras com contrato_id mas sem match
-- ====================================
SELECT 
    o.id AS obra_id,
    o.contrato_id,
    o.status_id,
    'Contrato não existe na tabela historico' AS problema
FROM obras.obra o
WHERE o.contrato_id IS NOT NULL 
  AND o.contrato_id > 0
  AND NOT EXISTS (
      SELECT 1 FROM contratos.historico h WHERE h.id = o.contrato_id
  );

-- ====================================
-- PROBLEMAS: Contratos sem valor
-- ====================================
SELECT 
    h.id,
    h.numero_contratoh,
    h.valorh,
    COUNT(o.id) AS qtd_obras_afetadas
FROM contratos.historico h
INNER JOIN obras.obra o ON h.id = o.contrato_id
WHERE h.valorh IS NULL OR h.valorh = 0
GROUP BY h.id, h.numero_contratoh, h.valorh;
