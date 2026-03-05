import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("adega.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_barras TEXT UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT,
    preco_venda REAL NOT NULL,
    estoque_atual INTEGER DEFAULT 0,
    fator_conversao INTEGER DEFAULT 1,
    foto_url TEXT
  );

  CREATE TABLE IF NOT EXISTS vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento TEXT,
    valor_total REAL,
    status_venda TEXT DEFAULT 'Concluída'
  );

  CREATE TABLE IF NOT EXISTS itens_venda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_venda INTEGER,
    id_produto INTEGER,
    quantidade INTEGER,
    subtotal REAL,
    FOREIGN KEY(id_venda) REFERENCES vendas(id),
    FOREIGN KEY(id_produto) REFERENCES produtos(id)
  );

  CREATE TABLE IF NOT EXISTS caixa_turno (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    fundo_inicial REAL,
    status TEXT DEFAULT 'Aberto',
    data_hora_fechamento DATETIME,
    diferenca_final REAL
  );

  CREATE TABLE IF NOT EXISTS movimentacoes_caixa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_caixa INTEGER,
    tipo TEXT,
    forma_pagamento TEXT,
    valor REAL,
    descricao TEXT,
    FOREIGN KEY(id_caixa) REFERENCES caixa_turno(id)
  );

  CREATE TABLE IF NOT EXISTS entrada_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_produto INTEGER,
    tipo_entrada TEXT,
    quantidade_informada INTEGER,
    quantidade_real_adicionada INTEGER,
    custo_total REAL,
    FOREIGN KEY(id_produto) REFERENCES produtos(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Products
  app.get("/api/produtos", (req, res) => {
    const rows = db.prepare("SELECT * FROM produtos").all();
    res.json(rows);
  });

  app.post("/api/produtos", (req, res) => {
    const { codigo_barras, nome, categoria, preco_venda, estoque_atual, fator_conversao, foto_url } = req.body;
    const info = db.prepare(`
      INSERT INTO produtos (codigo_barras, nome, categoria, preco_venda, estoque_atual, fator_conversao, foto_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(codigo_barras, nome, categoria, preco_venda, estoque_atual || 0, fator_conversao || 1, foto_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/produtos/:id", (req, res) => {
    const { id } = req.params;
    const { codigo_barras, nome, categoria, preco_venda, estoque_atual, fator_conversao, foto_url } = req.body;
    db.prepare(`
      UPDATE produtos SET codigo_barras = ?, nome = ?, categoria = ?, preco_venda = ?, estoque_atual = ?, fator_conversao = ?, foto_url = ?
      WHERE id = ?
    `).run(codigo_barras, nome, categoria, preco_venda, estoque_atual, fator_conversao, foto_url, id);
    res.json({ success: true });
  });

  // Sales
  app.post("/api/vendas", (req, res) => {
    const { forma_pagamento, valor_total, itens } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO vendas (forma_pagamento, valor_total) VALUES (?, ?)
      `).run(forma_pagamento, valor_total);
      
      const id_venda = info.lastInsertRowid;
      
      for (const item of itens) {
        db.prepare(`
          INSERT INTO itens_venda (id_venda, id_produto, quantidade, subtotal)
          VALUES (?, ?, ?, ?)
        `).run(id_venda, item.id_produto, item.quantidade, item.subtotal);
        
        db.prepare(`
          UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
        `).run(item.quantidade, item.id_produto);
      }
      
      return id_venda;
    });
    
    const id_venda = transaction();
    res.json({ id: id_venda });
  });

  app.get("/api/vendas", (req, res) => {
    const rows = db.prepare("SELECT * FROM vendas ORDER BY data_hora DESC").all();
    res.json(rows);
  });

  // Cashier
  app.get("/api/caixa/atual", (req, res) => {
    const row = db.prepare("SELECT * FROM caixa_turno WHERE status = 'Aberto' ORDER BY id DESC LIMIT 1").get();
    res.json(row || null);
  });

  app.post("/api/caixa/abrir", (req, res) => {
    const { fundo_inicial } = req.body;
    const info = db.prepare("INSERT INTO caixa_turno (fundo_inicial) VALUES (?)").run(fundo_inicial);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/caixa/fechar", (req, res) => {
    const { id, diferenca_final } = req.body;
    db.prepare(`
      UPDATE caixa_turno SET status = 'Fechado', data_hora_fechamento = CURRENT_TIMESTAMP, diferenca_final = ?
      WHERE id = ?
    `).run(diferenca_final, id);
    res.json({ success: true });
  });

  app.get("/api/movimentacoes/:id_caixa", (req, res) => {
    const rows = db.prepare("SELECT * FROM movimentacoes_caixa WHERE id_caixa = ?").all(req.params.id_caixa);
    res.json(rows);
  });

  app.post("/api/movimentacoes", (req, res) => {
    const { id_caixa, tipo, forma_pagamento, valor, descricao } = req.body;
    const info = db.prepare(`
      INSERT INTO movimentacoes_caixa (id_caixa, tipo, forma_pagamento, valor, descricao)
      VALUES (?, ?, ?, ?, ?)
    `).run(id_caixa, tipo, forma_pagamento, valor, descricao);
    res.json({ id: info.lastInsertRowid });
  });

  // Stock Entry
  app.post("/api/estoque/entrada", (req, res) => {
    const { id_produto, tipo_entrada, quantidade_informada, quantidade_real_adicionada, custo_total } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO entrada_estoque (id_produto, tipo_entrada, quantidade_informada, quantidade_real_adicionada, custo_total)
        VALUES (?, ?, ?, ?, ?)
      `).run(id_produto, tipo_entrada, quantidade_informada, quantidade_real_adicionada, custo_total);
      
      db.prepare(`
        UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?
      `).run(quantidade_real_adicionada, id_produto);
      
      return info.lastInsertRowid;
    });
    
    const id_entrada = transaction();
    res.json({ id: id_entrada });
  });

  app.get("/api/estoque/entradas", (req, res) => {
    const rows = db.prepare(`
      SELECT e.*, p.nome as nome_produto 
      FROM entrada_estoque e 
      JOIN produtos p ON e.id_produto = p.id 
      ORDER BY e.data_hora DESC
    `).all();
    res.json(rows);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
