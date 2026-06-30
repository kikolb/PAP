const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

const { initDatabase, query, run, get } = require('./database');

// SQLite guarda CURRENT_TIMESTAMP como "YYYY-MM-DD HH:MM:SS" (UTC, sem "T").
// O frontend espera ISO 8601 (com "T") para poder fazer split('T')[0] nos filtros de data.
const toIsoDate = (sqliteTimestamp) => sqliteTimestamp ? sqliteTimestamp.replace(' ', 'T') + 'Z' : sqliteTimestamp;

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-mudde-isto-em-producao';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado' });
        }
        req.user = user;
        next();
    });
};

// ============ AUTENTICAÇÃO ============

// Registar novo utilizador
app.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, company, type } = req.body;

        if (!username || !email || !password || !company || !type) {
            return res.status(400).json({ error: 'Campos obrigatórios em falta' });
        }

        const existingUser = await get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser) {
            return res.status(400).json({ error: 'Utilizador ou email já existe' });
        }

        const passwordHash = await bcryptjs.hash(password, 12);
        const result = await run(
            'INSERT INTO users (username, email, password_hash, company, type) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, company, type]
        );

        const token = jwt.sign(
            { id: result.id, username, email, company, type },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: result.id, username, email, company, type }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }

        const user = await get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const passwordMatch = await bcryptjs.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, company: user.company, type: user.type },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                company: user.company,
                type: user.type
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ PRODUTOS ============

// Listar produtos do utilizador
app.get('/products', authenticateToken, async (req, res) => {
    try {
        const products = await query('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        
        // 🔥 CORREÇÃO: mapear para os nomes que o frontend espera
        const mappedProducts = products.map(p => ({
            id: p.id,
            nome: p.name,
            categoria: p.category,
            preco: p.price,
            iva: p.vat,
            stock: p.stock,
            descricao: p.description,
            created_at: p.created_at,
            active: p.active
        }));

        res.json({ data: mappedProducts });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Criar produto
app.post('/products', authenticateToken, async (req, res) => {
    try {
        // 🔥 CORREÇÃO: aceitar os nomes do frontend (nome, categoria, preco, iva)
        const { nome, categoria, preco, iva, description, stock } = req.body;

        // Se não encontrar os campos com os nomes do frontend, tenta os nomes do backend
        const name = nome || req.body.name;
        const category = categoria || req.body.category;
        const price = preco || req.body.price;
        const vat = iva || req.body.vat || 23;

        if (!name || !category || !price) {
            return res.status(400).json({ error: 'Campos obrigatórios em falta' });
        }

        const result = await run(
            'INSERT INTO products (user_id, name, category, price, vat, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, name, category, parseFloat(price), parseFloat(vat) || 23, description || '', stock || 0]
        );

        const product = await get('SELECT * FROM products WHERE id = ?', [result.id]);
        
        // Mapear para o frontend
        const mappedProduct = {
            id: product.id,
            nome: product.name,
            categoria: product.category,
            preco: product.price,
            iva: product.vat,
            stock: product.stock,
            descricao: product.description,
            created_at: product.created_at,
            active: product.active
        };

        res.json({ data: mappedProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar produto
app.put('/products/:id', authenticateToken, async (req, res) => {
    try {
        // 🔥 CORREÇÃO: aceitar os nomes do frontend
        const { nome, categoria, preco, iva, description, stock } = req.body;

        const name = nome || req.body.name;
        const category = categoria || req.body.category;
        const price = preco || req.body.price;
        const vat = iva || req.body.vat || 23;

        await run(
            'UPDATE products SET name = ?, category = ?, price = ?, vat = ?, description = ?, stock = ? WHERE id = ? AND user_id = ?',
            [name, category, parseFloat(price), parseFloat(vat) || 23, description || '', stock || 0, req.params.id, req.user.id]
        );

        const product = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        
        // Mapear para o frontend
        const mappedProduct = {
            id: product.id,
            nome: product.name,
            categoria: product.category,
            preco: product.price,
            iva: product.vat,
            stock: product.stock,
            descricao: product.description,
            created_at: product.created_at,
            active: product.active
        };

        res.json({ data: mappedProduct });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar produto
app.delete('/products/:id', authenticateToken, async (req, res) => {
    try {
        await run('DELETE FROM products WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ CLIENTES ============

// Listar clientes
app.get('/clients', authenticateToken, async (req, res) => {
    try {
        const clients = await query('SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        
        // 🔥 CORREÇÃO: mapear para os nomes que o frontend espera
        const mappedClients = clients.map(c => ({
            id: c.id,
            nome: c.name,
            nif: c.nif,
            email: c.email,
            telefone: c.phone,
            morada: c.address,
            created_at: c.created_at
        }));

        res.json({ data: mappedClients });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Criar cliente
app.post('/clients', authenticateToken, async (req, res) => {
    try {
        // 🔥 CORREÇÃO: aceitar os nomes do frontend (nome, nif, email, telefone, morada)
        const { nome, nif, email, telefone, morada } = req.body;

        const name = nome || req.body.name;
        const phone = telefone || req.body.phone;
        const address = morada || req.body.address;

        if (!name) {
            return res.status(400).json({ error: 'Nome obrigatório' });
        }

        const result = await run(
            'INSERT INTO clients (user_id, name, email, phone, nif, address) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.id, name, email || null, phone || null, nif || null, address || null]
        );

        const client = await get('SELECT * FROM clients WHERE id = ?', [result.id]);
        
        // Mapear para o frontend
        const mappedClient = {
            id: client.id,
            nome: client.name,
            nif: client.nif,
            email: client.email,
            telefone: client.phone,
            morada: client.address,
            created_at: client.created_at
        };

        res.json({ data: mappedClient });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Atualizar cliente
app.put('/clients/:id', authenticateToken, async (req, res) => {
    try {
        // 🔥 CORREÇÃO: aceitar os nomes do frontend
        const { nome, nif, email, telefone, morada } = req.body;

        const name = nome || req.body.name;
        const phone = telefone || req.body.phone;
        const address = morada || req.body.address;

        await run(
            'UPDATE clients SET name = ?, email = ?, phone = ?, nif = ?, address = ? WHERE id = ? AND user_id = ?',
            [name, email || null, phone || null, nif || null, address || null, req.params.id, req.user.id]
        );

        const client = await get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        
        // Mapear para o frontend
        const mappedClient = {
            id: client.id,
            nome: client.name,
            nif: client.nif,
            email: client.email,
            telefone: client.phone,
            morada: client.address,
            created_at: client.created_at
        };

        res.json({ data: mappedClient });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar cliente
app.delete('/clients/:id', authenticateToken, async (req, res) => {
    try {
        await run('DELETE FROM clients WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ VENDAS/RECIBOS ============

// Listar vendas
app.get('/sales', authenticateToken, async (req, res) => {
    try {
        const sales = await query(`
            SELECT s.*, c.name as client_name FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.user_id = ? ORDER BY s.created_at DESC
        `, [req.user.id]);

        // Obter itens de cada venda (com o nome do produto, se ainda existir)
        for (let sale of sales) {
            sale.items = await query(`
                SELECT si.*, p.name as product_name FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            `, [sale.id]);
        }

        // Mapear para o frontend
        const mappedSales = sales.map(s => ({
            id: s.id,
            date: toIsoDate(s.created_at),
            client: s.client_id ? { 
                id: s.client_id, 
                nome: s.client_name 
            } : null,
            method: s.payment_method,
            subtotal: s.subtotal,
            desconto: s.discount,
            total: s.total,
            items: s.items.map(i => ({
                id: i.product_id,
                name: i.product_name || 'Produto removido',
                price: i.unit_price,
                qty: i.quantity
            }))
        }));

        res.json({ data: mappedSales });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Criar venda/recibo
app.post('/sales', authenticateToken, async (req, res) => {
    try {
        // 🔥 CORREÇÃO: aceitar os nomes do frontend
        const { items, subtotal, desconto, total, client, method } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Venda sem itens' });
        }

        // Gerar número único de recibo
        const lastSale = await get('SELECT receipt_number FROM sales WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.user.id]);
        let nextNumber = 1;
        if (lastSale && lastSale.receipt_number) {
            const match = lastSale.receipt_number.match(/\d+$/);
            if (match) nextNumber = parseInt(match[0]) + 1;
        }
        // O nº de recibo inclui o user_id porque "receipt_number" tem UNIQUE global na tabela,
        // mas a sequência acima só garante unicidade dentro do próprio utilizador.
        const receiptNumber = `REC-${req.user.id}-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

        // Calcular VAT total a partir da taxa de cada item (preços assumidos com IVA incluído)
        const vatTotal = items.reduce((sum, item) => {
            const itemVat = parseFloat(item.iva) || 23;
            const itemTotal = parseFloat(item.price) * parseFloat(item.qty);
            return sum + (itemTotal - itemTotal / (1 + itemVat / 100));
        }, 0);

        // Inserir venda
        const result = await run(
            `INSERT INTO sales (user_id, client_id, receipt_number, subtotal, vat_total, total, discount, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, client?.id || null, receiptNumber, parseFloat(subtotal), parseFloat(vatTotal), parseFloat(total), parseFloat(desconto) || 0, method || 'dinheiro']
        );

        // Inserir itens da venda
        for (let item of items) {
            await run(
                'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
                [result.id, item.id, item.qty, parseFloat(item.price), parseFloat(item.price * item.qty)]
            );
        }

        const sale = await get('SELECT * FROM sales WHERE id = ?', [result.id]);
        sale.items = await query(`
            SELECT si.*, p.name as product_name FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        `, [result.id]);

        // Mapear para o frontend
        const mappedSale = {
            id: sale.id,
            date: toIsoDate(sale.created_at),
            client: client || null,
            method: sale.payment_method,
            subtotal: sale.subtotal,
            desconto: sale.discount,
            total: sale.total,
            items: sale.items.map(i => ({
                id: i.product_id,
                name: i.product_name || 'Produto removido',
                price: i.unit_price,
                qty: i.quantity
            }))
        };

        res.json({ data: mappedSale });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Eliminar venda
app.delete('/sales/:id', authenticateToken, async (req, res) => {
    try {
        await run('DELETE FROM sales WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ BACKUP ============

// Exportar backup
app.get('/backup/export', authenticateToken, async (req, res) => {
    try {
        const products = await query('SELECT * FROM products WHERE user_id = ?', [req.user.id]);
        const clients = await query('SELECT * FROM clients WHERE user_id = ?', [req.user.id]);
        const sales = await query('SELECT * FROM sales WHERE user_id = ?', [req.user.id]);

        res.json({
            data: { products, clients, sales }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Importar backup
app.post('/backup/import', authenticateToken, async (req, res) => {
    try {
        const { products, clients, sales } = req.body;

        // Limpar dados antigos do utilizador
        await run('DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ?)', [req.user.id]);
        await run('DELETE FROM sales WHERE user_id = ?', [req.user.id]);
        await run('DELETE FROM clients WHERE user_id = ?', [req.user.id]);
        await run('DELETE FROM products WHERE user_id = ?', [req.user.id]);

        // Inserir novos dados
        if (products && products.length > 0) {
            for (let p of products) {
                await run(
                    'INSERT INTO products (user_id, name, category, price, vat, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [req.user.id, p.name || p.nome, p.category || p.categoria, p.price || p.preco, p.vat || p.iva || 23, p.description || p.descricao || '', p.stock || 0]
                );
            }
        }

        if (clients && clients.length > 0) {
            for (let c of clients) {
                await run(
                    'INSERT INTO clients (user_id, name, email, phone, nif, address) VALUES (?, ?, ?, ?, ?, ?)',
                    [req.user.id, c.name || c.nome, c.email || null, c.phone || c.telefone || null, c.nif || null, c.address || c.morada || null]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ============ INICIALIZAÇÃO ============

if (require.main === module) {
    // Execução direta (desenvolvimento local): inicia o servidor HTTP normalmente.
    initDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`\n✓ ReceiptHub Backend rodando em http://localhost:${PORT}\n`);
        });
    }).catch(err => {
        console.error('Erro ao inicializar banco de dados:', err);
        process.exit(1);
    });
} else {
    // Importado como módulo (Vercel serverless): exporta o handler Express.
    // A inicialização da BD é feita pelo api/index.js antes do primeiro pedido.
    module.exports = app;
}