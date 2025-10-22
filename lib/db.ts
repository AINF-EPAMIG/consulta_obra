import mysql from "mysql2/promise";

// Conexão com banco central de funcionários
export const funcionariosDB = mysql.createPool({
  host: process.env.DB_FUNC_HOST || "localhost",
  user: process.env.DB_FUNC_USER || "root",
  password: process.env.DB_FUNC_PASSWORD || "",
  database: "quadro_funcionarios",
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Conexão com banco de obras
export const obrasDB = mysql.createPool({
  host: process.env.DB_FUNC_HOST || "localhost",
  user: process.env.DB_FUNC_USER || "root",
  password: process.env.DB_FUNC_PASSWORD || "",
  database: "obras",
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Conexão com banco de contratos
export const contratosDB = mysql.createPool({
  host: process.env.DB_CONTRATO_HOST || "localhost",
  user: process.env.DB_CONTRATO_USER || "root",
  password: process.env.DB_CONTRATO_PASSWORD || "",
  database: process.env.DB_CONTRATO_DATABASE || "contratos",
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

// Função utilitária para múltiplas conexões
export async function getConexoes() {
  return {
    pools: {
      quadro_funcionarios: funcionariosDB,
      obra: obrasDB,
      contratos: contratosDB,
    },
  };
}


