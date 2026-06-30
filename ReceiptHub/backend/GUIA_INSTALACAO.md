# 🚀 GUIA RÁPIDO - Como instalar o ReceiptHub Backend

**Tempo estimado: 5 minutos**

---

## ✅ PASSO 1: Descarregar Node.js

Se não tens Node.js instalado, descarrega em:
👉 https://nodejs.org/ (versão LTS - "Recomendada para a maioria")

Depois de instalar, verifica no terminal:
```bash
node --version
npm --version
```

Deve mostrar números tipo:
```
v18.17.0
9.6.7
```

---

## 📂 PASSO 2: Copiar a pasta do backend

A pasta `receiptHub-backend` que criei tem todo o código.

**Copia-a para um local fácil de encontrar**, tipo:
- Windows: `C:\Users\[TeuNome]\Documents\receiptHub-backend`
- macOS/Linux: `~/Documents/receiptHub-backend`

---

## 💾 PASSO 3: Instalar dependências

Abre o terminal/CMD e vai para a pasta:

```bash
cd ~/Documents/receiptHub-backend
# ou
cd C:\Users\[TeuNome]\Documents\receiptHub-backend
```

Agora instala tudo:
```bash
npm install
```

**Isto vai levar 1-2 minutos.** Vais ver uma progressão tipo:
```
added 150 packages, and audited 151 packages in 45s
```

---

## ▶️ PASSO 4: Iniciar o servidor

Ainda na mesma pasta:
```bash
npm start
```

Deve mostrar algo como:
```
✓ SQLite conectado em: /caminho/receiptHub.db
✓ Tabelas do banco de dados criadas
✓ ReceiptHub Backend rodando em http://localhost:5000
```

**Deixa isto aberto!** O servidor precisa estar sempre a correr.

---

## 🔌 PASSO 5: Configurar o Frontend

Agora que o backend está a correr, precisa de dizer ao frontend para usar ele.

**Copia o arquivo `api.js` que criei** para a pasta do teu frontend (onde tens o HTML):

```bash
# Substitui o api.js antigo pelo novo
cp receiptHub-backend/api.js /caminho-do-frontend/api.js
```

**Ou manualmente:**
1. Abre o arquivo `receiptHub-backend/api.js`
2. Copia todo o conteúdo
3. Cola no teu `HTML_File.html` - arquivo `api.js` (sobrescreve)

---

## 🌐 PASSO 6: Abrir a aplicação

Agora abre o teu `HTML_File.html` no navegador:

1. **Direita-clica** no `HTML_File.html`
2. **"Abrir com" → Navegador (Chrome, Firefox, etc.)**

Deves ver a página de login. Testa:

**Username:** `francisco`  
**Password:** `teste123`  
**Empresa:** `Minha Loja`  
**Tipo:** `Loja`

Clica "Entrar / Criar conta" → Deve deixar-te criar conta nova e entrar.

---

## ✨ Pronto!

Agora tens:
- ✅ Backend a correr em `http://localhost:5000`
- ✅ Frontend a correr no navegador
- ✅ Base de dados SQLite a guardar tudo
- ✅ Autenticação JWT a funcionar
- ✅ Tudo alinhado com o relatório!

---

## 🆘 Se algo não funcionar

### Erro: "npm: command not found"
→ Node.js não está instalado. Descarrega em https://nodejs.org/

### Erro: "Port 5000 already in use"
→ Outro programa está a usar a porta. Tenta:
```bash
# Muda a porta no .env para 3000
PORT=3000
npm start
```

### Erro: "Cannot find module"
→ Falta instalar dependências:
```bash
npm install
```

### Backend está a correr mas frontend não conecta
→ Tenta abrir o console (F12) e vê os erros
→ Verifica se `api.js` tem `USE_MOCK = false`

---

## 📱 Para Testar Manualmente

Se quiseres testar a API sem o frontend, podes usar Postman:

1. Descarrega https://www.postman.com/downloads/
2. Abre Postman
3. **POST** → `http://localhost:5000/auth/register`
4. **Body → raw → JSON**:
```json
{
  "username": "teste",
  "email": "teste@example.com",
  "password": "teste123",
  "company": "Minha Loja",
  "type": "loja"
}
```
5. Clica **Send**

Deve devolver um token JWT. 👍

---

## 🌍 Deploy Online (Depois)

Quando estiver tudo perfeito e pronto para mostrar ao Professor, podes fazer deploy:

**Com Railway (mais fácil):**
1. Cria conta em https://railway.app
2. Cria novo projeto
3. Faz upload ou conecta Git
4. Pronto, está online!

**Link fica tipo:** `https://seu-app-xyz.railway.app`

---

## 📞 Problemas?

Se encontrares algo estranho:
1. Fecha o terminal onde está o `npm start`
2. **Ctrl+C** para parar o servidor
3. Tenta outra vez: `npm start`

99% dos problemas resolvem-se assim. 😊

---

**Bom desenvolvimento!** 🎉
