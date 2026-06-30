let state = {
    currentUser: null,
    token: null,
    products: [],
    clients: [],
    sales: [],
    cart: [],
    cartClient: null,
    paymentMethod: 'dinheiro',
    searchTerm: '',
    categoryFilter: 'Todos',
    page: 1,
    perPage: 12,
    emailConfig: {
        userId: '',
        serviceId: '',
        templateId: ''
    },
    soundEnabled: false,
    confirmSale: true
};
let charts = {};

function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    }[m]));
}

function animateValue(el, end, { decimals = 0, suffix = '', duration = 600 } = {}) {
    if (!el) return;
    const startTime = performance.now();
    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${(end * eased).toFixed(decimals)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = `${end.toFixed(decimals)}${suffix}`;
    }
    requestAnimationFrame(tick);
}

function renderTrend(elId, current, previous) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (previous === 0 && current === 0) {
        el.textContent = '';
        el.className = 'kpi-trend';
        return;
    }
    if (previous === 0) {
        el.textContent = '▲ novo';
        el.className = 'kpi-trend up';
        return;
    }
    const change = ((current - previous) / previous) * 100;
    const up = change >= 0;
    el.textContent = `${up ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}% vs ontem`;
    el.className = `kpi-trend ${up ? 'up' : 'down'}`;
}

async function loadUserData() {
    if (!state.currentUser) return;
    if (!state.token) {
        showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
    }
    try {
        const [productsRes, clientsRes, salesRes] = await Promise.all([
            APIClient.request('/products', 'GET', null, state.token),
            APIClient.request('/clients', 'GET', null, state.token),
            APIClient.request('/sales', 'GET', null, state.token)
        ]);
        state.products = productsRes.data;
        state.clients = clientsRes.data;
        state.sales = salesRes.data.sort((a, b) => b.id - a.id);
        renderAll();
    } catch (e) {
        console.error(e);
        if (e.message.includes('Token não fornecido') || e.message.includes('Token inválido ou expirado')) {
            showToast('Sessão expirada. Faça login novamente.', 'error');
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            document.getElementById('loginScreen').style.display = 'grid';
            document.getElementById('appScreen').style.display = 'none';
        } else {
            showToast('Erro ao carregar dados: ' + e.message, 'error');
        }
    }
}

async function saveProduct(product) {
    try {
        if (product.id) {
            await APIClient.request(`/products/${product.id}`, 'PUT', product, state.token);
        } else {
            await APIClient.request('/products', 'POST', product, state.token);
        }
        await loadUserData();
        showToast('Produto guardado', 'success');
    } catch (e) {
        console.error(e);
        throw e;
    }
}

async function deleteProduct(id) {
    if (confirm('Eliminar produto?')) {
        await APIClient.request(`/products/${id}`, 'DELETE', null, state.token);
        await loadUserData();
        showToast('Produto removido', 'info');
    }
}

async function saveClient(client) {
    if (client.id) await APIClient.request(`/clients/${client.id}`, 'PUT', client, state.token);
    else await APIClient.request('/clients', 'POST', client, state.token);
    await loadUserData();
    showToast('Cliente guardado', 'success');
}

async function deleteClient(id) {
    if (confirm('Eliminar cliente?')) {
        await APIClient.request(`/clients/${id}`, 'DELETE', null, state.token);
        await loadUserData();
        showToast('Cliente removido', 'info');
    }
}

async function saveSale(sale) {
    await APIClient.request('/sales', 'POST', sale, state.token);
    await loadUserData();
    renderDashboard();
}

async function cancelSale(id) {
    if (confirm('Anular venda? O stock será reposto.')) {
        const sale = state.sales.find(s => s.id === id);
        if (sale) {
            for (let item of sale.items) {
                let prod = state.products.find(p => p.id === item.id);
                if (prod) {
                    prod.stock += item.qty;
                    await saveProduct(prod);
                }
            }
            await APIClient.request(`/sales/${id}`, 'DELETE', null, state.token);
            await loadUserData();
            showToast('Venda anulada e stock reposto', 'success');
        }
    }
}

function renderFilterChips() {
    const chipsDiv = document.getElementById('filterChips');
    if (!chipsDiv) return;
    const categories = ['Todos', ...new Set(state.products.map(p => p.categoria).filter(Boolean))];
    chipsDiv.innerHTML = categories.map(cat => `<button class="btn ${state.categoryFilter === cat ? '' : 'btn-secondary'}" data-cat="${escapeHtml(cat)}" style="padding:0.35rem 0.75rem; height:auto;">${escapeHtml(cat)}</button>`).join('');
    document.querySelectorAll('#filterChips [data-cat]').forEach(btn => btn.addEventListener('click', () => {
        state.categoryFilter = btn.dataset.cat;
        state.page = 1;
        renderProducts();
    }));
}

function renderProducts() {
    renderFilterChips();
    let filtered = state.products.filter(p => (state.categoryFilter === 'Todos' || p.categoria === state.categoryFilter) && p.nome.toLowerCase().includes(state.searchTerm.toLowerCase()));
    const start = (state.page - 1) * state.perPage;
    const pageItems = filtered.slice(start, start + state.perPage);
    const grid = document.getElementById('prodGrid');
    if (!grid) return;
    grid.innerHTML = pageItems.map(p => `<div class="produto-card"><strong>${escapeHtml(p.nome)}</strong> ${p.stock <= 3 ? '<span class="badge">Stock baixo</span>' : ''}<div>${p.preco.toFixed(2)} EUR (IVA ${p.iva}%)</div><div>Stock: ${p.stock}</div><div style="display:flex; gap:0.25rem; margin-top:0.5rem;"><button class="addCartBtn" data-id="${p.id}" class="btn">Adicionar</button><button class="editProdBtn" data-id="${p.id}" class="btn btn-secondary">Editar</button><button class="delProdBtn" data-id="${p.id}" class="btn btn-danger">Apagar</button></div></div>`).join('');
    document.querySelectorAll('.addCartBtn').forEach(btn => btn.addEventListener('click', () => addToCart(parseInt(btn.dataset.id))));
    document.querySelectorAll('.editProdBtn').forEach(btn => btn.addEventListener('click', () => openProductModal(parseInt(btn.dataset.id))));
    document.querySelectorAll('.delProdBtn').forEach(btn => btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id))));
    const totalPages = Math.ceil(filtered.length / state.perPage);
    const pagDiv = document.getElementById('prodPagination');
    if (pagDiv && totalPages > 1) {
        pagDiv.innerHTML = Array.from({
            length: totalPages
        }, (_, i) => `<button class="page-btn ${state.page === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('');
        document.querySelectorAll('.page-btn').forEach(btn => btn.addEventListener('click', () => {
            state.page = parseInt(btn.dataset.page);
            renderProducts();
        }));
    } else if (pagDiv) pagDiv.innerHTML = '';
}

function addToCart(prodId) {
    const prod = state.products.find(p => p.id === prodId);
    if (!prod || prod.stock <= 0) {
        showToast('Sem stock', 'error');
        return;
    }
    const existing = state.cart.find(i => i.id === prodId);
    if (existing) existing.qty++;
    else state.cart.push({
        id: prod.id,
        name: prod.nome,
        price: prod.preco,
        qty: 1,
        iva: prod.iva
    });
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItemsList');
    if (!container) return;
    if (state.cart.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:gray;">Carrinho vazio</div>';
        document.getElementById('cartTotal').innerText = '0.00';
        return;
    }
    let total = 0;
    container.innerHTML = state.cart.map((item, idx) => {
        total += item.price * item.qty;
        return `<div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-hover); padding:0.5rem; margin-bottom:0.25rem; border-radius:6px;"><div><strong>${escapeHtml(item.name)}</strong><br>${item.price.toFixed(2)} EUR x ${item.qty}</div><div><button class="incCart" data-idx="${idx}">+</button> <button class="decCart" data-idx="${idx}">-</button> <button class="removeCart" data-idx="${idx}">X</button></div></div>`;
    }).join('');
    document.querySelectorAll('.incCart').forEach(btn => btn.addEventListener('click', () => {
        let idx = parseInt(btn.dataset.idx);
        let prod = state.products.find(p => p.id === state.cart[idx].id);
        if (prod.stock > state.cart[idx].qty) {
            state.cart[idx].qty++;
            renderCart();
        } else showToast('Stock insuficiente', 'error');
    }));
    document.querySelectorAll('.decCart').forEach(btn => btn.addEventListener('click', () => {
        let idx = parseInt(btn.dataset.idx);
        if (state.cart[idx].qty > 1) state.cart[idx].qty--;
        else state.cart.splice(idx, 1);
        renderCart();
    }));
    document.querySelectorAll('.removeCart').forEach(btn => btn.addEventListener('click', () => {
        let idx = parseInt(btn.dataset.idx);
        state.cart.splice(idx, 1);
        renderCart();
    }));
    const discount = parseFloat(document.getElementById('discountInput')?.value || 0);
    const finalTotal = total * (1 - discount / 100);
    document.getElementById('cartTotal').innerText = finalTotal.toFixed(2);
}

async function checkout() {
    if (state.cart.length === 0) {
        showToast('Carrinho vazio', 'error');
        return;
    }
    if (state.confirmSale && !confirm('Finalizar venda?')) return;
    const discount = parseFloat(document.getElementById('discountInput')?.value || 0);
    let subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    let total = subtotal * (1 - discount / 100);
    const sale = {
        date: new Date().toISOString(),
        items: [...state.cart],
        subtotal,
        desconto: discount,
        total,
        client: state.cartClient ? {
            ...state.cartClient
        } : null,
        method: state.paymentMethod
    };
    for (let item of state.cart) {
        let prod = state.products.find(p => p.id === item.id);
        if (prod) {
            prod.stock -= item.qty;
            await saveProduct(prod);
        }
    }
    await saveSale(sale);
    state.cart = [];
    state.cartClient = null;
    document.getElementById('clientInfo').innerHTML = 'Cliente: <strong>Não associado</strong>';
    renderCart();
    renderProducts();
    renderHistory();
    renderDashboard();
    showReceipt(sale);
    showToast('Venda finalizada', 'success');
}

function showReceipt(sale) {
    const empresa = state.currentUser ? state.currentUser.company : 'Empresa';
    const content = document.getElementById('receiptContent');
    content.innerHTML = `<div style="text-align:center"><h2>${escapeHtml(empresa)}</h2><p>${new Date(sale.date).toLocaleString()}</p><p>Cliente: ${sale.client?.nome || 'Cliente final'}</p><p>Método: ${sale.method}</p></div><hr><table style="width:100%">${sale.items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${i.qty}x<td class="text-right">${(i.price * i.qty).toFixed(2)} EUR</td></tr>`).join('')}</tr><hr><div>Subtotal: ${sale.subtotal.toFixed(2)} EUR<br>Desconto: ${sale.desconto}%<br><strong>Total: ${sale.total.toFixed(2)} EUR</strong></div><div style="text-align:center; margin-top:1rem;">Obrigado pela preferência.</div>`;
    document.getElementById('receiptModal').style.display = 'flex';
    window.lastReceipt = sale;
}

function renderHistory() {
    const start = document.getElementById('histStart').value;
    const end = document.getElementById('histEnd').value;
    const method = document.getElementById('histMethod').value;
    let filtered = state.sales.filter(s => (!start || s.date.split('T')[0] >= start) && (!end || s.date.split('T')[0] <= end) && (!method || s.method === method));
    const tbody = document.getElementById('histTable');
    tbody.innerHTML = filtered.map(s => `<tr><td>#${s.id}</td><td>${new Date(s.date).toLocaleString()}</td><td>${s.client?.nome || 'Anónimo'}</td><td>${s.method}</td><td>${s.total.toFixed(2)} EUR</td><td><button class="viewReceiptBtn" data-id="${s.id}">Ver talão</button> <button class="cancelSaleBtn" data-id="${s.id}" style="background:#dc3545;">Anular</button></td></tr>`).join('');
    document.querySelectorAll('.viewReceiptBtn').forEach(btn => btn.addEventListener('click', () => {
        const sale = state.sales.find(s => s.id == btn.dataset.id);
        if (sale) showReceipt(sale);
    }));
    document.querySelectorAll('.cancelSaleBtn').forEach(btn => btn.addEventListener('click', () => cancelSale(parseInt(btn.dataset.id))));
}

function renderClients() {
    const grid = document.getElementById('clientsGrid');
    if (!grid) return;
    grid.innerHTML = state.clients.map(c => `<div class="produto-card"><strong>${escapeHtml(c.nome)}</strong><div>NIF: ${c.nif || '-'}</div><div>Email: ${c.email || '-'}</div><div><button class="editClientBtn" data-id="${c.id}">Editar</button> <button class="delClientBtn" data-id="${c.id}" style="background:#dc3545;">Apagar</button></div></div>`).join('');
    document.querySelectorAll('.editClientBtn').forEach(btn => btn.addEventListener('click', () => openClientModal(parseInt(btn.dataset.id))));
    document.querySelectorAll('.delClientBtn').forEach(btn => btn.addEventListener('click', () => deleteClient(parseInt(btn.dataset.id))));
}

function renderDashboard() {
    const totalRevenue = state.sales.reduce((s, v) => s + v.total, 0);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => s.date.split('T')[0] === today);
    const todayRevenue = todaySales.reduce((s, v) => s + v.total, 0);
    const avgTicket = todaySales.length ? todayRevenue / todaySales.length : 0;
    animateValue(document.getElementById('totalRevenue'), totalRevenue, { decimals: 2, suffix: ' EUR' });
    animateValue(document.getElementById('todaySales'), todaySales.length, { decimals: 0 });
    animateValue(document.getElementById('avgTicket'), avgTicket, { decimals: 2, suffix: ' EUR' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdaySales = state.sales.filter(s => s.date.split('T')[0] === yesterdayStr);
    const yesterdayRevenue = yesterdaySales.reduce((s, v) => s + v.total, 0);
    renderTrend('revenueTrend', todayRevenue, yesterdayRevenue);
    renderTrend('salesTrend', todaySales.length, yesterdaySales.length);

    const lowStockProducts = state.products.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock);
    animateValue(document.getElementById('lowStockCount'), lowStockProducts.length, { decimals: 0 });
    const lowStockListEl = document.getElementById('lowStockList');
    if (lowStockListEl) {
        lowStockListEl.innerHTML = lowStockProducts.length
            ? lowStockProducts.slice(0, 6).map(p => `<div class="widget-item"><span>${escapeHtml(p.nome)}</span><span class="badge">${p.stock} un.</span></div>`).join('')
            : '<div class="widget-item-empty">Sem produtos com stock baixo 🎉</div>';
    }

    const recentSalesListEl = document.getElementById('recentSalesList');
    if (recentSalesListEl) {
        const recent = state.sales.slice(0, 6);
        recentSalesListEl.innerHTML = recent.length
            ? recent.map(s => `<div class="widget-item"><span>#${s.id} · ${escapeHtml(s.client?.nome || 'Cliente final')}</span><strong>${s.total.toFixed(2)} EUR</strong></div>`).join('')
            : '<div class="widget-item-empty">Ainda sem vendas</div>';
    }

    const topClientsListEl = document.getElementById('topClientsList');
    if (topClientsListEl) {
        const clientTotals = {};
        state.sales.forEach(s => {
            const key = s.client?.nome || 'Cliente final';
            clientTotals[key] = (clientTotals[key] || 0) + s.total;
        });
        const topClients = Object.entries(clientTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
        topClientsListEl.innerHTML = topClients.length
            ? topClients.map(([name, total]) => `<div class="widget-item"><span>${escapeHtml(name)}</span><strong>${total.toFixed(2)} EUR</strong></div>`).join('')
            : '<div class="widget-item-empty">Ainda sem dados</div>';
    }

    if (charts.salesChart) charts.salesChart.destroy();
    const ctx = document.getElementById('salesChart').getContext('2d');
    const last7 = [...Array(7)].map((_, i) => {
        let d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();
    const data7 = last7.map(d => state.sales.filter(s => s.date.split('T')[0] === d).reduce((a, b) => a + b.total, 0));
    charts.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7.map(d => d.slice(5)),
            datasets: [{
                label: 'Vendas (EUR)',
                data: data7,
                borderColor: '#2d5b42'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    const payData = {
        dinheiro: 0,
        multibanco: 0,
        mbway: 0
    };
    state.sales.forEach(s => {
        if (payData[s.method] !== undefined) payData[s.method]++;
    });
    const payCtx = document.getElementById('paymentChart').getContext('2d');
    if (charts.paymentChart) charts.paymentChart.destroy();
    charts.paymentChart = new Chart(payCtx, {
        type: 'pie',
        data: {
            labels: ['Dinheiro', 'Multibanco', 'MB Way'],
            datasets: [{
                data: [payData.dinheiro, payData.multibanco, payData.mbway],
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Nº de Vendas por Método' },
                legend: { position: 'bottom' }
            }
        }
    });

    const payValue = {
        dinheiro: 0,
        multibanco: 0,
        mbway: 0
    };
    state.sales.forEach(s => {
        if (payValue[s.method] !== undefined) payValue[s.method] += s.total;
    });
    const payValueCtx = document.getElementById('paymentValueChart').getContext('2d');
    if (charts.paymentValueChart) charts.paymentValueChart.destroy();
    charts.paymentValueChart = new Chart(payValueCtx, {
        type: 'pie',
        data: {
            labels: ['Dinheiro', 'Multibanco', 'MB Way'],
            datasets: [{
                data: [payValue.dinheiro, payValue.multibanco, payValue.mbway],
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Faturação (EUR) por Método' },
                legend: { position: 'bottom' }
            }
        }
    });
    const prodMap = {};
    state.sales.forEach(s => s.items.forEach(i => {
        prodMap[i.name] = (prodMap[i.name] || 0) + i.qty;
    }));
    const top5 = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCtx = document.getElementById('topProductsChart').getContext('2d');
    if (charts.topChart) charts.topChart.destroy();
    charts.topChart = new Chart(topCtx, {
        type: 'bar',
        data: {
            labels: top5.map(t => t[0]),
            datasets: [{
                label: 'Quantidade',
                data: top5.map(t => t[1]),
                backgroundColor: '#2d5b42'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Top 5 Produtos' },
                legend: { display: false }
            }
        }
    });
}

function renderAll() {
    renderProducts();
    renderCart();
    renderClients();
    renderHistory();
    renderDashboard();
}

function clearProductModalFields() {
    document.getElementById('prodName').value = '';
    document.getElementById('prodCat').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodVat').value = '23';
    document.getElementById('prodStock').value = '0';
    document.getElementById('prodDesc').value = '';
}

function openProductModal(id = null) {
    const modal = document.getElementById('productModal');
    document.getElementById('productModalTitle').innerText = id ? 'Editar Produto' : 'Novo Produto';
    if (id) {
        const p = state.products.find(p => p.id === id);
        if (p) {
            document.getElementById('prodName').value = p.nome;
            document.getElementById('prodCat').value = p.categoria;
            document.getElementById('prodPrice').value = p.preco;
            document.getElementById('prodVat').value = p.iva;
            document.getElementById('prodStock').value = p.stock;
            document.getElementById('prodDesc').value = p.descricao || '';
            window.editId = id;
        } else {
            window.editId = null;
            clearProductModalFields();
        }
    } else {
        clearProductModalFields();
        window.editId = null;
    }
    modal.style.display = 'flex';
}

async function openClientModal(id = null) {
    const modal = document.getElementById('clientModal');
    document.getElementById('clientModalTitle').innerText = id ? 'Editar Cliente' : 'Novo Cliente';
    if (id) {
        const c = state.clients.find(c => c.id === id);
        if (c) {
            document.getElementById('clientName').value = c.nome;
            document.getElementById('clientNif').value = c.nif || '';
            document.getElementById('clientEmail').value = c.email || '';
            document.getElementById('clientPhone').value = c.telefone || '';
            document.getElementById('clientAddress').value = c.morada || '';
            window.editClientId = id;
        }
    } else {
        document.getElementById('clientName').value = '';
        document.getElementById('clientNif').value = '';
        document.getElementById('clientEmail').value = '';
        document.getElementById('clientPhone').value = '';
        document.getElementById('clientAddress').value = '';
        window.editClientId = null;
    }
    modal.style.display = 'flex';
}

document.getElementById('saveProductBtn').onclick = async () => {
    let precoStr = document.getElementById('prodPrice').value.replace(',', '.');
    let preco = parseFloat(precoStr);
    const product = {
        id: window.editId,
        nome: document.getElementById('prodName').value.trim(),
        categoria: document.getElementById('prodCat').value.trim(),
        preco: preco,
        iva: parseInt(document.getElementById('prodVat').value) || 23,
        stock: parseInt(document.getElementById('prodStock').value) || 0,
        descricao: document.getElementById('prodDesc').value.trim()
    };
    if (!product.nome || !product.categoria || isNaN(product.preco) || product.preco <= 0) {
        showToast('Preencha nome, categoria e preço válido', 'error');
        return;
    }
    try {
        await saveProduct(product);
        document.getElementById('productModal').style.display = 'none';
    } catch (error) {
        showToast('Erro ao guardar produto: ' + error.message, 'error');
    }
};

document.getElementById('saveClientBtn').onclick = async () => {
    const client = {
        id: window.editClientId,
        nome: document.getElementById('clientName').value.trim(),
        nif: document.getElementById('clientNif').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        telefone: document.getElementById('clientPhone').value.trim(),
        morada: document.getElementById('clientAddress').value.trim()
    };
    if (!client.nome) {
        showToast('Nome obrigatório', 'error');
        return;
    }
    try {
        await saveClient(client);
        document.getElementById('clientModal').style.display = 'none';
    } catch (error) {
        showToast('Erro ao guardar cliente: ' + error.message, 'error');
    }
};

document.getElementById('closeProductModal').onclick = () => document.getElementById('productModal').style.display = 'none';
document.getElementById('closeClientModal').onclick = () => document.getElementById('clientModal').style.display = 'none';

async function doLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const email = document.getElementById('loginEmail').value.trim();
    const company = document.getElementById('companyName').value.trim();
    const type = document.getElementById('accountType').value;
    if (!username || !password || !email || !company) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    try {
        // Tenta login primeiro; se falhar, regista novo utilizador
        let response;
        try {
            response = await APIClient.request('/auth/login', 'POST', { username, password });
        } catch (loginError) {
            // Se falhar no login, tenta registar novo utilizador
            response = await APIClient.request('/auth/register', 'POST', { username, password, email, company, type });
        }
        state.token = response.token;
        state.currentUser = response.user;
        localStorage.setItem('token', state.token);
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'flex';
        await loadUserData();
        initTabs();
        renderAll();
        showToast(`Bem-vindo, ${username}!`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Erro ao entrar: ' + e.message, 'error');
    }
}

document.getElementById('doLoginBtn').onclick = doLogin;
document.getElementById('logoutBtn').onclick = () => {
    localStorage.clear();
    location.reload();
};
document.getElementById('themeToggle').onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
};
document.getElementById('clearCartBtn').onclick = () => {
    state.cart = [];
    state.cartClient = null;
    renderCart();
    document.getElementById('clientInfo').innerHTML = 'Cliente: <strong>Não associado</strong>';
};
document.getElementById('checkoutBtn').onclick = checkout;
document.getElementById('addProductBtn').onclick = () => openProductModal();
document.getElementById('addClientBtn').onclick = () => openClientModal();
document.getElementById('selectClientBtn').onclick = () => openSelectClientModal();

document.getElementById('searchProd').addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    state.page = 1;
    renderProducts();
});
document.getElementById('clearSearchBtn').onclick = () => {
    state.searchTerm = '';
    state.categoryFilter = 'Todos';
    document.getElementById('searchProd').value = '';
    state.page = 1;
    renderProducts();
};

document.querySelectorAll('#paymentMethods > div[data-method]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.method;
        document.querySelectorAll('#paymentMethods > div[data-method]').forEach(b => b.classList.toggle('selected', b === btn));
    });
});
document.querySelector(`#paymentMethods > div[data-method="${state.paymentMethod}"]`)?.classList.add('selected');

const savedSoundPref = localStorage.getItem('soundEnabled');
state.soundEnabled = savedSoundPref === 'true';
document.getElementById('soundPref').checked = state.soundEnabled;
document.getElementById('soundPref').addEventListener('change', (e) => {
    state.soundEnabled = e.target.checked;
    localStorage.setItem('soundEnabled', state.soundEnabled);
});

const savedConfirmPref = localStorage.getItem('confirmSale');
state.confirmSale = savedConfirmPref === null ? true : savedConfirmPref === 'true';
document.getElementById('confirmPref').checked = state.confirmSale;
document.getElementById('confirmPref').addEventListener('change', (e) => {
    state.confirmSale = e.target.checked;
    localStorage.setItem('confirmSale', state.confirmSale);
});

function openSelectClientModal() {
    const modal = document.getElementById('selectClientModal');
    const listDiv = document.getElementById('clientSelectList');
    listDiv.innerHTML = state.clients.map(c => `<button class="select-client-option" data-id="${c.id}" style="display:block; width:100%; margin:4px 0; background:var(--surface-hover); border:none; padding:8px; text-align:left;">${escapeHtml(c.nome)} - ${c.nif || 'sem NIF'}</button>`).join('');
    document.querySelectorAll('.select-client-option').forEach(btn => btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const cli = state.clients.find(c => c.id === id);
        state.cartClient = cli;
        document.getElementById('clientInfo').innerHTML = `Cliente: <strong>${escapeHtml(cli.nome)}</strong>`;
        modal.style.display = 'none';
        showToast(`Cliente ${cli.nome} associado`);
    }));
    document.getElementById('clearClientSaleBtn').onclick = () => {
        state.cartClient = null;
        document.getElementById('clientInfo').innerHTML = 'Cliente: <strong>Não associado</strong>';
        modal.style.display = 'none';
    };
    document.getElementById('closeSelectClientModal').onclick = () => modal.style.display = 'none';
    modal.style.display = 'flex';
}

document.getElementById('exportExcelBtn').onclick = () => {
    const ws = XLSX.utils.json_to_sheet(state.sales.map(s => ({
        ID: s.id,
        Data: new Date(s.date).toLocaleString(),
        Cliente: s.client?.nome,
        Total: s.total
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
    XLSX.writeFile(wb, 'vendas.xlsx');
    showToast('Excel exportado');
};
document.getElementById('clearHistBtn').onclick = () => {
    document.getElementById('histStart').value = '';
    document.getElementById('histEnd').value = '';
    document.getElementById('histMethod').value = '';
    renderHistory();
};
document.getElementById('generateReportBtn').onclick = () => {
    const start = document.getElementById('reportStart').value;
    const end = document.getElementById('reportEnd').value;
    let filtered = state.sales;
    if (start) filtered = filtered.filter(s => s.date.split('T')[0] >= start);
    if (end) filtered = filtered.filter(s => s.date.split('T')[0] <= end);
    const total = filtered.reduce((s, v) => s + v.total, 0);
    document.getElementById('reportContent').innerHTML = `<p>Período: ${start || 'início'} - ${end || 'fim'}</p><p>Total de vendas: ${filtered.length}</p><p>Faturação: ${total.toFixed(2)} EUR</p>`;
};
document.getElementById('pdfReportBtn').onclick = async () => {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF();
    doc.text(`Relatório - ${state.currentUser.company}`, 20, 20);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, 30);
    let y = 40;
    state.sales.slice(0, 15).forEach(s => {
        doc.text(`#${s.id} ${new Date(s.date).toLocaleDateString()} - ${s.total.toFixed(2)} EUR`, 20, y);
        y += 10;
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
    });
    doc.save(`relatorio_${state.currentUser.username}.pdf`);
    showToast('PDF gerado');
};
document.getElementById('exportBackupBtn').onclick = async () => {
    const res = await APIClient.request('/backup/export', 'GET', null, state.token);
    const blob = new Blob([JSON.stringify(res.data)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${state.currentUser.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado');
};
document.getElementById('importBackupBtn').onclick = () => document.getElementById('importBackupFile').click();
document.getElementById('importBackupFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await APIClient.request('/backup/import', 'POST', data, state.token);
    await loadUserData();
    showToast('Backup importado');
});
document.getElementById('cleanOldBtn').onclick = async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oldSales = state.sales.filter(s => new Date(s.date) < oneYearAgo);
    if (oldSales.length === 0) {
        showToast('Não há vendas antigas');
        return;
    }
    if (confirm(`Remover ${oldSales.length} vendas com mais de 1 ano?`)) {
        for (let sale of oldSales) await APIClient.request(`/sales/${sale.id}`, 'DELETE', null, state.token);
        await loadUserData();
        showToast(`${oldSales.length} vendas removidas`);
    }
};
document.getElementById('optimizeBtn').onclick = () => showToast('Otimização concluída', 'success');
document.getElementById('saveEmailConfigBtn').onclick = () => {
    state.emailConfig = {
        userId: document.getElementById('emailjsUserId').value,
        serviceId: document.getElementById('emailjsService').value,
        templateId: document.getElementById('emailjsTemplate').value
    };
    localStorage.setItem('emailjs_config', JSON.stringify(state.emailConfig));
    showToast('Configuração guardada');
};
document.getElementById('demoDataBtn').onclick = async () => {
    if (!confirm('Carregar dados de demonstração? (substitui os atuais)')) return;
    const demoProducts = [{
        nome: 'Café Expresso',
        categoria: 'Bebidas',
        preco: 1.2,
        iva: 23,
        stock: 50,
        descricao: ''
    }, {
        nome: 'Pastel de Nata',
        categoria: 'Pastelaria',
        preco: 1.5,
        iva: 13,
        stock: 30,
        descricao: ''
    }, {
        nome: 'Tosta Mista',
        categoria: 'Comida',
        preco: 3.5,
        iva: 23,
        stock: 20,
        descricao: ''
    }];
    const demoClients = [{
        nome: 'João Silva',
        nif: '123456789',
        email: 'joao@demo.com',
        telefone: '912345678',
        morada: 'Rua Demo'
    }];
    for (let p of demoProducts) await saveProduct(p);
    for (let c of demoClients) await saveClient(c);
    showToast('Dados de exemplo carregados');
};
document.getElementById('resetAllBtn').onclick = () => {
    if (confirm('ATENÇÃO: todos os dados e utilizadores serão perdidos. Continuar?')) {
        localStorage.clear();
        location.reload();
    }
};
document.getElementById('emailReceiptBtn').onclick = () => {
    if (window.lastReceipt) openEmailModal(window.lastReceipt);
    else showToast('Nenhuma fatura selecionada', 'error');
};

function openEmailModal(sale) {
    const modal = document.getElementById('emailModal');
    document.getElementById('emailTo').value = '';
    document.getElementById('emailSubject').value = `Fatura ${state.currentUser.company} - Venda #${sale.id}`;
    document.getElementById('emailMessage').value = `Caro cliente,\n\nSegue em anexo a fatura da sua compra.\n\nObrigado pela preferência!\n\n${state.currentUser.company}`;
    const previewDiv = document.getElementById('emailPreviewHTML');
    previewDiv.innerHTML = document.getElementById('receiptContent').innerHTML;
    modal.style.display = 'flex';
    window.emailSale = sale;
}
document.getElementById('sendEmailBtn').onclick = async () => {
    const to = document.getElementById('emailTo').value.trim();
    const subject = document.getElementById('emailSubject').value;
    const message = document.getElementById('emailMessage').value;
    if (!to) {
        showToast('Email destinatário necessário', 'error');
        return;
    }
    if (state.emailConfig.userId && state.emailConfig.serviceId && state.emailConfig.templateId) {
        emailjs.init(state.emailConfig.userId);
        const templateParams = {
            to_email: to,
            subject: subject,
            message: message,
            fatura_html: document.getElementById('emailPreviewHTML').innerHTML
        };
        try {
            await emailjs.send(state.emailConfig.serviceId, state.emailConfig.templateId, templateParams);
            showToast('Email enviado com sucesso!');
            document.getElementById('emailModal').style.display = 'none';
        } catch (e) {
            showToast('Erro ao enviar email: ' + e.text, 'error');
        }
    } else {
        const body = encodeURIComponent(message + '\n\n' + document.getElementById('emailPreviewHTML').innerText);
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${body}`;
        showToast('Cliente de email aberto');
        document.getElementById('emailModal').style.display = 'none';
    }
};
document.getElementById('copyReceiptTextBtn').onclick = () => {
    const text = document.getElementById('emailPreviewHTML').innerText;
    navigator.clipboard.writeText(text);
    showToast('Fatura copiada para a área de transferência');
};
document.getElementById('closeEmailModal').onclick = () => document.getElementById('emailModal').style.display = 'none';
document.getElementById('copyReceiptBtn').onclick = () => {
    const text = document.getElementById('receiptContent').innerText;
    navigator.clipboard.writeText(text);
    showToast('Talão copiado');
};
document.getElementById('printReceiptBtn').onclick = () => window.print();
document.getElementById('closeReceiptBtn').onclick = () => document.getElementById('receiptModal').style.display = 'none';
document.getElementById('closeHelpBtn').onclick = () => document.getElementById('helpModal').style.display = 'none';

function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panes = {
        venda: document.getElementById('tabVenda'),
        historico: document.getElementById('tabHistorico'),
        clientes: document.getElementById('tabClientes'),
        dashboard: document.getElementById('tabDashboard'),
        config: document.getElementById('tabConfig')
    };

    function activateTab(tabId) {
        Object.values(panes).forEach(pane => pane.classList.remove('active'));
        tabBtns.forEach(btn => btn.classList.remove('active'));
        panes[tabId].classList.add('active');
        const activeBtn = Array.from(tabBtns).find(btn => btn.dataset.tab === tabId);
        if (activeBtn) activeBtn.classList.add('active');
        localStorage.setItem('activeTab', tabId);
        if (tabId === 'historico') renderHistory();
        if (tabId === 'clientes') renderClients();
        if (tabId === 'dashboard') renderDashboard();
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('open');
    }
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            if (tabId && panes[tabId]) activateTab(tabId);
        });
    });
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && panes[savedTab]) activateTab(savedTab);
    else activateTab('venda');
}

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('open');
});
document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
});

document.getElementById('usersBtn').onclick = () => {
    if (confirm('Voltar ao ecrã de login para gerir utilizadores?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        location.reload();
    }
};
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        state.cart = [];
        renderCart();
        showToast('Nova venda');
    }
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        checkout();
    }
    if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('helpModal').style.display = 'flex';
    }
    if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
});
const savedTheme = localStorage.getItem('theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
const savedToken = localStorage.getItem('token');
const savedUser = localStorage.getItem('currentUser');
if (savedToken && savedUser) {
    state.token = savedToken;
    state.currentUser = JSON.parse(savedUser);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';
    loadUserData().then(() => {
        initTabs();
        renderAll();
    }).catch(() => {
        // Se falhar, limpa sessão e volta ao login
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        document.getElementById('loginScreen').style.display = 'grid';
        document.getElementById('appScreen').style.display = 'none';
    });
} else {
    document.getElementById('loginScreen').style.display = 'grid';
    document.getElementById('appScreen').style.display = 'none';
    const userListDiv = document.getElementById('userListContainer');
    userListDiv.innerHTML = '<div style="padding:8px; color:gray;">Utilize um nome de utilizador e palavra-passe para entrar ou criar conta.</div>';
}