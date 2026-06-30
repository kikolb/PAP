# ReceiptHub Backend - Node.js + SQLite

Backend para o sistema ReceiptHub - Sistema de Faturação Digital.

## 📋 Requisitos

- **Node.js** (versão 14+)
- Nada mais! Sem Docker, sem PostgreSQL, sem complicações.

## 🚀 Instalação Rápida (3 passos)

### 1. Copiar a pasta

```bash
# Copia a pasta receiptHub-backend para o teu computador
cp -r /home/claude/receiptHub-backend ~/meu-projeto/
cd ~/meu-projeto/receiptHub-backend
```

### 2. Instalar dependências

```bash
npm install
```

(Isto instala: Express, SQLite3, JWT, Bcrypt, CORS, Body-Parser, Dotenv)

### 3. Iniciar o servidor

```bash
npm start
```

Output esperado:
```
✓ SQLite conectado em: /caminho/receiptHub.db
✓ Tabelas do banco de dados criadas
✓ ReceiptHub Backend rodando em http://localhost:5000

Endpoints disponíveis:
  POST   /auth/register       - Registar utilizador
  POST   /auth/login          - Login
  GET    /products            - Listar produtos
  ... (e muito mais)
```

---

## 📝 Configuração (Opcional)

Se quiseres mudar a porta ou a chave secreta, cria um arquivo `.env`:

```env
PORT=5000
JWT_SECRET=uma-chave-muito-segura-e-unica
NODE_ENV=development
```

---

## 🔌 Integração com Frontend

No teu arquivo HTML/JavaScript, muda a API para apontar para o backend real.

### Em `api.js`, muda isto:

```javascript
const USE_MOCK = true;  // ← MUDA PARA FALSE
const API_BASE_URL = 'https://sua-api.com/api';  // ← MUDA PARA
const API_BASE_URL = 'http://localhost:5000';
```

Exemplo completo:

```javascript
const USE_MOCK = false;  // ✓ Usa backend real
const API_BASE_URL = 'http://localhost:5000';

// Resto do código fica igual...
```

---

## 🧪 Testar a API

### Opção 1: Com Postman

1. Abre Postman
2. **POST** → `http://localhost:5000/auth/register`
3. Body (JSON):
```json
{
  "username": "francisco",
  "email": "francisco@example.com",
  "password": "senha123",
  "company": "Minha Loja",
  "type": "loja"
}
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "francisco",
    "email": "francisco@example.com",
    "company": "Minha Loja",
    "type": "loja"
  }
}
```

### Opção 2: Com cURL

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "francisco",
    "email": "francisco@example.com",
    "password": "senha123",
    "company": "Minha Loja",
    "type": "loja"
  }'
```

---

## 📊 Estrutura de Dados

### Tabelas criadas automaticamente:

- **users** - Utilizadores registados
- **clients** - Clientes/contactos
- **products** - Catálogo de produtos
- **sales** - Recibos/vendas emitidas
- **sale_items** - Linhas de cada recibo

Todas com chaves estrangeiras, índices e constraints como descrito no relatório.

---

## 🌐 Deploy Online (Grátis)

### Com Railway (Recomendado)

1. Cria conta em https://railway.app
2. Cria novo projeto
3. Conecta o repositório Git (ou faz upload)
4. Railway faz deploy automático

Pronto! Ter um URL público como:
```
https://seu-app-123456.railway.app
```

### Com Render

1. Cria conta em https://render.com
2. Deploy como "Web Service"
3. Aponta para o ramo `main` do Git
4. Render faz o resto

---

## 🔐 Segurança

- ✅ Passwords com **hash bcrypt** (fator 12)
- ✅ Autenticação **JWT** (expira em 8h)
- ✅ **CORS** configurado
- ✅ Validação de inputs no backend
- ✅ Chave secreta em variáveis de ambiente

Para produção, muda `JWT_SECRET` para algo único e forte!

---

## 🛠️ Troubleshooting

### Erro: "Cannot find module 'express'"

```bash
npm install
```

### Erro: "Port 5000 already in use"

```bash
# Muda a porta no .env
PORT=3000

# Ou mata o processo (macOS/Linux)
lsof -i :5000
kill -9 <PID>
```

### Erro: "EACCES permission denied"

```bash
# No macOS/Linux, usa sudo
sudo npm start
```

---

## 📚 API Endpoints Completos

### Autenticação

```
POST /auth/register
POST /auth/login
```

### Produtos

```
GET    /products
POST   /products
PUT    /products/:id
DELETE /products/:id
```

### Clientes

```
GET    /clients
POST   /clients
PUT    /clients/:id
DELETE /clients/:id
```

### Vendas

```
GET    /sales
POST   /sales
DELETE /sales/:id
```

### Backup

```
GET  /backup/export
POST /backup/import
```

Todos os endpoints (exceto `/auth/*`) requerem token JWT no header:
```
Authorization: Bearer seu_token_aqui
```

---

## ✅ Checklist de Implementação

- [x] Express.js server
- [x] SQLite database
- [x] JWT authentication
- [x] Bcrypt password hashing
- [x] CRUD para Products, Clients, Sales
- [x] Validação de inputs
- [x] CORS habilitado
- [x] Backup/Export
- [x] Números únicos de recibos
- [x] Relações de chaves estrangeiras

---

## 📞 Suporte

Se encontrares erros, mostra a mensagem completa e o comando que usaste.

---

**Criado para PAP - ReceiptHub 2024/2025**
