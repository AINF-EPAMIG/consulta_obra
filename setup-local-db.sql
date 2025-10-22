-- Script para configurar o banco de dados local

-- Criar banco se não existir
CREATE DATABASE IF NOT EXISTS saude_mental CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE saude_mental;

-- Tabela de respostas dos usuários
CREATE TABLE IF NOT EXISTS respostas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    data_resposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estresse1 INT NOT NULL,
    estresse2 INT NOT NULL,
    ansiedade1 INT NOT NULL,
    ansiedade2 INT NOT NULL,
    burnout1 INT NOT NULL,
    burnout2 INT NOT NULL,
    depressao1 INT NOT NULL,
    depressao2 INT NOT NULL,
    equilibrio INT NOT NULL,
    apoio INT NOT NULL,
    desabafo TEXT,
    INDEX idx_email (email),
    INDEX idx_data (data_resposta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de análises processadas pela IA
CREATE TABLE IF NOT EXISTS analises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resposta_id INT NOT NULL,
    estresse INT NOT NULL,
    ansiedade INT NOT NULL,
    burnout INT NOT NULL,
    depressao INT NOT NULL,
    equilibrio INT NOT NULL,
    apoio INT NOT NULL,
    alerta TEXT,
    dicas TEXT,
    justificativa_ia TEXT,
    data_analise TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resposta_id) REFERENCES respostas(id) ON DELETE CASCADE,
    INDEX idx_resposta (resposta_id),
    INDEX idx_data_analise (data_analise)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas:' as status;
SHOW TABLES;

-- Verificar estrutura das tabelas
SELECT 'Estrutura tabela respostas:' as info;
DESCRIBE respostas;

SELECT 'Estrutura tabela analises:' as info;
DESCRIBE analises;

-- Inserir dados de teste (opcional)
INSERT INTO respostas (email, estresse1, estresse2, ansiedade1, ansiedade2, burnout1, burnout2, depressao1, depressao2, equilibrio, apoio, desabafo) 
VALUES ('teste@epamig.br', 4, 3, 2, 3, 4, 5, 2, 1, 3, 4, 'Teste de funcionamento do sistema');

-- Inserir análise correspondente
INSERT INTO analises (resposta_id, estresse, ansiedade, burnout, depressao, equilibrio, apoio, alerta, dicas, justificativa_ia) 
VALUES (
    LAST_INSERT_ID(), 
    70, 50, 90, 30, 60, 80,
    'Burnout elevado - Atenção necessária',
    'Considere reduzir a carga de trabalho e praticar atividades relaxantes',
    'Análise baseada nos níveis elevados de burnout e estresse relatados'
);

-- Verificar dados inseridos
SELECT 'Dados de teste inseridos:' as status;
SELECT COUNT(*) as total_respostas FROM respostas;
SELECT COUNT(*) as total_analises FROM analises;