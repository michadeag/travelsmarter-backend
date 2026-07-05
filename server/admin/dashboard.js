// Admin Dashboard JavaScript
// Connects to backend API for data management with JWT authentication

// Determine correct API URL based on current domain
let API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_URL = localStorage.getItem('apiUrl') || 'http://localhost:5000';
} else {
    // For production, use api subdomain
    const apiUrl = localStorage.getItem('apiUrl');
    if (apiUrl) {
        API_URL = apiUrl;
    } else if (window.location.hostname === 'travelsmarterapp.com') {
        API_URL = 'https://api.travelsmarterapp.com';
    } else {
        API_URL = window.location.origin;
    }
}

console.log('🔒 Admin Dashboard using API:', API_URL);

// Global state for dashboard data
let usersData = [];
let dealsData = [];
let hacksData = [];
let promosData = [];

// Helper function to get admin JWT token
function getAdminToken() {
    return localStorage.getItem('adminToken');
}

// Helper function to get auth headers with JWT token
function getAuthHeaders() {
    const token = getAdminToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupEventListeners();
});

function initDashboard() {
    // Check if logged in
    if (!getAdminToken()) {
        redirectToLogin();
        return;
    }

    // Verify token is still valid
    verifyAdminToken();

    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Load dashboard data
    loadDashboardStats();
    loadUsers();
    loadSubscriptions();
    loadDeals();
    loadHacks();
    loadPromos();
    loadEmailTemplates();
    loadAnalytics();
    loadPageviews();
    loadRecentActivities();
    loadSettings();

    // Set admin name
    const adminName = localStorage.getItem('adminName') || 'Admin';
    document.getElementById('admin-name').textContent = adminName;
    document.getElementById('user-avatar').textContent = adminName.charAt(0).toUpperCase();
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // Search functionality
    document.getElementById('user-search')?.addEventListener('input', (e) => {
        filterUsers(e.target.value);
    });

    document.getElementById('deals-search')?.addEventListener('input', (e) => {
        filterDeals(e.target.value);
    });
}

// TAB SWITCHING
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active to clicked nav link
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        subscriptions: 'Subscriptions',
        deals: 'Deals Management',
        hacks: 'Hacks & Modules',
        promos: 'Promo Codes',
        'email-templates': 'Email Templates',
        analytics: 'Analytics',
        settings: 'Settings'
    };

    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';
}

// ALERTS
function showAlert(message, type = 'success') {
    const alertEl = document.getElementById('alert');
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type} show`;

    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 4000);
}

// DASHBOARD STATS
async function loadDashboardStats() {
    try {
        // Fetch stats from API
        const [usersRes, subsRes, dealsRes] = await Promise.all([
            fetch(`${API_URL}/api/auth/users/count`, {
                headers: getAuthHeaders()
            }),
            fetch(`${API_URL}/api/subscriptions/stats`, {
                headers: getAuthHeaders()
            }),
            fetch(`${API_URL}/api/admin/deals/count`, {
                headers: getAuthHeaders()
            })
        ]);

        if (usersRes.ok) {
            const data = await usersRes.json();
            document.getElementById('stat-users').textContent = data.count || '0';
        }

        if (dealsRes.ok) {
            const data = await dealsRes.json();
            document.getElementById('stat-deals').textContent = data.count || '0';
        }

        // Load subscription breakdown
        loadSubscriptionStats();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSubscriptionStats() {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions/stats`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-subscriptions').textContent = data.active || '0';

            // Update counts
            document.getElementById('count-free').textContent = data.free || '0';
            document.getElementById('count-smart').textContent = data.smartTraveler || '0';
            document.getElementById('count-elite').textContent = data.elite || '0';

            // Calculate MRR
            const smartMRR = (data.smartTraveler || 0) * 19;
            const eliteMRR = (data.elite || 0) * 49;
            const totalMRR = smartMRR + eliteMRR;

            document.getElementById('total-mrr').textContent = `$${totalMRR.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading subscription stats:', error);
    }
}

// USERS MANAGEMENT
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/activities`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayUsers(data.activities || []);
        } else if (response.status === 401) {
            console.error('Unauthorized - token may be expired');
            redirectToLogin();
        } else {
            console.error('Failed to load users:', response.status, response.statusText);
            displayError('users-table', `Error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        displayError('users-table', 'Failed to load users');
    }
}

function displayUsers(users) {
    // Store users data globally for use in edit/delete operations
    usersData = users;

    const tbody = document.getElementById('users-table');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.email}</td>
            <td>${user.first_name || ''} ${user.last_name || ''}</td>
            <td><span class="badge badge-${user.subscription_tier === 'free' ? 'info' : 'success'}">${user.subscription_tier}</span></td>
            <td>${formatDate(user.created_at)}</td>
            <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterUsers(query) {
    const rows = document.querySelectorAll('#users-table tr');
    rows.forEach(row => {
        const email = row.querySelector('td')?.textContent.toLowerCase();
        if (email?.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// USER MODALS
function openUserModal() {
    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('active');
    document.getElementById('modal-user-email').value = '';
    document.getElementById('modal-user-first').value = '';
    document.getElementById('modal-user-last').value = '';
    document.getElementById('modal-user-tier').value = 'free';
    // Reset edit mode
    modal.dataset.isEditing = 'false';
    modal.dataset.userId = '';
    // Reset modal title
    const modalTitle = document.querySelector('#user-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Add New User';
    }
}

async function saveUser() {
    const email = document.getElementById('modal-user-email').value;
    const firstName = document.getElementById('modal-user-first').value;
    const lastName = document.getElementById('modal-user-last').value;
    const tier = document.getElementById('modal-user-tier').value;
    const modal = document.getElementById('user-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const userId = modal.dataset.userId;

    if (!email) {
        showAlert('Email is required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/admin/users`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/admin/users/${userId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                email,
                firstName,
                lastName,
                subscriptionTier: tier
            })
        });

        if (response.ok) {
            showAlert('User saved successfully', 'success');
            closeUserModal();
            // Reset edit mode
            modal.dataset.isEditing = 'false';
            modal.dataset.userId = '';
            loadUsers();
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Failed to save user', 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showAlert('Error saving user', 'error');
    }
}

async function editUser(userId) {
    try {
        // Find user from stored global data
        const user = usersData.find(u => u.id === userId);

        if (!user) {
            showAlert('User not found', 'error');
            return;
        }

        // Populate modal with user data
        document.getElementById('modal-user-email').value = user.email;
        document.getElementById('modal-user-first').value = user.first_name || '';
        document.getElementById('modal-user-last').value = user.last_name || '';
        document.getElementById('modal-user-tier').value = user.subscription_tier || 'free';

        // Store userId for save operation
        document.getElementById('user-modal').dataset.userId = userId;
        document.getElementById('user-modal').dataset.isEditing = 'true';

        // Update modal title
        const modalTitle = document.querySelector('#user-modal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit User';
        }

        // Open modal
        openUserModal();
    } catch (error) {
        console.error('Error loading user for edit:', error);
        showAlert('Error loading user data', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('User deleted successfully', 'success');
            loadUsers();
        } else {
            showAlert('Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showAlert('Error deleting user', 'error');
    }
}

// SUBSCRIPTIONS
async function loadSubscriptions() {
    try {
        const response = await fetch(`${API_URL}/api/admin/subscriptions`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Subscriptions data:', data);
            displaySubscriptions(data.subscriptions || []);
        } else {
            console.error('Subscriptions API error:', response.status, response.statusText);
            displayError('subscriptions-table', `Failed to load subscriptions: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        displayError('subscriptions-table', 'Failed to load subscriptions');
    }
}

function displaySubscriptions(subscriptions) {
    console.log('displaySubscriptions called with:', subscriptions.length, 'items');
    const tbody = document.getElementById('subscriptions-table');

    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No subscriptions found</td></tr>';
        return;
    }

    tbody.innerHTML = subscriptions.map(sub => `
        <tr>
            <td>${sub.email || 'N/A'}</td>
            <td>${sub.tier}</td>
            <td><span class="badge badge-${sub.status === 'active' ? 'success' : 'danger'}">${sub.status}</span></td>
            <td>${formatDate(sub.created_at)}</td>
            <td>${formatDate(sub.current_period_end)}</td>
            <td>$${sub.price_monthly || '0'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editSubscription('${sub.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSubscription('${sub.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// SUBSCRIPTION MODALS & CRUD
function openSubscriptionModal() {
    document.getElementById('subscription-modal').classList.add('active');
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').classList.remove('active');
    document.getElementById('modal-subscription-tier').value = '';
    document.getElementById('modal-subscription-status').value = 'active';
}

async function editSubscription(subId) {
    try {
        const response = await fetch(`${API_URL}/api/subscriptions`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showAlert('Failed to load subscription data', 'error');
            return;
        }

        const data = await response.json();
        const sub = data.subscriptions.find(s => s.id === subId);

        if (!sub) {
            showAlert('Subscription not found', 'error');
            return;
        }

        document.getElementById('modal-subscription-tier').value = sub.tier;
        document.getElementById('modal-subscription-status').value = sub.status;
        document.getElementById('subscription-modal').dataset.subId = subId;
        openSubscriptionModal();
    } catch (error) {
        console.error('Error loading subscription for edit:', error);
        showAlert('Error loading subscription data', 'error');
    }
}

async function deleteSubscription(subId) {
    if (!confirm('Are you sure you want to delete this subscription?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/subscriptions/${subId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('Subscription deleted successfully', 'success');
            loadSubscriptions();
        } else {
            showAlert('Failed to delete subscription', 'error');
        }
    } catch (error) {
        console.error('Error deleting subscription:', error);
        showAlert('Error deleting subscription', 'error');
    }
}

async function saveSubscription() {
    const subId = document.getElementById('subscription-modal').dataset.subId;
    const tier = document.getElementById('modal-subscription-tier').value;
    const status = document.getElementById('modal-subscription-status').value;

    if (!tier || !status) {
        showAlert('All fields are required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/subscriptions/${subId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ tier, status })
        });

        if (response.ok) {
            showAlert('Subscription updated successfully', 'success');
            closeSubscriptionModal();
            loadSubscriptions();
        } else {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            showAlert(errorData.message || 'Failed to update subscription', 'error');
        }
    } catch (error) {
        console.error('Error updating subscription:', error);
        showAlert(error.message || 'Error updating subscription', 'error');
    }
}

// DEALS
async function loadDeals() {
    try {
        const response = await fetch(`${API_URL}/api/admin/deals?limit=50`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Deals data:', data);
            displayDeals(data.deals || []);
        } else {
            console.error('Deals API error:', response.status, response.statusText);
            displayError('deals-table', `Failed to load deals: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading deals:', error);
        displayError('deals-table', 'Failed to load deals');
    }
}

function displayDeals(deals) {
    // Store deals data globally for use in edit/delete operations
    dealsData = deals;

    const tbody = document.getElementById('deals-table');

    if (deals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No deals found</td></tr>';
        return;
    }

    tbody.innerHTML = deals.map(deal => `
        <tr>
            <td>${deal.title}</td>
            <td>${deal.category}</td>
            <td>$${deal.value_amount}</td>
            <td><span class="badge badge-${deal.verified ? 'success' : 'pending'}">${deal.verified ? 'Yes' : 'No'}</span></td>
            <td>${deal.upvote_count}</td>
            <td>${deal.expires_at ? formatDate(deal.expires_at) : 'No expiry'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editDeal('${deal.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDeal('${deal.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterDeals(query) {
    const rows = document.querySelectorAll('#deals-table tr');
    rows.forEach(row => {
        const title = row.querySelector('td')?.textContent.toLowerCase();
        if (title?.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// DEAL MODALS
function openDealModal() {
    document.getElementById('deal-modal').classList.add('active');
}

function closeDealModal() {
    const modal = document.getElementById('deal-modal');
    modal.classList.remove('active');
    document.getElementById('modal-deal-title').value = '';
    document.getElementById('modal-deal-description').value = '';
    document.getElementById('modal-deal-value').value = '';
    document.getElementById('modal-deal-category').value = '';
    modal.dataset.isEditing = 'false';
    modal.dataset.dealId = '';
    const modalTitle = document.querySelector('#deal-modal .modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = 'Add New Deal';
    }
}

async function saveDeal() {
    const modal = document.getElementById('deal-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const dealId = modal.dataset.dealId;

    const title = document.getElementById('modal-deal-title').value;
    const description = document.getElementById('modal-deal-description').value;
    const category = document.getElementById('modal-deal-category').value;
    const value = document.getElementById('modal-deal-value').value;

    if (!title || !value) {
        showAlert('Title and value are required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/admin/deals`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/admin/deals/${dealId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                description,
                category,
                deal_type: 'featured',
                value_amount: parseFloat(value),
                value_currency: 'USD'
            })
        });

        if (response.ok) {
            showAlert(isEditing ? 'Deal updated successfully' : 'Deal created successfully', 'success');
            closeDealModal();
            loadDeals();
        } else {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            showAlert(errorData.message || 'Failed to save deal', 'error');
        }
    } catch (error) {
        console.error('Error saving deal:', error);
        showAlert(error.message || 'Error saving deal', 'error');
    }
}

async function editDeal(dealId) {
    try {
        // Find deal from stored global data
        const deal = dealsData.find(d => d.id === dealId);

        if (!deal) {
            showAlert('Deal not found', 'error');
            return;
        }

        document.getElementById('modal-deal-title').value = deal.title;
        document.getElementById('modal-deal-description').value = deal.description || '';
        document.getElementById('modal-deal-category').value = deal.category || '';
        document.getElementById('modal-deal-value').value = deal.value_amount || '';

        const modal = document.getElementById('deal-modal');
        modal.dataset.dealId = dealId;
        modal.dataset.isEditing = 'true';

        const modalTitle = document.querySelector('#deal-modal .modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Deal';
        }

        openDealModal();
    } catch (error) {
        console.error('Error loading deal for edit:', error);
        showAlert('Error loading deal data', 'error');
    }
}

async function deleteDeal(dealId) {
    if (!confirm('Are you sure you want to delete this deal?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/deals/${dealId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('Deal deleted successfully', 'success');
            loadDeals();
        } else {
            showAlert('Failed to delete deal', 'error');
        }
    } catch (error) {
        console.error('Error deleting deal:', error);
        showAlert('Error deleting deal', 'error');
    }
}

// PROMO CODES
function openPromoModal() {
    document.getElementById('promo-modal').classList.add('active');
    // Set default date to 90 days from now
    const date = new Date();
    date.setDate(date.getDate() + 90);
    document.getElementById('modal-promo-until').value = date.toISOString().split('T')[0];
}

function closePromoModal() {
    const modal = document.getElementById('promo-modal');
    modal.classList.remove('active');
    document.getElementById('modal-promo-code').value = '';
    document.getElementById('modal-promo-percent').value = '';
    document.getElementById('modal-promo-max').value = '';
    modal.dataset.isEditing = 'false';
    modal.dataset.promoId = '';
}

async function loadPromos() {
    try {
        const response = await fetch(`${API_URL}/api/admin/promos`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Promos data:', data);
            displayPromos(data.data || []);
        } else {
            console.error('Promos API error:', response.status, response.statusText);
            displayError('promos-table', `Failed to load promo codes: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading promos:', error);
        displayError('promos-table', 'Failed to load promo codes');
    }
}

function displayPromos(promos) {
    // Store promos data globally for use in edit/delete operations
    promosData = promos;

    const tbody = document.getElementById('promos-table');

    if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No promo codes found</td></tr>';
        return;
    }

    tbody.innerHTML = promos.map(promo => `
        <tr>
            <td><strong>${promo.code}</strong></td>
            <td>${promo.discount_percent || promo.discount_amount}${promo.discount_percent ? '%' : '$'}</td>
            <td>${promo.current_uses || '0'}</td>
            <td>${promo.max_uses || '∞'}</td>
            <td>${promo.valid_until ? formatDate(promo.valid_until) : 'No expiry'}</td>
            <td><span class="badge badge-${promo.is_active ? 'success' : 'danger'}">${promo.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary" onclick="editPromo('${promo.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePromo('${promo.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function savePromo() {
    const modal = document.getElementById('promo-modal');
    const isEditing = modal.dataset.isEditing === 'true';
    const promoId = modal.dataset.promoId;

    const code = document.getElementById('modal-promo-code').value.toUpperCase();
    const percent = document.getElementById('modal-promo-percent').value;
    const maxUses = document.getElementById('modal-promo-max').value;
    const validUntil = document.getElementById('modal-promo-until').value;

    if (!code || !percent) {
        showAlert('Code and percentage are required', 'error');
        return;
    }

    try {
        let url = `${API_URL}/api/admin/promos`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/admin/promos/${promoId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                code,
                discount_percent: parseFloat(percent),
                discount_amount: null,
                max_uses: parseInt(maxUses) || null,
                valid_until: validUntil ? new Date(validUntil).toISOString() : null
            })
        });

        if (response.ok) {
            showAlert(isEditing ? 'Promo code updated successfully' : 'Promo code created successfully', 'success');
            closePromoModal();
            loadPromos();
        } else {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            showAlert(errorData.message || 'Failed to save promo code', 'error');
        }
    } catch (error) {
        console.error('Error saving promo:', error);
        showAlert(error.message || 'Error saving promo code', 'error');
    }
}

async function editPromo(promoId) {
    try {
        // Find promo from stored global data
        const promo = promosData.find(p => p.id === promoId);

        if (!promo) {
            showAlert('Promo not found', 'error');
            return;
        }

        document.getElementById('modal-promo-code').value = promo.code;
        document.getElementById('modal-promo-percent').value = promo.discount_percent;
        document.getElementById('modal-promo-max').value = promo.max_uses || '';
        if (promo.valid_until) {
            document.getElementById('modal-promo-until').value = promo.valid_until.split('T')[0];
        }

        const modal = document.getElementById('promo-modal');
        modal.dataset.promoId = promoId;
        modal.dataset.isEditing = 'true';

        openPromoModal();
    } catch (error) {
        console.error('Error loading promo for edit:', error);
        showAlert('Error loading promo data', 'error');
    }
}

async function deletePromo(promoId) {
    if (!confirm('Are you sure you want to delete this promo code?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/promos/${promoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('Promo code deleted successfully', 'success');
            loadPromos();
        } else {
            showAlert('Failed to delete promo code', 'error');
        }
    } catch (error) {
        console.error('Error deleting promo:', error);
        showAlert('Error deleting promo code', 'error');
    }
}

// HACKS - Load admin hack management interface
function loadHacks() {
    // Call the hack management list loader
    loadHacksList();
}

// RECENT ACTIVITIES
async function loadRecentActivities() {
    try {
        const response = await fetch(`${API_URL}/api/admin/activities?limit=10`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            displayActivities(data.activities || []);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function displayActivities(activities) {
    const tbody = document.getElementById('recent-activities');

    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No recent activities</td></tr>';
        return;
    }

    tbody.innerHTML = activities.map(activity => `
        <tr>
            <td>${activity.user_email}</td>
            <td>${activity.action}</td>
            <td>${formatTime(activity.created_at)}</td>
            <td><span class="badge badge-${activity.status === 'success' ? 'success' : 'danger'}">${activity.status}</span></td>
        </tr>
    `).join('');
}

// SETTINGS
async function loadSettings() {
    try {
        // Try to fetch from backend API
        const response = await fetch(`${API_URL}/api/admin/settings`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            const settings = data.data || {};

            // Populate form fields with settings values
            if (settings.sendgrid_api_key?.value) {
                document.getElementById('sendgrid-key').value = settings.sendgrid_api_key.value;
            }
            if (settings.sender_email?.value) {
                document.getElementById('sender-email').value = settings.sender_email.value;
            }
            if (settings.stripe_secret_key?.value) {
                document.getElementById('stripe-key').value = settings.stripe_secret_key.value;
            }
            if (settings.stripe_publishable_key?.value) {
                const pubKeyField = document.getElementById('stripe-pub-key');
                if (pubKeyField) {
                    pubKeyField.value = settings.stripe_publishable_key.value;
                }
            }
            if (settings.stripe_webhook_secret?.value) {
                document.getElementById('webhook-secret').value = settings.stripe_webhook_secret.value;
            }

            // Load Twitter settings
            if (settings.twitter_api_key?.value) {
                const el = document.getElementById('twitter-api-key');
                if (el) el.value = settings.twitter_api_key.value;
            }
            if (settings.twitter_api_secret?.value) {
                const el = document.getElementById('twitter-api-secret');
                if (el) el.value = settings.twitter_api_secret.value;
            }
            if (settings.twitter_access_token?.value) {
                const el = document.getElementById('twitter-access-token');
                if (el) el.value = settings.twitter_access_token.value;
            }
            if (settings.twitter_access_secret?.value) {
                const el = document.getElementById('twitter-access-secret');
                if (el) el.value = settings.twitter_access_secret.value;
            }
            if (settings.twitter_bearer_token?.value) {
                const el = document.getElementById('twitter-bearer-token');
                if (el) el.value = settings.twitter_bearer_token.value;
            }
            if (settings.twitter_auto_posting?.value) {
                const el = document.getElementById('twitter-auto-posting');
                if (el) el.checked = settings.twitter_auto_posting.value === 'true';
            }
            if (settings.twitter_posting_schedule?.value) {
                const el = document.getElementById('twitter-posting-schedule');
                if (el) el.value = settings.twitter_posting_schedule.value;
            }
            if (settings.twitter_posting_time?.value) {
                const el = document.getElementById('twitter-posting-time');
                if (el) el.value = settings.twitter_posting_time.value;
            }

            // Load checkboxes
            const sendSignupEmail = document.getElementById('send-signup');
            const sendSubEmail = document.getElementById('send-sub');
            const sendDigest = document.getElementById('send-digest');

            if (sendSignupEmail) {
                sendSignupEmail.checked = settings.send_email_on_signup?.value === 'true';
            }
            if (sendSubEmail) {
                sendSubEmail.checked = settings.send_email_on_subscription?.value === 'true';
            }
            if (sendDigest) {
                sendDigest.checked = settings.send_daily_digest?.value === 'true';
            }

            console.log('✅ Settings loaded from backend');
            return; // Success, don't need localStorage fallback
        }
    } catch (error) {
        console.warn('Backend API unavailable, trying localStorage fallback:', error.message);
    }

    // Fallback: Load from localStorage
    try {
        const stripePubKey = localStorage.getItem('stripePublishableKey');
        const stripeSecret = localStorage.getItem('admin_stripe_secret');
        const sendgridKey = localStorage.getItem('admin_sendgrid_key');
        const senderEmail = localStorage.getItem('admin_sender_email');
        const webhookSecret = localStorage.getItem('admin_webhook_secret');

        if (stripePubKey) {
            const pubKeyField = document.getElementById('stripe-pub-key');
            if (pubKeyField) pubKeyField.value = stripePubKey;
        }
        if (stripeSecret) {
            document.getElementById('stripe-key').value = stripeSecret;
        }
        if (sendgridKey) {
            document.getElementById('sendgrid-key').value = sendgridKey;
        }
        if (senderEmail) {
            document.getElementById('sender-email').value = senderEmail;
        }
        if (webhookSecret) {
            document.getElementById('webhook-secret').value = webhookSecret;
        }

        // Load checkboxes from localStorage
        const sendSignupEmail = document.getElementById('send-signup');
        const sendSubEmail = document.getElementById('send-sub');
        const sendDigest = document.getElementById('send-digest');

        if (sendSignupEmail) {
            sendSignupEmail.checked = localStorage.getItem('admin_send_signup_email') === 'true';
        }
        if (sendSubEmail) {
            sendSubEmail.checked = localStorage.getItem('admin_send_sub_email') === 'true';
        }
        if (sendDigest) {
            sendDigest.checked = localStorage.getItem('admin_send_digest') === 'true';
        }

        console.log('✅ Settings loaded from localStorage');
    } catch (localStorageError) {
        console.error('Error loading settings from localStorage:', localStorageError);
    }
}

async function saveSettings() {
    const sendgridKey = document.getElementById('sendgrid-key').value;
    const senderEmail = document.getElementById('sender-email').value;
    const stripeKey = document.getElementById('stripe-key').value;
    const stripePubKey = document.getElementById('stripe-pub-key')?.value || '';
    const webhookSecret = document.getElementById('webhook-secret').value;

    // Twitter settings
    const twitterApiKey = document.getElementById('twitter-api-key')?.value || '';
    const twitterApiSecret = document.getElementById('twitter-api-secret')?.value || '';
    const twitterAccessToken = document.getElementById('twitter-access-token')?.value || '';
    const twitterAccessSecret = document.getElementById('twitter-access-secret')?.value || '';
    const twitterBearerToken = document.getElementById('twitter-bearer-token')?.value || '';
    const twitterAutoPosting = document.getElementById('twitter-auto-posting')?.checked || false;
    const twitterPostingSchedule = document.getElementById('twitter-posting-schedule')?.value || 'recommended';
    const twitterPostingTime = document.getElementById('twitter-posting-time')?.value || '09:00';

    // Checkbox values
    const sendSignupEmail = document.getElementById('send-signup').checked;
    const sendSubEmail = document.getElementById('send-sub').checked;
    const sendDigest = document.getElementById('send-digest').checked;

    // Validate required fields
    if (!stripeKey || !sendgridKey) {
        showAlert('Stripe Secret Key and SendGrid API Key are required', 'error');
        return;
    }

    try {
        // Save all settings to localStorage (works reliably, survives page refresh)
        localStorage.setItem('admin_sendgrid_key', sendgridKey);
        localStorage.setItem('admin_sender_email', senderEmail);
        localStorage.setItem('admin_stripe_secret', stripeKey);
        localStorage.setItem('stripePublishableKey', stripePubKey); // Used by checkout page
        localStorage.setItem('admin_webhook_secret', webhookSecret);
        localStorage.setItem('admin_send_signup_email', sendSignupEmail.toString());
        localStorage.setItem('admin_send_sub_email', sendSubEmail.toString());
        localStorage.setItem('admin_send_digest', sendDigest.toString());

        // Save Twitter settings
        if (twitterApiKey) localStorage.setItem('admin_twitter_api_key', twitterApiKey);
        if (twitterApiSecret) localStorage.setItem('admin_twitter_api_secret', twitterApiSecret);
        if (twitterAccessToken) localStorage.setItem('admin_twitter_access_token', twitterAccessToken);
        if (twitterAccessSecret) localStorage.setItem('admin_twitter_access_secret', twitterAccessSecret);
        if (twitterBearerToken) localStorage.setItem('admin_twitter_bearer_token', twitterBearerToken);
        localStorage.setItem('admin_twitter_auto_posting', twitterAutoPosting.toString());
        localStorage.setItem('admin_twitter_posting_schedule', twitterPostingSchedule);
        localStorage.setItem('admin_twitter_posting_time', twitterPostingTime);

        console.log('✅ Settings saved to localStorage');
        showAlert('Settings saved successfully!', 'success');

        // Optional: Try to sync to backend (non-blocking)
        try {
            const settingsData = {
                'sendgrid_api_key': sendgridKey,
                'sender_email': senderEmail,
                'stripe_secret_key': stripeKey,
                'stripe_publishable_key': stripePubKey,
                'stripe_webhook_secret': webhookSecret,
                'send_email_on_signup': sendSignupEmail.toString(),
                'send_email_on_subscription': sendSubEmail.toString(),
                'send_daily_digest': sendDigest.toString()
            };

            // Add Twitter settings if provided
            if (twitterApiKey) {
                settingsData['twitter_api_key'] = twitterApiKey;
                settingsData['twitter_api_secret'] = twitterApiSecret;
                settingsData['twitter_access_token'] = twitterAccessToken;
                settingsData['twitter_access_secret'] = twitterAccessSecret;
                settingsData['twitter_bearer_token'] = twitterBearerToken;
                settingsData['twitter_auto_posting'] = twitterAutoPosting.toString();
                settingsData['twitter_posting_schedule'] = twitterPostingSchedule;
                settingsData['twitter_posting_time'] = twitterPostingTime;
            }

            await fetch(`${API_URL}/api/admin/settings/batch/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAdminToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });
            console.log('✅ Settings also synced to backend database');

            // If Twitter credentials were saved, reload the Twitter service
            if (twitterApiKey && twitterApiSecret) {
                try {
                    await fetch(`${API_URL}/api/twitter/reload-settings`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${getAdminToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('✅ Twitter service reinitialized with new credentials');
                } catch (twitterError) {
                    console.warn('⚠️ Twitter service reload failed (non-blocking):', twitterError.message);
                }
            }
        } catch (backendError) {
            console.warn('⚠️ Backend sync failed (non-blocking):', backendError.message);
            // This is OK - localStorage is our primary storage now
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('Error saving settings to localStorage', 'error');
    }
}

// AUTHENTICATION
// Verify admin token is valid
async function verifyAdminToken() {
    try {
        const token = getAdminToken();
        if (!token) {
            redirectToLogin();
            return;
        }

        const response = await fetch(`${API_URL}/api/admin-auth/verify-token`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.warn('Token verification failed');
            redirectToLogin();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        redirectToLogin();
    }
}

// Handle logout
async function handleLogout() {
    try {
        const token = getAdminToken();
        await fetch(`${API_URL}/api/admin-auth/logout`, {
            method: 'POST',
            headers: getAuthHeaders()
        }).catch(() => {}); // Ignore errors

        // Clear local storage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('rememberMe');

        redirectToLogin();
    } catch (error) {
        console.error('Logout error:', error);
        redirectToLogin();
    }
}

// Wrapper function for logout button
function logout() {
    handleLogout();
}

function redirectToLogin() {
    window.location.href = 'login-secure.html';
}

// UTILITIES
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';

    return date.toLocaleDateString();
}

function displayError(elementId, message) {
    const tbody = document.getElementById(elementId);
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">${message}</td></tr>`;
}

// ANALYTICS
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_URL}/api/admin/analytics/summary`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            console.error('Failed to load analytics');
            return;
        }

        const data = await response.json();
        const { signups, conversions, churn, ltv } = data.data;

        // Update signup card
        document.getElementById('analytics-signups').innerHTML = `
            <h3>Signups (This Month)</h3>
            <div class="number">+${signups.thisMonth}</div>
            <div class="change">${signups.label}</div>
        `;

        // Update conversion card
        document.getElementById('analytics-conversions').innerHTML = `
            <h3>Trial Conversions</h3>
            <div class="number">${conversions.rate}%</div>
            <div class="change">${conversions.label}</div>
        `;

        // Update churn card
        document.getElementById('analytics-churn').innerHTML = `
            <h3>Churn Rate</h3>
            <div class="number">${churn.rate}%</div>
            <div class="change">${churn.label}</div>
        `;

        // Update LTV card
        document.getElementById('analytics-ltv').innerHTML = `
            <h3>Avg LTV</h3>
            <div class="number">$${ltv.ltv}</div>
            <div class="change">${ltv.label}</div>
        `;

    } catch (error) {
        console.error('Error loading analytics:', error);
    }

    loadEmailEngagement();
}

async function loadEmailEngagement() {
    const tbody = document.getElementById('email-engagement-table');
    if (!tbody) return;
    try {
        const response = await fetch(`${API_URL}/api/webhooks/sendgrid/stats`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) {
            tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;">Failed to load engagement stats</td></tr>`;
            return;
        }
        const { stats } = await response.json();
        if (!stats || stats.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="color:#9ca3af;">No email engagement data yet — check back after emails have gone out and SendGrid's webhook is configured.</td></tr>`;
            return;
        }
        tbody.innerHTML = stats.map(row => {
            const delivered = parseInt(row.delivered) || 0;
            const uniqueOpens = parseInt(row.unique_opens) || 0;
            const uniqueClicks = parseInt(row.unique_clicks) || 0;
            const openRate = delivered > 0 ? ((uniqueOpens / delivered) * 100).toFixed(1) : '0.0';
            const clickRate = delivered > 0 ? ((uniqueClicks / delivered) * 100).toFixed(1) : '0.0';
            return `<tr>
                <td>${row.sequence_name}</td>
                <td>${row.day}</td>
                <td>${delivered}</td>
                <td>${uniqueOpens}</td>
                <td>${openRate}%</td>
                <td>${uniqueClicks}</td>
                <td>${clickRate}%</td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Error loading email engagement:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;">Error loading engagement stats</td></tr>`;
    }
}

async function loadPageviews() {
    try {
        const res = await fetch(`${API_URL}/api/analytics/pageviews?page=welcome.html`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const { data } = await res.json();

        const todayEl = document.getElementById('pv-today');
        const weekEl = document.getElementById('pv-week');
        const totalEl = document.getElementById('pv-total');
        const byDayEl = document.getElementById('pv-by-day');

        if (todayEl) todayEl.textContent = data.today;
        if (weekEl) weekEl.textContent = data.last7Days;
        if (totalEl) totalEl.textContent = data.total;

        if (byDayEl) {
            if (data.byDay.length === 0) {
                byDayEl.innerHTML = '<tr><td colspan="2" style="text-align:center;padding:20px;">Noch keine Daten</td></tr>';
            } else {
                byDayEl.innerHTML = data.byDay.map(r =>
                    `<tr><td>${new Date(r.day).toLocaleDateString('en-US')}</td><td>${r.count}</td></tr>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading pageviews:', error);
    }
}

// TWITTER MANAGEMENT
let twitterRecentPostings = [];

async function loadTwitterStatus() {
    try {
        const response = await fetch(`${API_URL}/api/twitter/status`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            document.getElementById('twitter-status').innerHTML = `
                <p style="color: #ffcccc;">❌ Twitter service not configured</p>
                <p style="font-size: 12px; opacity: 0.8;">Add Twitter API credentials to server .env file</p>
            `;
            return;
        }

        const data = await response.json();

        if (data.configured) {
            document.getElementById('twitter-status').innerHTML = `
                <p style="color: #ccffcc;">✅ Twitter API Connected</p>
                <p style="font-size: 14px; margin-top: 10px;">
                    <strong>Scheduled Jobs:</strong> ${data.scheduledJobs}<br>
                    <strong>Total Posts:</strong> ${data.totalPosts || 0}<br>
                    ${data.jobs.length > 0 ? '<strong>Active Schedules:</strong><br>' + data.jobs.map(j => `• ${j.type} ${j.time ? 'at ' + j.time : ''}`).join('<br>') : 'No active schedule'}
                </p>
            `;
        } else {
            document.getElementById('twitter-status').innerHTML = `
                <p style="color: #ffcccc;">⚠️ Twitter Not Configured</p>
                <p style="font-size: 12px; opacity: 0.8;">Add Twitter API keys to server environment</p>
            `;
        }
    } catch (error) {
        console.error('Error loading Twitter status:', error);
        document.getElementById('twitter-status').innerHTML = `
            <p style="color: #ffcccc;">❌ Error loading status</p>
        `;
    }
}

async function loadTwitterTips() {
    try {
        const response = await fetch(`${API_URL}/api/twitter/tips`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load tips');

        const data = await response.json();
        const tips = data.tips || [];

        // Group by category
        const byCategory = {};
        tips.forEach(tip => {
            if (!byCategory[tip.category]) {
                byCategory[tip.category] = [];
            }
            byCategory[tip.category].push(tip);
        });

        let html = '';
        Object.keys(byCategory).forEach(category => {
            html += `
                <div style="margin-bottom: 15px;">
                    <strong style="color: #667eea;">${category.toUpperCase()}</strong>
                    <div style="margin-top: 8px; font-size: 13px;">
            `;
            byCategory[category].forEach(tip => {
                html += `<p style="margin: 5px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">${tip.tip.substring(0, 80)}...</p>`;
            });
            html += `</div></div>`;
        });

        document.getElementById('tips-preview').innerHTML = html;
    } catch (error) {
        console.error('Error loading tips:', error);
        document.getElementById('tips-preview').innerHTML = '<p style="color: #ff6b6b;">Error loading tips</p>';
    }
}

async function postRandomTip() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Posting...';

    try {
        const response = await fetch(`${API_URL}/api/twitter/post-random`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Tweet posted successfully!', 'success');
            addRecentPosting('Random Tip', data.text);
            loadTwitterStatus();
        } else {
            showAlert('❌ Failed to post: ' + data.message, 'error');
        }
    } catch (error) {
        showAlert('❌ Error posting tweet: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📱 Post Random Tip';
    }
}

async function postByCategory() {
    const category = document.getElementById('category-select').value;

    if (!category) {
        showAlert('Please select a category', 'error');
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Posting...';

    try {
        const response = await fetch(`${API_URL}/api/twitter/post-category`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ category })
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`✅ ${category} tip posted!`, 'success');
            addRecentPosting(`Category: ${category}`, data.text);
            document.getElementById('category-select').value = '';
            loadTwitterStatus();
        } else {
            showAlert('❌ Failed to post: ' + data.message, 'error');
        }
    } catch (error) {
        showAlert('❌ Error posting tweet: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Post from Category';
    }
}

// Character counter for custom tweet
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('custom-tweet');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            document.getElementById('char-count').textContent = e.target.value.length;
            if (e.target.value.length > 280) {
                e.target.style.borderColor = '#ff6b6b';
            } else {
                e.target.style.borderColor = '#ddd';
            }
        });
    }
});

async function postCustomTweet() {
    const text = document.getElementById('custom-tweet').value;

    if (!text.trim()) {
        showAlert('Please enter tweet text', 'error');
        return;
    }

    if (text.length > 280) {
        showAlert('Tweet exceeds 280 character limit', 'error');
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Posting...';

    try {
        const response = await fetch(`${API_URL}/api/twitter/post-custom`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Custom tweet posted!', 'success');
            addRecentPosting('Custom Tweet', text);
            document.getElementById('custom-tweet').value = '';
            document.getElementById('char-count').textContent = '0';
            loadTwitterStatus();
        } else {
            showAlert('❌ Failed to post: ' + data.message, 'error');
        }
    } catch (error) {
        showAlert('❌ Error posting tweet: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Post Custom Tweet';
    }
}

async function startScheduler() {
    const schedule = document.getElementById('schedule-type').value;
    const time = document.getElementById('post-time').value;

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Starting...';

    try {
        const body = { schedule };
        if (schedule === 'daily') {
            body.times = [time];
        }

        const response = await fetch(`${API_URL}/api/twitter/scheduler/start`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`✅ Scheduler started: ${data.message}`, 'success');
            loadTwitterStatus();
        } else {
            showAlert('❌ Failed to start scheduler: ' + data.message, 'error');
        }
    } catch (error) {
        showAlert('❌ Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '▶️ Start Scheduler';
    }
}

async function stopScheduler() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Stopping...';

    try {
        const response = await fetch(`${API_URL}/api/twitter/scheduler/stop`, {
            method: 'POST',
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            showAlert('✅ Scheduler stopped', 'success');
            loadTwitterStatus();
        } else {
            showAlert('❌ Failed to stop scheduler', 'error');
        }
    } catch (error) {
        showAlert('❌ Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '⏹️ Stop Scheduler';
    }
}

function addRecentPosting(type, text) {
    const posting = {
        type,
        text: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
        time: new Date().toLocaleTimeString()
    };

    twitterRecentPostings.unshift(posting);
    if (twitterRecentPostings.length > 5) {
        twitterRecentPostings.pop();
    }

    let html = '';
    twitterRecentPostings.forEach((p, i) => {
        html += `
            <div style="padding: 10px; border-left: 3px solid #667eea; margin-bottom: 8px; background: #f9fafb; border-radius: 4px;">
                <strong style="color: #667eea;">${p.type}</strong> at ${p.time}<br>
                <span style="font-size: 12px; color: #666;">"${p.text}"</span>
            </div>
        `;
    });

    document.getElementById('recent-postings').innerHTML = html;
}

// Initialize Twitter panel when tab is clicked
document.addEventListener('click', (e) => {
    if (e.target.getAttribute('data-tab') === 'twitter') {
        loadTwitterStatus();
        loadTwitterTips();
    }
    if (e.target.getAttribute('data-tab') === 'social-media') {
        loadSocialMediaDashboard();
    }
    if (e.target.getAttribute('data-tab') === 'medium') {
        initMediumTab();
    }
});

// EMAIL TEMPLATES MANAGEMENT
async function loadEmailTemplates() {
    try {
        // Load sequences
        const sequencesResponse = await fetch(`${API_URL}/api/admin/email-templates/sequences`, {
            headers: getAuthHeaders()
        });

        if (sequencesResponse.ok) {
            const sequencesData = await sequencesResponse.json();
            renderSequences(sequencesData.data || []);
        } else {
            console.error('Failed to load sequences');
        }

        // Load templates
        const templatesResponse = await fetch(`${API_URL}/api/admin/email-templates/templates`, {
            headers: getAuthHeaders()
        });

        if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            // For now, just show loading - we'll render after getting sequence info
        }
    } catch (error) {
        console.error('Error loading email templates:', error);
    }
}

function renderSequences(sequences) {
    const tbody = document.getElementById('sequences-table');
    const dropdown = document.getElementById('modal-template-sequence');

    if (!sequences || sequences.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No sequences yet</td></tr>';
        if (dropdown) {
            dropdown.innerHTML = '<option value="">Select a sequence</option>';
        }
        return;
    }

    // Populate the dropdown
    if (dropdown) {
        dropdown.innerHTML = '<option value="">Select a sequence</option>' +
            sequences.map(seq => `<option value="${seq.id}">${seq.name}</option>`).join('');
    }

    // Populate the table
    tbody.innerHTML = sequences.map(seq => `
        <tr>
            <td><strong>${seq.name}</strong></td>
            <td>${seq.description || '-'}</td>
            <td>${seq.template_count || 0} templates</td>
            <td><span class="badge ${seq.is_active ? 'badge-success' : 'badge-danger'}">${seq.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewSequence('${seq.id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSequence('${seq.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function viewSequence(sequenceId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/email-templates/sequences/${sequenceId}`, {
            headers: getAuthHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            renderTemplatesForSequence(data.templates);
        }
    } catch (error) {
        console.error('Error loading sequence details:', error);
    }
}

function renderTemplatesForSequence(templates) {
    const tbody = document.getElementById('templates-table');

    if (!templates || templates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No templates in this sequence</td></tr>';
        return;
    }

    tbody.innerHTML = templates.map(template => `
        <tr>
            <td>Day ${template.day}</td>
            <td>${template.subject}</td>
            <td>${template.sequence_id}</td>
            <td><span class="badge ${template.is_active ? 'badge-success' : 'badge-danger'}">${template.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editTemplate('${template.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTemplate('${template.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openEmailSequenceModal() {
    document.getElementById('email-sequence-modal').classList.add('active');
}

function closeEmailSequenceModal() {
    document.getElementById('email-sequence-modal').classList.remove('active');
    document.getElementById('modal-sequence-name').value = '';
    document.getElementById('modal-sequence-description').value = '';
}

function openTemplateModal() {
    document.getElementById('template-modal').classList.add('active');
}

function closeTemplateModal() {
    const modal = document.getElementById('template-modal');
    if (modal) modal.classList.remove('active');

    // Safely reset form fields if they exist
    const templateIdEl = document.getElementById('modal-template-id');
    const dayEl = document.getElementById('modal-template-day');
    const subjectEl = document.getElementById('modal-template-subject');
    const contentEl = document.getElementById('modal-template-content');
    const titleEl = document.getElementById('template-modal-title');
    const saveBtnEl = document.getElementById('template-save-btn');

    if (templateIdEl) templateIdEl.value = '';
    if (dayEl) dayEl.value = '';
    if (subjectEl) subjectEl.value = '';
    if (contentEl) contentEl.value = '';
    if (titleEl) titleEl.textContent = 'Create Email Template';
    if (saveBtnEl) saveBtnEl.textContent = 'Create Template';
}

async function saveEmailSequence() {
    const name = document.getElementById('modal-sequence-name').value;
    const description = document.getElementById('modal-sequence-description').value;

    if (!name) {
        showAlert('Sequence name is required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/email-templates/sequences`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, description })
        });

        if (response.ok) {
            showAlert('Sequence created successfully', 'success');
            closeEmailSequenceModal();
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to create sequence', 'error');
            console.error('API error:', error);
        }
    } catch (error) {
        console.error('Error creating sequence:', error);
        showAlert('Error creating sequence: ' + error.message, 'error');
    }
}

async function saveEmailTemplate() {
    console.log('saveEmailTemplate called');

    // Get elements with null checks
    const templateIdEl = document.getElementById('modal-template-id');
    const sequenceIdEl = document.getElementById('modal-template-sequence');
    const dayEl = document.getElementById('modal-template-day');
    const subjectEl = document.getElementById('modal-template-subject');
    const contentEl = document.getElementById('modal-template-content');

    if (!templateIdEl || !sequenceIdEl || !dayEl || !subjectEl || !contentEl) {
        console.error('Missing form elements:', {
            templateIdEl: templateIdEl ? 'EXISTS' : 'MISSING',
            sequenceIdEl: sequenceIdEl ? 'EXISTS' : 'MISSING',
            dayEl: dayEl ? 'EXISTS' : 'MISSING',
            subjectEl: subjectEl ? 'EXISTS' : 'MISSING',
            contentEl: contentEl ? 'EXISTS' : 'MISSING'
        });
        const missing = [];
        if (!templateIdEl) missing.push('modal-template-id');
        if (!sequenceIdEl) missing.push('modal-template-sequence');
        if (!dayEl) missing.push('modal-template-day');
        if (!subjectEl) missing.push('modal-template-subject');
        if (!contentEl) missing.push('modal-template-content');
        showAlert('Missing form elements: ' + missing.join(', '), 'error');
        return;
    }

    const templateId = templateIdEl.value;
    const sequenceId = sequenceIdEl.value;
    const day = dayEl.value;
    const subject = subjectEl.value;
    const content = contentEl.value;

    console.log('Form values:', { templateId, sequenceId, day, subject, content });
    console.log('Dropdown options:', sequenceIdEl.options);
    console.log('Selected option text:', sequenceIdEl.options[sequenceIdEl.selectedIndex]?.text);

    if (!sequenceId || !subject) {
        console.log('Validation failed: missing sequenceId or subject', { sequenceId, subject });
        showAlert('Sequence and subject are required', 'error');
        return;
    }

    const isEdit = !!templateId;
    const method = isEdit ? 'PUT' : 'POST';
    const endpoint = isEdit ? `${API_URL}/api/admin/email-templates/templates/${templateId}` : `${API_URL}/api/admin/email-templates/templates`;

    console.log('Saving template:', { isEdit, method, endpoint });

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                sequence_id: sequenceId,
                day: parseInt(day) || 0,
                subject,
                html_content: content,
                content: content
            })
        });

        console.log('Save response:', response.status, response.ok);

        if (response.ok) {
            const action = isEdit ? 'updated' : 'created';
            showAlert(`Template ${action} successfully`, 'success');
            closeTemplateModal();
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || `Failed to ${isEdit ? 'update' : 'create'} template`, 'error');
            console.error('API error:', error);
        }
    } catch (error) {
        console.error(`Error ${isEdit ? 'updating' : 'creating'} template:`, error);
        showAlert(`Error ${isEdit ? 'updating' : 'creating'} template: ` + error.message, 'error');
    }
}

async function createSequence(name) {
    try {
        const response = await fetch(`${API_URL}/api/admin/email-templates/sequences`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, description: '' })
        });

        if (response.ok) {
            showAlert('Sequence created successfully', 'success');
            loadEmailTemplates();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to create sequence', 'error');
        }
    } catch (error) {
        console.error('Error creating sequence:', error);
        showAlert('Error creating sequence', 'error');
    }
}

async function deleteSequence(sequenceId) {
    if (confirm('Are you sure you want to delete this sequence?')) {
        try {
            const response = await fetch(`${API_URL}/api/admin/email-templates/sequences/${sequenceId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showAlert('Sequence deleted', 'success');
                loadEmailTemplates();
            }
        } catch (error) {
            console.error('Error deleting sequence:', error);
            showAlert('Error deleting sequence', 'error');
        }
    }
}

async function deleteTemplate(templateId) {
    if (confirm('Are you sure you want to delete this template?')) {
        try {
            const response = await fetch(`${API_URL}/api/admin/email-templates/templates/${templateId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                showAlert('Template deleted', 'success');
                loadEmailTemplates();
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            showAlert('Error deleting template', 'error');
        }
    }
}

async function editTemplate(templateId) {
    try {
        // Fetch the template data
        const response = await fetch(`${API_URL}/api/admin/email-templates/templates/${templateId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            showAlert('Failed to load template', 'error');
            return;
        }

        const data = await response.json();
        const template = data.data;

        // Populate form fields with error checking
        const dayField = document.getElementById('modal-template-day');
        const subjectField = document.getElementById('modal-template-subject');
        const contentField = document.getElementById('modal-template-content');
        const sequenceField = document.getElementById('modal-template-sequence');

        if (!dayField || !subjectField || !contentField || !sequenceField) {
            showAlert('Template modal not found - please reload the page', 'error');
            return;
        }

        dayField.value = template.day || 0;
        subjectField.value = template.subject || '';
        contentField.value = template.html_content || template.content || '';
        sequenceField.value = template.sequence_id || '';

        // Change modal title and button to Edit - with checks
        const titleEl = document.getElementById('template-modal-title');
        const saveBtn = document.getElementById('template-save-btn');
        const idField = document.getElementById('modal-template-id');
        const modal = document.getElementById('template-modal');

        if (titleEl) titleEl.textContent = 'Edit Email Template';
        if (saveBtn) saveBtn.textContent = 'Update Template';
        if (idField) idField.value = templateId;
        if (modal) modal.classList.add('active');
    } catch (error) {
        console.error('Error loading template:', error);
        showAlert('Error loading template: ' + error.message, 'error');
    }
}

// ============================================
// HACK MANAGEMENT FUNCTIONS
// ============================================

let currentEditingHackId = null;

// Load and display all hacks
async function loadHacksList() {
    try {
        const response = await fetch(`${API_URL}/api/admin/hacks`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Failed to load hacks');

        const data = await response.json();
        const tbody = document.getElementById('hacks-tbody');
        tbody.innerHTML = '';

        const moduleNames = {
            1: 'Flight Hacks', 2: 'Credit Cards', 3: 'Hotel Hacks', 4: 'Timing Intelligence',
            5: 'Airport & Transit', 6: 'Destinations', 7: 'Car Rentals', 8: 'Community',
            9: 'Travel Money', 10: 'Travel Insurance', 11: 'Visa & Immigration',
            12: 'Accommodations', 13: 'Ground Transport', 14: 'Travel Bookings',
            15: 'Food & Dining', 16: 'Shopping & VAT'
        };

        // Store hacks data globally for use in edit/delete operations
        hacksData = data.hacks || [];

        if (data.hacks && data.hacks.length > 0) {
            data.hacks.forEach(hack => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${moduleNames[hack.module_id] || `Module ${hack.module_id}`}</td>
                    <td>${hack.title}</td>
                    <td>${hack.category}</td>
                    <td><span class="badge badge-${hack.difficulty}">${hack.difficulty}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editHack('${hack.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteHack('${hack.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hacks found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading hacks:', error);
        showAlert('Failed to load hacks', 'error');
    }
}

// Open add hack modal
function openAddHackModal() {
    currentEditingHackId = null;
    document.getElementById('hack-modal-title').textContent = 'Add New Hack';
    document.getElementById('modal-hack-module-id').value = '';
    document.getElementById('modal-hack-title-new').value = '';
    document.getElementById('modal-hack-description').value = '';
    document.getElementById('modal-hack-category').value = '';
    document.getElementById('modal-hack-difficulty').value = 'medium';

    // Populate module dropdown
    const select = document.getElementById('modal-hack-module-id');
    select.innerHTML = '<option value="">Select a module (1-16)</option>';
    for (let i = 1; i <= 16; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `Module ${i}`;
        select.appendChild(option);
    }

    document.getElementById('hack-management-modal').classList.add('active');
}

// Edit hack
async function editHack(hackId) {
    try {
        // Find hack from stored global data
        const hack = hacksData.find(h => h.id === hackId);

        if (!hack) {
            showAlert('Hack not found', 'error');
            return;
        }

        currentEditingHackId = hackId;
        document.getElementById('hack-modal-title').textContent = 'Edit Hack';

        // Populate module dropdown FIRST
        const select = document.getElementById('modal-hack-module-id');
        select.innerHTML = '<option value="">Select a module (1-16)</option>';
        for (let i = 1; i <= 16; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = `Module ${i}`;
            select.appendChild(option);
        }

        // THEN set form values
        document.getElementById('modal-hack-module-id').value = hack.module_id;
        document.getElementById('modal-hack-title-new').value = hack.title;
        document.getElementById('modal-hack-description').value = hack.description;
        document.getElementById('modal-hack-category').value = hack.category || '';
        document.getElementById('modal-hack-difficulty').value = hack.difficulty || 'medium';

        document.getElementById('hack-management-modal').classList.add('active');
    } catch (error) {
        console.error('Error loading hack for edit:', error);
        showAlert('Failed to load hack', 'error');
    }
}

// Save hack (create or update)
async function saveHackManagement() {
    const moduleId = document.getElementById('modal-hack-module-id').value;
    const title = document.getElementById('modal-hack-title-new').value;
    const description = document.getElementById('modal-hack-description').value;
    const category = document.getElementById('modal-hack-category').value;
    const difficulty = document.getElementById('modal-hack-difficulty').value;

    if (!moduleId || !title || !description) {
        showAlert('Module, title, and description are required', 'error');
        return;
    }

    try {
        const url = currentEditingHackId
            ? `${API_URL}/api/admin/hacks/${currentEditingHackId}`
            : `${API_URL}/api/admin/hacks`;

        const method = currentEditingHackId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify({
                module_id: parseInt(moduleId),
                title,
                description,
                category,
                difficulty
            })
        });

        if (response.ok) {
            showAlert(currentEditingHackId ? 'Hack updated' : 'Hack created', 'success');
            closeHackManagementModal();
            loadHacksList();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to save hack', 'error');
        }
    } catch (error) {
        console.error('Error saving hack:', error);
        showAlert('Error saving hack', 'error');
    }
}

// Delete hack
async function deleteHack(hackId) {
    if (!confirm('Are you sure you want to delete this hack?')) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/hacks/${hackId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            showAlert('Hack deleted', 'success');
            loadHacksList();
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to delete hack', 'error');
        }
    } catch (error) {
        console.error('Error deleting hack:', error);
        showAlert('Error deleting hack', 'error');
    }
}

// Close hack management modal
function closeHackManagementModal() {
    document.getElementById('hack-management-modal').classList.remove('active');
    currentEditingHackId = null;
}

// SOCIAL MEDIA PLATFORM TAB SWITCHING (Settings)
function switchPlatformTab(platform) {
    // Hide all platform settings
    document.querySelectorAll('.platform-settings').forEach(el => {
        el.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('.platform-tab').forEach(el => {
        el.style.borderBottom = '3px solid transparent';
        el.style.color = '#6b7280';
    });

    // Show selected platform settings
    const settingsElement = document.getElementById(`settings-${platform}`);
    if (settingsElement) {
        settingsElement.style.display = 'block';
    }

    // Highlight active tab
    const activeTab = document.querySelector(`[data-platform="${platform}"]`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #667eea';
        activeTab.style.color = '#667eea';
    }

    if (platform === 'medium') initMediumTab();
}

// ─── MEDIUM GENERATOR ────────────────────────────────────────────────────────

let mediumCurrentArticle = null;

async function initMediumTab() {
    // Load topic list into select
    try {
        const res = await fetch(`${API_URL}/api/medium/topics`, { headers: getAuthHeaders() });
        const data = await res.json();
        const sel = document.getElementById('medium-topic-select');
        if (sel && data.topics) {
            data.topics.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.index;
                opt.textContent = (t.isNext ? '▶ ' : '') + t.title;
                sel.appendChild(opt);
            });
        }
    } catch {}
    loadMediumRecentPosts();
}

async function generateMediumArticle() {
    const btn = document.getElementById('medium-generate-btn');
    const result = document.getElementById('medium-generator-result');
    const topicIdx = document.getElementById('medium-topic-select')?.value;

    btn.disabled = true;
    btn.textContent = '⏳ Generiere Artikel...';
    result.style.display = 'none';

    try {
        const body = topicIdx !== '' ? { topicIndex: parseInt(topicIdx) } : {};
        const res = await fetch(`${API_URL}/api/medium/generate`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Generation failed');

        mediumCurrentArticle = data; // includes dbId for later update

        document.getElementById('medium-title-text').textContent = data.title;
        document.getElementById('medium-tags-text').textContent = data.tags?.join(', ') || '';
        document.getElementById('medium-body-text').value = data.body;

        const imgSection = document.getElementById('medium-image-section');
        if (data.imageUrl) {
            document.getElementById('medium-cover-img').src = data.imageUrl;
            document.getElementById('medium-image-download').href = data.imageUrl;
            imgSection.style.display = 'block';
        } else {
            imgSection.style.display = 'none';
        }

        result.style.display = 'block';
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
        alert('Fehler: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '✨ Artikel generieren';
    }
}

async function markMediumAsPosted() {
    if (!mediumCurrentArticle) return alert('Kein Artikel generiert.');
    const mediumUrl = document.getElementById('medium-posted-url')?.value || '';
    try {
        const res = await fetch(`${API_URL}/api/medium/log-manual`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dbId: mediumCurrentArticle.dbId,
                title: mediumCurrentArticle.title,
                body: mediumCurrentArticle.body,
                tags: mediumCurrentArticle.tags,
                category: mediumCurrentArticle.category,
                mediumUrl,
                includeCTA: mediumCurrentArticle.includeCTA
            })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Artikel als gepostet markiert!');
            document.getElementById('medium-posted-url').value = '';
            document.getElementById('medium-generator-result').style.display = 'none';
            mediumCurrentArticle = null;
            loadMediumRecentPosts();
        }
    } catch (err) {
        alert('Fehler: ' + err.message);
    }
}

async function loadMediumRecentPosts() {
    const el = document.getElementById('medium-recent-posts');
    if (!el) return;
    try {
        const res = await fetch(`${API_URL}/api/medium/recent-posts`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.posts?.length) { el.innerHTML = '<p>Noch keine Artikel gepostet.</p>'; return; }
        el.innerHTML = data.posts.map(p => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;">
                <div>
                    <strong style="font-size:13px;">${p.title}</strong>
                    <span style="color:#9ca3af;font-size:12px;margin-left:8px;">${p.category}</span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${p.medium_url ? `<a href="${p.medium_url}" target="_blank" style="font-size:12px;color:#1d9bf0;">Ansehen ↗</a>` : ''}
                    <span style="font-size:12px;color:#6b7280;">${new Date(p.posted_at).toLocaleDateString('en-US')}</span>
                </div>
            </div>`).join('');
    } catch { el.innerHTML = '<p style="color:#ef4444">Fehler beim Laden</p>'; }
}

function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    const text = el.tagName === 'TEXTAREA' ? el.value : el.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = el.previousElementSibling?.querySelector('button') || el.parentElement?.querySelector('button');
        if (btn) { const orig = btn.textContent; btn.textContent = '✅ Kopiert!'; setTimeout(() => btn.textContent = orig, 1500); }
    });
}

// SOCIAL MEDIA SUB-TAB SWITCHING (Accounts | Posts | Analytics)
function switchSocialTab(tabName) {
    // Hide all social media sub-content
    document.querySelectorAll('.social-sub-content').forEach(el => {
        el.style.display = 'none';
    });

    // Remove active class from all sub-tabs
    document.querySelectorAll('.social-sub-tab').forEach(el => {
        el.style.borderBottom = '3px solid transparent';
        el.style.color = '#6b7280';
    });

    // Show selected content
    const contentElement = document.getElementById(`content-${tabName}`);
    if (contentElement) {
        contentElement.style.display = 'block';
    }

    // Highlight active tab
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.style.borderBottom = '3px solid #667eea';
        activeTab.style.color = '#667eea';
    }

    // Load data for the selected tab
    if (tabName === 'accounts') {
        loadConnectedAccounts();
    } else if (tabName === 'posts') {
        loadRecentPosts();
    } else if (tabName === 'analytics') {
        loadAnalytics();
    }
}

// Load analytics data
async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/api/admin/analytics/summary`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!data.success) return;

        const el = id => document.getElementById(id);
        if (el('analytics-total-posts')) el('analytics-total-posts').textContent = data.social?.totalPosts ?? 0;
        if (el('analytics-total-engagement')) el('analytics-total-engagement').textContent = '—';
        if (el('analytics-avg-rate')) el('analytics-avg-rate').textContent = '—';
        if (el('analytics-impressions')) el('analytics-impressions').textContent = '—';

        // Per-platform breakdown
        const tbody = document.getElementById('analytics-platforms');
        if (tbody && data.social?.platforms) {
            const icons = { twitter:'🐦', reddit:'🤖', linkedin:'💼', pinterest:'📌', instagram:'📸', wordpress:'📝', blogger:'📰', quora:'❓' };
            tbody.innerHTML = Object.entries(data.social.platforms).map(([key, p]) => `
                <tr>
                    <td>${icons[key] || ''} ${key.charAt(0).toUpperCase() + key.slice(1)}</td>
                    <td>${p.total}</td>
                    <td>${p.thisMonth}</td>
                    <td>${p.withCTA}</td>
                </tr>`).join('');
        }
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}
