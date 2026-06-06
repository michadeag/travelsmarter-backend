// Admin Dashboard JavaScript
// Connects to backend API for data management

// Determine correct API URL based on current domain
let API_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Local development
    API_URL = 'http://localhost:5000';
} else {
    // Production - use your live backend API
    API_URL = 'https://api.travelsmarterapp.com';
}

console.log('Admin Dashboard using API:', API_URL);

// Helper function to get current auth token
function getAuthToken() {
    return localStorage.getItem('userToken') || localStorage.getItem('adminToken');
}

// Deprecated: Use getAuthToken() instead
const API_TOKEN = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupEventListeners();
});

function initDashboard() {
    // Check if logged in
    if (!getAuthToken()) {
        redirectToLogin();
        return;
    }

    // Load dashboard data
    loadDashboardStats();
    loadUsers();
    loadSubscriptions();
    loadDeals();
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
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            }),
            fetch(`${API_URL}/api/subscriptions/stats`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            }),
            fetch(`${API_URL}/api/deals/count`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

            document.getElementById('total-mrr').textContent = `€${totalMRR.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading subscription stats:', error);
    }
}

// USERS MANAGEMENT
async function loadUsers() {
    try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch(`${API_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users || []);
        } else {
            console.error('Failed to load users:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        displayError('users-table', 'Failed to load users');
    }
}

function displayUsers(users) {
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
        let url = `${API_URL}/api/users/create`;
        let method = 'POST';

        if (isEditing) {
            url = `${API_URL}/api/auth/users/${userId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
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
        // Fetch user data
        const response = await fetch(`${API_URL}/api/auth/users`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (!response.ok) {
            showAlert('Failed to load user data', 'error');
            return;
        }

        const data = await response.json();
        const user = data.users.find(u => u.id === userId);

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
        const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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
        const response = await fetch(`${API_URL}/api/subscriptions/list`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            displaySubscriptions(data.subscriptions || []);
        }
    } catch (error) {
        console.error('Error loading subscriptions:', error);
        displayError('subscriptions-table', 'Failed to load subscriptions');
    }
}

function displaySubscriptions(subscriptions) {
    const tbody = document.getElementById('subscriptions-table');

    if (subscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No subscriptions found</td></tr>';
        return;
    }

    tbody.innerHTML = subscriptions.map(sub => `
        <tr>
            <td>${sub.user_email}</td>
            <td>${sub.tier}</td>
            <td><span class="badge badge-${sub.status === 'active' ? 'success' : 'danger'}">${sub.status}</span></td>
            <td>${formatDate(sub.created_at)}</td>
            <td>${formatDate(sub.current_period_end)}</td>
            <td>€${sub.price_monthly}</td>
        </tr>
    `).join('');
}

// DEALS
async function loadDeals() {
    try {
        const response = await fetch(`${API_URL}/api/deals?limit=50`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayDeals(data.deals || []);
        }
    } catch (error) {
        console.error('Error loading deals:', error);
        displayError('deals-table', 'Failed to load deals');
    }
}

function displayDeals(deals) {
    const tbody = document.getElementById('deals-table');

    if (deals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No deals found</td></tr>';
        return;
    }

    tbody.innerHTML = deals.map(deal => `
        <tr>
            <td>${deal.title}</td>
            <td>${deal.category}</td>
            <td>€${deal.value_amount}</td>
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
    document.getElementById('deal-modal').classList.remove('active');
    document.getElementById('modal-deal-title').value = '';
    document.getElementById('modal-deal-description').value = '';
    document.getElementById('modal-deal-value').value = '';
}

async function saveDeal() {
    const title = document.getElementById('modal-deal-title').value;
    const description = document.getElementById('modal-deal-description').value;
    const category = document.getElementById('modal-deal-category').value;
    const value = document.getElementById('modal-deal-value').value;

    if (!title || !value) {
        showAlert('Title and value are required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/deals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                category,
                dealType: 'featured',
                valueAmount: parseFloat(value),
                valueCurrency: 'EUR',
                source: 'admin'
            })
        });

        if (response.ok) {
            showAlert('Deal created successfully', 'success');
            closeDealModal();
            loadDeals();
        } else {
            showAlert('Failed to create deal', 'error');
        }
    } catch (error) {
        console.error('Error creating deal:', error);
        showAlert('Error creating deal', 'error');
    }
}

async function editDeal(dealId) {
    showAlert('Edit functionality coming soon', 'warning');
}

async function deleteDeal(dealId) {
    if (!confirm('Are you sure you want to delete this deal?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/deals/${dealId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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
    document.getElementById('promo-modal').classList.remove('active');
    document.getElementById('modal-promo-code').value = '';
    document.getElementById('modal-promo-percent').value = '';
    document.getElementById('modal-promo-max').value = '';
}

async function savePromo() {
    const code = document.getElementById('modal-promo-code').value.toUpperCase();
    const percent = document.getElementById('modal-promo-percent').value;
    const maxUses = document.getElementById('modal-promo-max').value;
    const validUntil = document.getElementById('modal-promo-until').value;

    if (!code || !percent || !maxUses) {
        showAlert('All fields are required', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/promos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                discountPercent: parseFloat(percent),
                maxUses: parseInt(maxUses),
                validUntil: new Date(validUntil)
            })
        });

        if (response.ok) {
            showAlert('Promo code created successfully', 'success');
            closePromoModal();
            location.reload(); // Reload to show new code
        } else {
            showAlert('Failed to create promo code', 'error');
        }
    } catch (error) {
        console.error('Error creating promo:', error);
        showAlert('Error creating promo code', 'error');
    }
}

// RECENT ACTIVITIES
async function loadRecentActivities() {
    try {
        const response = await fetch(`${API_URL}/api/admin/activities?limit=10`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
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

        console.log('✅ Settings saved to localStorage');
        showAlert('Settings saved successfully! Stripe key is ready for checkout.', 'success');

        // Optional: Try to sync to backend (non-blocking)
        try {
            await fetch(`${API_URL}/api/admin/settings/batch/update`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'sendgrid_api_key': sendgridKey,
                    'sender_email': senderEmail,
                    'stripe_secret_key': stripeKey,
                    'stripe_publishable_key': stripePubKey,
                    'stripe_webhook_secret': webhookSecret,
                    'send_email_on_signup': sendSignupEmail.toString(),
                    'send_email_on_subscription': sendSubEmail.toString(),
                    'send_daily_digest': sendDigest.toString()
                })
            });
            console.log('✅ Settings also synced to backend database');
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
function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    localStorage.removeItem('apiUrl');
    redirectToLogin();
}

function redirectToLogin() {
    window.location.href = 'login.html';
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
