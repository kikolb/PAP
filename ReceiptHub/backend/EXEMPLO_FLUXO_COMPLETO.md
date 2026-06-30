# 🎬 EXEMPLO COMPLETO DE FLUXO

## Como testar tudo do início ao fim

Depois de `npm start`, testa este fluxo completo:

---

## 1️⃣ REGISTAR NOVO UTILIZADOR

Abre o navegador em `HTML_File.html` (frontend).

**Preenche:**
- Utilizador: `francisco`
- Palavra-passe: `minhasenha123`
- Nome da empresa: `Minha Loja`
- Tipo: `Loja`

Clica **"Entrar / Criar conta"**

**Resultado esperado:**
```
✓ Toast verde: "Autenticado com sucesso"
✓ Aparece página principal com abas
✓ Token JWT guardado em localStorage
```

---

## 2️⃣ ADICIONAR PRODUTO

Aba "Venda Rápida" → Botão "Adicionar" (produtos)

**Preenche:**
- Nome: `Café`
- Categoria: `Bebida`
- Preço: `2.50`
- IVA: `23%`
- Stock: `50`

Clica **"Guardar"**

**Resultado esperado:**
```
✓ Toast: "Produto guardado"
✓ Produto aparece na lista de "Produtos"
✓ Guardado na base de dados SQLite
```

---

## 3️⃣ ADICIONAR CLIENTE

Aba "Clientes" → Botão "Novo Cliente"

**Preenche:**
- Nome: `João Silva`
- NIF: `123456789`
- Email: `joao@example.com`
- Telefone: `912345678`

Clica **"Guardar"**

**Resultado esperado:**
```
✓ Cliente aparece na lista
✓ Toast: "Cliente guardado"
✓ Guardado na BD
```

---

## 4️⃣ CRIAR VENDA (RECIBO)

Aba "Venda Rápida"

**Fluxo:**

1. Clica **"Associar Cliente"** → Seleciona `João Silva` → OK
2. Procura **"Café"** na caixa de pesquisa
3. Clica no card **"Café"**
4. Define quantidade: `2`
5. Clica botão **"Adicionar ao carrinho"**
6. Vê o carrinho atualizar com o total
7. Clica **"Finalizar Venda"**

**Resultado esperado:**
```
✓ Aparece modal com "Talão de Venda"
✓ Mostra: "REC-2024-0001" (número único)
✓ Cliente: João Silva
✓ Produto: Café x 2 = €5.00
✓ IVA (23%): €1.15
✓ Total: €6.15
✓ Toast: "Venda criada com sucesso"
```

---

## 5️⃣ VER HISTÓRICO

Aba "Histórico"

**Resultado esperado:**
```
✓ Tabela mostra a venda criada:
  - ID: REC-2024-0001
  - Data: 28/06/2024
  - Cliente: João Silva
  - Método: Dinheiro
  - Total: €6.15
```

---

## 6️⃣ VER DASHBOARD

Aba "Dashboard"

**Resultado esperado:**
```
✓ Cartões mostram:
  - Faturação Total: €6.15
  - Vendas Hoje: 1
  - Ticket Médio: €6.15
  
✓ Gráfico de linha mostra venda
✓ Tabela "Produtos Mais Vendidos": Café (2 unidades)
```

---

## 7️⃣ EXPORTAR DADOS

Aba "Configuração" → Botão "Exportar Backup"

**Resultado esperado:**
```
✓ Descarrega arquivo JSON com:
  - Produtos
  - Clientes
  - Vendas (com detalhes)
```

---

## 🧪 TESTAR A API MANUALMENTE (Postman)

Se quiseres ver exatamente o que o backend retorna:

### Teste 1: Registar
```
POST http://localhost:5000/auth/register
Content-Type: application/json

{
  "username": "teste",
  "email": "teste@example.com",
  "password": "teste123",
  "company": "Loja Teste",
  "type": "loja"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "teste",
    "email": "teste@example.com",
    "company": "Loja Teste",
    "type": "loja"
  }
}
```

### Teste 2: Login
```
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "username": "teste",
  "password": "teste123"
}
```

**Resposta:** (idêntica ao teste 1)

### Teste 3: Criar Produto
```
POST http://localhost:5000/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Café",
  "category": "Bebida",
  "price": 2.50,
  "vat": 23,
  "stock": 100
}
```

**Resposta:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "name": "Café",
    "category": "Bebida",
    "price": 2.5,
    "vat": 23,
    "active": 1,
    "stock": 100
  }
}
```

### Teste 4: Criar Venda
```
POST http://localhost:5000/sales
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "client_id": 1,
  "items": [
    {
      "id": 1,
      "product_id": 1,
      "quantity": 2,
      "price": 2.50,
      "subtotal": 5.00
    }
  ],
  "subtotal": 5.00,
  "vat_total": 1.15,
  "total": 6.15,
  "discount": 0,
  "payment_method": "dinheiro"
}
```

**Resposta:**
```json
{
  "data": {
    "id": 1,
    "user_id": 1,
    "client_id": 1,
    "receipt_number": "REC-2024-0001",
    "subtotal": 5.00,
    "vat_total": 1.15,
    "total": 6.15,
    "discount": 0,
    "payment_method": "dinheiro",
    "status": "emitido",
    "created_at": "2024-06-28 01:20:34",
    "items": [
      {
        "id": 1,
        "sale_id": 1,
        "product_id": 1,
        "quantity": 2,
        "unit_price": 2.50,
        "subtotal": 5.00
      }
    ]
  }
}
```

---

## ✅ CHECKLIST DE TESTES

- [ ] Registar novo utilizador
- [ ] Login com as mesmas credenciais
- [ ] Adicionar 3-4 produtos diferentes
- [ ] Adicionar 2-3 clientes
- [ ] Criar 5-10 vendas com clientes diferentes
- [ ] Ver histórico com filtros por data
- [ ] Visualizar dashboard com gráficos
- [ ] Exportar backup em JSON
- [ ] Trocar de utilizador (logout) e login com outro
- [ ] Verificar que cada utilizador só vê seus dados

---

## 💾 VERIFICAR A BASE DE DADOS

O arquivo `receiptHub.db` é criado automaticamente.

Para ver os dados guardados (opcional):

```bash
# Instala sqlite3 globalmente
npm install -g sqlite3

# Abre a base de dados
sqlite3 receiptHub.db

# Vê os dados:
sqlite> SELECT * FROM users;
sqlite> SELECT * FROM products;
sqlite> SELECT * FROM sales;
sqlite> .exit
```

---

## 🎉 QUANDO TUDO FUNCIONA

Significa que:
✅ Backend está a rodar corretamente  
✅ Base de dados está a guardar dados  
✅ Autenticação JWT está funcional  
✅ Frontend está integrado com backend  
✅ Tudo alinhado com o relatório  

**Pronto para apresentar!** 🚀

---

## 🆘 SE ALGO NÃO FUNCIONAR

**Erro no frontend (DevTools F12):**
```
Failed to fetch from http://localhost:5000
```
→ Backend não está a correr. Faz `npm start` no terminal

**Erro "Token inválido":**
→ Tira o `localStorage` e faz novo login

**Erro "Produto não encontrado":**
→ Certifica-te que estás logado com a conta que criou o produto

---

**Testa isto tudo e confirma que funciona!** 👍
