// Dual-mode database layer:
//   DATABASE_URL set  → PostgreSQL via pg (Vercel / Neon)
//   DATABASE_URL unset → SQLite via sqlite3 (local dev)
//
// The pgify() helper converts SQLite's ? placeholders to PostgreSQL's $1, $2 ...
// so server.js never needs to know which database is active.

'use strict';
require('dotenv').config();

if (process.env.DATABASE_URL) {
    // ──────────────────────────────────────────────
    // POSTGRESQL  (Vercel / Neon)
    // ──────────────────────────────────────────────
    const { Pool } = require('pg');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    // Convert SQLite ? placeholders to PostgreSQL $1, $2 ...
    function pgify(sql) {
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    }

    async function initDatabase() {
        const c = await pool.connect();
        try {
            await c.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(100) UNIQUE NOT NULL,
                    email VARCHAR(200) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    company VARCHAR(150) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    active BOOLEAN DEFAULT TRUE
                )
            `);
            await c.query(`
                CREATE TABLE IF NOT EXISTS clients (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    email VARCHAR(200),
                    phone VARCHAR(20),
                    nif VARCHAR(9),
                    address TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            await c.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(150) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    vat DECIMAL(4,2) DEFAULT 23.00,
                    active BOOLEAN DEFAULT TRUE,
                    description TEXT,
                    stock INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            await c.query(`
                CREATE TABLE IF NOT EXISTS sales (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    client_id INTEGER,
                    receipt_number VARCHAR(30) UNIQUE NOT NULL,
                    subtotal DECIMAL(10,2) NOT NULL,
                    vat_total DECIMAL(10,2) NOT NULL,
                    total DECIMAL(10,2) NOT NULL,
                    discount DECIMAL(10,2) DEFAULT 0,
                    payment_method VARCHAR(50),
                    status VARCHAR(20) DEFAULT 'emitido',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
                )
            `);
            await c.query(`
                CREATE TABLE IF NOT EXISTS sale_items (
                    id SERIAL PRIMARY KEY,
                    sale_id INTEGER NOT NULL,
                    product_id INTEGER NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price DECIMAL(10,2) NOT NULL,
                    subtotal DECIMAL(10,2) NOT NULL,
                    FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
                )
            `);
            console.log('✓ Tabelas PostgreSQL prontas');
        } finally {
            c.release();
        }
    }

    async function query(sql, params = []) {
        const res = await pool.query(pgify(sql), params);
        return res.rows;
    }

    async function run(sql, params = []) {
        let pgSql = pgify(sql);
        // Auto-append RETURNING id to INSERT statements so callers get result.id
        if (/^\s*INSERT/i.test(sql) && !/RETURNING/i.test(sql)) {
            pgSql = pgSql.trimEnd().replace(/;$/, '') + ' RETURNING id';
        }
        const res = await pool.query(pgSql, params);
        return { id: res.rows[0]?.id ?? null, changes: res.rowCount };
    }

    async function get(sql, params = []) {
        const res = await pool.query(pgify(sql), params);
        return res.rows[0] ?? null;
    }

    module.exports = { initDatabase, query, run, get };

} else {
    // ──────────────────────────────────────────────
    // SQLITE  (local dev — sem DATABASE_URL)
    // ──────────────────────────────────────────────
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');

    const dbPath = path.join(__dirname, 'receiptHub.db');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error('Erro ao abrir DB:', err);
        else console.log('✓ SQLite conectado em:', dbPath);
    });

    function initDatabase() {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username VARCHAR(100) UNIQUE NOT NULL,
                        email VARCHAR(200) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        company VARCHAR(150) NOT NULL,
                        type VARCHAR(50) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        active BOOLEAN DEFAULT 1
                    )
                `);
                db.run(`
                    CREATE TABLE IF NOT EXISTS clients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name VARCHAR(150) NOT NULL,
                        email VARCHAR(200),
                        phone VARCHAR(20),
                        nif VARCHAR(9),
                        address TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                db.run(`
                    CREATE TABLE IF NOT EXISTS products (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        name VARCHAR(150) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        vat DECIMAL(4,2) DEFAULT 23.00,
                        active BOOLEAN DEFAULT 1,
                        description TEXT,
                        stock INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
                db.run(`
                    CREATE TABLE IF NOT EXISTS sales (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        client_id INTEGER,
                        receipt_number VARCHAR(30) UNIQUE NOT NULL,
                        subtotal DECIMAL(10,2) NOT NULL,
                        vat_total DECIMAL(10,2) NOT NULL,
                        total DECIMAL(10,2) NOT NULL,
                        discount DECIMAL(10,2) DEFAULT 0,
                        payment_method VARCHAR(50),
                        status VARCHAR(20) DEFAULT 'emitido',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE SET NULL
                    )
                `);
                db.run(`
                    CREATE TABLE IF NOT EXISTS sale_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sale_id INTEGER NOT NULL,
                        product_id INTEGER NOT NULL,
                        quantity INTEGER NOT NULL,
                        unit_price DECIMAL(10,2) NOT NULL,
                        subtotal DECIMAL(10,2) NOT NULL,
                        FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE,
                        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
                    )
                `, (err) => {
                    if (err) { console.error('Erro ao criar tabelas:', err); reject(err); }
                    else { console.log('✓ Tabelas do banco de dados criadas'); resolve(); }
                });
            });
        });
    }

    function query(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    function run(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    function get(sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    module.exports = { db, initDatabase, query, run, get };
}
