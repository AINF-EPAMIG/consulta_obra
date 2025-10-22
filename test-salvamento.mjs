// Teste simples para verificar salvamento de análises
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const saudeMentalDB = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'saude_mental'
});

async function testarSalvamento() {
  try {
    console.log('🧪 Iniciando teste de salvamento...');
    
    // 1. Testar conexão
    const [conexaoTest] = await saudeMentalDB.execute('SELECT 1 as test');
    console.log('✅ Conexão OK');
    
    // 2. Verificar se tabelas existem
    const [tabelas] = await saudeMentalDB.execute('SHOW TABLES');
    console.log('📋 Tabelas disponíveis:', tabelas);
    
    // 3. Verificar estrutura da tabela analises
    try {
      const [estruturaAnalises] = await saudeMentalDB.execute('DESCRIBE analises');
      console.log('🏗️ Estrutura da tabela analises:');
      console.table(estruturaAnalises);
    } catch (err) {
      console.error('❌ Tabela analises não encontrada:', err.message);
      return;
    }
    
    // 4. Contar registros existentes
    const [countAnalises] = await saudeMentalDB.execute('SELECT COUNT(*) as total FROM analises');
    const [countRespostas] = await saudeMentalDB.execute('SELECT COUNT(*) as total FROM respostas');
    console.log('📊 Análises existentes:', countAnalises[0].total);
    console.log('📊 Respostas existentes:', countRespostas[0].total);
    
    // 5. Testar inserção simples na tabela respostas
    console.log('🧪 Testando inserção de resposta...');
    const [resultResposta] = await saudeMentalDB.execute(
      `INSERT INTO respostas (email, estresse1, estresse2, ansiedade1, ansiedade2, 
       burnout1, burnout2, depressao1, depressao2, equilibrio, apoio, desabafo) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['teste@teste.com', 3, 4, 2, 3, 4, 5, 2, 3, 3, 4, 'Teste de inserção']
    );
    
    const respostaId = resultResposta.insertId;
    console.log('✅ Resposta inserida com ID:', respostaId);
    
    // 6. Testar inserção na tabela analises
    console.log('🧪 Testando inserção de análise...');
    const [resultAnalise] = await saudeMentalDB.execute(
      `INSERT INTO analises (resposta_id, estresse, ansiedade, burnout, depressao, 
       equilibrio, apoio, alerta, dicas, justificativa_ia) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [respostaId, 70, 50, 80, 40, 60, 80, 'Teste de alerta', 'Teste de dicas', 'Teste de justificativa']
    );
    
    const analiseId = resultAnalise.insertId;
    console.log('✅ Análise inserida com ID:', analiseId);
    
    // 7. Verificar se os dados foram salvos
    const [verificacao] = await saudeMentalDB.execute(
      'SELECT * FROM analises WHERE id = ?', [analiseId]
    );
    console.log('📋 Dados salvos:', verificacao[0]);
    
    // 8. Limpar dados de teste
    await saudeMentalDB.execute('DELETE FROM analises WHERE id = ?', [analiseId]);
    await saudeMentalDB.execute('DELETE FROM respostas WHERE id = ?', [respostaId]);
    console.log('🧹 Dados de teste removidos');
    
    console.log('✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarSalvamento();