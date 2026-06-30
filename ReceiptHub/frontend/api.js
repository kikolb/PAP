// ============================================================
// ReceiptHub API Client - VERSÃO REAL (com Backend Node.js)
// ============================================================

const USE_MOCK = false;
// file://, localhost ou 127.0.0.1 → aponta para o servidor local na porta 5000.
// Qualquer outro host (Vercel, produção) → rotas relativas ao mesmo domínio.
const API_BASE_URL = (
    window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) ? 'http://localhost:5000' : '';

// Para produção online, muda para:
// const API_BASE_URL = 'https://seu-app.railway.app';

const APIClient = {
    async request(endpoint, method, body = null, token = null) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const options = {
                method,
                headers,
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

            // Se não está OK (4xx ou 5xx)
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};

// ============================================================
// TESTE DE CONEXÃO - Descomenta para testar
// ============================================================

/*
(async () => {
    try {
        console.log('Testando conexão com backend...');
        const result = await APIClient.request('/auth/register', 'POST', {
            username: 'teste',
            email: 'teste@example.com',
            password: 'senha123',
            company: 'Teste Loja',
            type: 'loja'
        });
        console.log('✓ Conexão OK:', result);
    } catch (err) {
        console.error('✗ Erro de conexão:', err.message);
    }
})();
*/
