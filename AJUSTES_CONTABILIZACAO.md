# Ajustes na Contabilização de Obras - Sistema Next.js

## Data: 2025-11-13

## Objetivo
Aplicar as mesmas regras de agrupamento e contabilização do sistema Yii2/PHP no sistema Next.js, garantindo que:
1. O totalizador de obras agrupe por `contrato_numero` (não por obra individual)
2. O `status_id` seja referente ao último registro de cada `contrato_numero`
3. A contabilização por status siga a mesma lógica da contabilização geral
4. O botão de fechar tenha fundo vermelho

---

## Alterações Realizadas

### 1. API Route (`app/api/consulta-obra/route.ts`)

#### ✅ Ajuste na Contagem de Status
**Antes:**
```typescript
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
```

**Depois:**
```typescript
const [statusCount] = await connectionObras.query<RowDataPacket[]>(
  `SELECT 
      status_id,
      COUNT(DISTINCT contrato_numero) as total
   FROM (
      SELECT 
          o.contrato_numero,
          o.status_id,
          ROW_NUMBER() OVER (PARTITION BY o.contrato_numero ORDER BY o.id DESC) as rn
      FROM obra o
      ${whereClause}
   ) as subquery
   WHERE rn = 1 AND contrato_numero IS NOT NULL
   GROUP BY status_id
   ORDER BY status_id ASC`,
  queryParams
);
```

**Motivo:** 
- Agora conta `DISTINCT contrato_numero` ao invés de todas as linhas
- Filtra apenas registros com `contrato_numero IS NOT NULL`
- Usa o `status_id` do registro mais recente (maior `id`) de cada contrato

---

### 2. Frontend (`app/consulta-obra/page.tsx`)

#### ✅ Ajuste nos Cálculos Financeiros por Status

**Antes:**
```typescript
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
  // ...
}, [obras]);
```

**Depois:**
```typescript
const financeirosPorStatus = useMemo(() => {
  // Primeiro, agrupar obras por contrato_numero e pegar a mais recente (maior id)
  const ultimasObrasPorContrato = new Map<string, Obra>();
  
  obras.forEach(obra => {
    const contratoKey = obra.numero_contrato || `sem-contrato-${obra.id}`;
    const obraExistente = ultimasObrasPorContrato.get(contratoKey);
    
    // Manter apenas a obra com maior id (mais recente)
    if (!obraExistente || obra.id > obraExistente.id) {
      ultimasObrasPorContrato.set(contratoKey, obra);
    }
  });
  
  // Agora calcular financeiros por status usando apenas as obras mais recentes
  const financeiros: { [key: number]: { total: number; valor: number; obras_com_valor: number } } = {};
  
  ultimasObrasPorContrato.forEach(obra => {
    if (!financeiros[obra.status_id]) {
      financeiros[obra.status_id] = { total: 0, valor: 0, obras_com_valor: 0 };
    }
    financeiros[obra.status_id].total += 1;
    
    if (obra.valor_contrato && !isNaN(obra.valor_contrato) && obra.valor_contrato > 0) {
      financeiros[obra.status_id].valor += obra.valor_contrato;
      financeiros[obra.status_id].obras_com_valor += 1;
    }
  });
  // ...
}, [obras]);
```

**Motivo:**
- Evita contabilização duplicada de obras com mesmo `contrato_numero`
- Usa apenas o registro mais recente de cada contrato (maior `id`)
- Garante que o `status_id` seja do último registro

---

#### ✅ Ajuste nos Cálculos Financeiros por Regional

**Aplicado o mesmo padrão de agrupamento por `contrato_numero`**

```typescript
const financeirosPorRegional = useMemo(() => {
  // Primeiro, agrupar obras por contrato_numero e pegar a mais recente (maior id)
  const ultimasObrasPorContrato = new Map<string, Obra>();
  
  obras.forEach(obra => {
    const contratoKey = obra.numero_contrato || `sem-contrato-${obra.id}`;
    const obraExistente = ultimasObrasPorContrato.get(contratoKey);
    
    if (!obraExistente || obra.id > obraExistente.id) {
      ultimasObrasPorContrato.set(contratoKey, obra);
    }
  });
  
  // Calcular financeiros por regional usando apenas as obras mais recentes
  // ...
}, [obras]);
```

---

#### ✅ Ajuste nos Totais Gerais

**Aplicado o mesmo padrão de agrupamento:**

```typescript
const totaisGerais = useMemo(() => {
  // Primeiro, agrupar obras por contrato_numero e pegar a mais recente (maior id)
  const ultimasObrasPorContrato = new Map<string, Obra>();
  
  obras.forEach(obra => {
    const contratoKey = obra.numero_contrato || `sem-contrato-${obra.id}`;
    const obraExistente = ultimasObrasPorContrato.get(contratoKey);
    
    if (!obraExistente || obra.id > obraExistente.id) {
      ultimasObrasPorContrato.set(contratoKey, obra);
    }
  });
  
  const obrasUnicas = Array.from(ultimasObrasPorContrato.values());
  const total_obras = obrasUnicas.length;
  // ...
}, [obras]);
```

---

### 3. Componente ObraDetalhes (`components/ObraDetalhes.tsx`)

#### ✅ Botão de Fechar com Fundo Vermelho

**Status:** JÁ ESTAVA CORRETO

```typescript
<button
  onClick={onClose}
  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
>
  Fechar
</button>
```

---

## Resultado Final

### ✅ Problemas Resolvidos:

1. **Totalizador de obras agrupado por contrato_numero**
   - Antes: Contava cada registro de obra individualmente
   - Agora: Conta apenas um registro por `contrato_numero` (o mais recente)

2. **Status_id referente ao último registro**
   - Antes: Poderia usar `status_id` de qualquer registro do contrato
   - Agora: Sempre usa o `status_id` do registro com maior `id` (mais recente)

3. **Contabilização consistente em todos os relatórios**
   - Relatório por Status
   - Relatório por Regional
   - Totais Gerais
   - Gráfico de Pizza
   - Todos seguem a mesma lógica de agrupamento

4. **Botão de fechar vermelho**
   - Confirmado que já estava implementado corretamente

---

## Lógica Aplicada (Baseada no Sistema Yii2/PHP)

### Regra Principal:
```
Para cada contrato_numero:
  1. Buscar todos os registros da tabela 'obra' com esse contrato_numero
  2. Ordenar por 'id' DESC (mais recente primeiro)
  3. Selecionar apenas o primeiro registro (ROW_NUMBER() = 1)
  4. Usar o status_id deste registro para contabilização
  5. Contar apenas 1 obra por contrato_numero
```

### Query SQL (Referência):
```sql
SELECT 
    status_id,
    COUNT(DISTINCT contrato_numero) as total
FROM (
    SELECT 
        o.contrato_numero,
        o.status_id,
        ROW_NUMBER() OVER (PARTITION BY o.contrato_numero ORDER BY o.id DESC) as rn
    FROM obra o
) as subquery
WHERE rn = 1 AND contrato_numero IS NOT NULL
GROUP BY status_id
ORDER BY status_id ASC
```

---

## Testes Recomendados

1. Verificar se obras com mesmo `contrato_numero` são contadas apenas uma vez
2. Confirmar que o `status_id` exibido é sempre do registro mais recente
3. Validar que os totais em todos os relatórios são consistentes
4. Testar filtros de status e regional após as alterações
5. Verificar se o gráfico de pizza reflete os valores corretos

---

## Arquivos Modificados

1. `app/api/consulta-obra/route.ts` - Query de contagem de status
2. `app/consulta-obra/page.tsx` - Cálculos financeiros (status, regional, totais)
3. `components/ObraDetalhes.tsx` - Verificado (já estava correto)

---

## Observações Importantes

- A lógica de agrupamento é aplicada em **tempo de execução** no frontend usando `Map` para otimização
- O backend já retorna as obras filtradas, mas o agrupamento adicional garante consistência
- Todos os cálculos financeiros agora seguem o mesmo padrão de agrupamento
- O código está otimizado com `useMemo` para evitar recálculos desnecessários

---

**Desenvolvedor:** GitHub Copilot  
**Data:** 13/11/2025  
**Status:** ✅ Concluído

