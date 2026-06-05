# Frontend Integration - Quick Start

Get your app connected to the backend in 10 minutes.

## 1. Add API Service to Your App (1 minute)

Copy `api-service.js` to your project root.

Add to `index.html` `<head>`:
```html
<script src="api-service.js"></script>
```

## 2. Protect Pages (1 minute)

Add authentication check to `index.html` `<head>`:
```html
<script>
    // Redirect to login if not authenticated
    if (!api.isLoggedIn()) {
        window.location.href = '/auth.html';
    }
</script>
```

## 3. Load Real Deals (2 minutes)

Replace static deals code with API call:

```javascript
// BEFORE (static):
const deals = [
    { id: 1, title: 'Mistake Fare...', ... }
];

// AFTER (dynamic from API):
async function loadDeals() {
    try {
        const response = await api.getDeals();
        const deals = response.deals || [];
        displayDeals(deals);
    } catch (error) {
        console.error('Failed to load deals:', error);
        showErrorMessage('Could not load deals. Please try again.');
    }
}

// Call on page load
loadDeals();
```

## 4. Make Deals Interactive (2 minutes)

Update your upvote/save buttons:

```javascript
// BEFORE:
button.onclick = () => {
    count++;
    button.textContent = `👍 ${count}`;
};

// AFTER:
button.onclick = async () => {
    try {
        const response = await api.upvoteDeal(dealId);
        if (response.success) {
            button.classList.add('upvoted');
            // Optionally reload to show new count
            loadDeals();
        }
    } catch (error) {
        alert('Failed to upvote: ' + error.message);
    }
};
```

Save deal:
```javascript
const saveBtn = document.getElementById(`save-${dealId}`);
saveBtn.onclick = async () => {
    try {
        const response = await api.saveDeal(dealId);
        if (response.success) {
            saveBtn.textContent = '✅ Saved';
            alert('Deal saved to your collection!');
        }
    } catch (error) {
        alert('Failed to save deal: ' + error.message);
    }
};
```

## 5. Load User Profile (2 minutes)

Add to page after user logs in:

```javascript
async function loadUserProfile() {
    try {
        const response = await api.getCurrentUser();
        const user = response.user;
        
        // Update UI with user data
        document.getElementById('user-name').textContent = user.first_name;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-tier').textContent = user.subscription_tier;
        
        // Show tier-specific features
        if (api.hasTier('elite')) {
            document.getElementById('sms-alerts').style.display = 'block';
            document.getElementById('expert-consultation').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

// Call on page load
loadUserProfile();
```

## 6. Add Checkout (2 minutes)

Link pricing button to checkout:

```javascript
// In your pricing section, update button onclick:
document.getElementById('smart-traveler-btn').onclick = async () => {
    try {
        const response = await api.createCheckoutSession('smart_traveler');
        if (response.success) {
            window.location.href = response.url; // Redirect to Stripe
        }
    } catch (error) {
        alert('Checkout failed: ' + error.message);
    }
};

document.getElementById('elite-btn').onclick = async () => {
    try {
        const response = await api.createCheckoutSession('elite');
        if (response.success) {
            window.location.href = response.url; // Redirect to Stripe
        }
    } catch (error) {
        alert('Checkout failed: ' + error.message);
    }
};
```

## 7. Add Logout (1 minute)

Add logout button to your header:

```html
<button onclick="logout()" style="position: absolute; top: 20px; right: 20px;">
    Logout
</button>

<script>
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        api.logout();
        window.location.href = '/auth.html';
    }
}
</script>
```

## 8. Add Error Handling (1 minute)

Add error display div to your HTML:

```html
<!-- Add at top of body -->
<div id="error-message" style="
    display: none;
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    background: #fee2e2;
    color: #991b1b;
    padding: 20px;
    border-radius: 8px;
    z-index: 9999;
    max-width: 400px;
">
    <strong>Error:</strong> <span id="error-text"></span>
</div>

<script>
function showErrorMessage(message) {
    document.getElementById('error-text').textContent = message;
    document.getElementById('error-message').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('error-message').style.display = 'none';
    }, 5000);
}
</script>
```

## Complete Integration Template

Here's a minimal working example:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="api-service.js"></script>
    <script>
        // Protect page
        if (!api.isLoggedIn()) {
            window.location.href = '/auth.html';
        }
    </script>
</head>
<body>
    <!-- Error message -->
    <div id="error-message" style="display: none; color: red;">
        <span id="error-text"></span>
    </div>

    <!-- Header with user info and logout -->
    <header>
        <h1>✈️ TravelSmarter</h1>
        <div id="user-info">
            Hi, <span id="user-name">User</span>
            <span id="user-tier" style="color: #667eea; font-weight: bold;">Free</span>
        </div>
        <button onclick="logout()">Logout</button>
    </header>

    <!-- Deals section -->
    <section id="deals-container">
        <h2>Live Deals</h2>
        <div id="deals-list">Loading...</div>
    </section>

    <!-- Pricing section -->
    <section id="pricing">
        <h2>Upgrade</h2>
        <button onclick="checkout('smart_traveler')">Smart Traveler €19/mo</button>
        <button onclick="checkout('elite')">Elite €49/mo</button>
    </section>

    <script>
        // Load data on page load
        window.addEventListener('load', async () => {
            await loadUserProfile();
            await loadDeals();
        });

        // Load user profile
        async function loadUserProfile() {
            try {
                const response = await api.getCurrentUser();
                const user = response.user;
                document.getElementById('user-name').textContent = user.first_name || 'User';
                document.getElementById('user-tier').textContent = user.subscription_tier || 'Free';
            } catch (error) {
                console.error('Failed to load profile:', error);
            }
        }

        // Load deals
        async function loadDeals() {
            try {
                const response = await api.getDeals();
                const dealsHtml = (response.deals || []).map(deal => `
                    <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                        <h4>${deal.title}</h4>
                        <p>${deal.description}</p>
                        <p><strong>€${deal.value_amount}</strong> value</p>
                        <button onclick="upvote('${deal.id}')">👍 ${deal.upvote_count}</button>
                        <button onclick="saveDeal('${deal.id}')">💾 Save</button>
                    </div>
                `).join('');
                document.getElementById('deals-list').innerHTML = dealsHtml;
            } catch (error) {
                showErrorMessage('Failed to load deals: ' + error.message);
            }
        }

        // Upvote deal
        async function upvote(dealId) {
            try {
                await api.upvoteDeal(dealId);
                loadDeals(); // Reload to show new count
            } catch (error) {
                showErrorMessage('Failed to upvote: ' + error.message);
            }
        }

        // Save deal
        async function saveDeal(dealId) {
            try {
                await api.saveDeal(dealId);
                alert('Deal saved!');
            } catch (error) {
                showErrorMessage('Failed to save: ' + error.message);
            }
        }

        // Checkout
        async function checkout(tier) {
            try {
                const response = await api.createCheckoutSession(tier);
                if (response.success) {
                    window.location.href = response.url;
                }
            } catch (error) {
                showErrorMessage('Checkout failed: ' + error.message);
            }
        }

        // Logout
        function logout() {
            api.logout();
            window.location.href = '/auth.html';
        }

        // Show error
        function showErrorMessage(msg) {
            document.getElementById('error-text').textContent = msg;
            document.getElementById('error-message').style.display = 'block';
            setTimeout(() => {
                document.getElementById('error-message').style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>
```

## Common Patterns

### Show/hide features by tier
```javascript
if (api.hasTier('elite')) {
    document.getElementById('sms-alerts').style.display = 'block';
} else {
    // Show upgrade prompt
    document.getElementById('upgrade-prompt').style.display = 'block';
}
```

### Handle loading state
```javascript
async function loadWithSpinner(fn) {
    document.getElementById('spinner').style.display = 'block';
    try {
        return await fn();
    } finally {
        document.getElementById('spinner').style.display = 'none';
    }
}

// Usage
const deals = await loadWithSpinner(() => api.getDeals());
```

### Retry on failure
```javascript
async function loadDealsWithRetry() {
    let attempts = 0;
    while (attempts < 3) {
        try {
            return await api.getDeals();
        } catch (error) {
            attempts++;
            if (attempts >= 3) throw error;
            await new Promise(r => setTimeout(r, 1000 * attempts));
        }
    }
}
```

## Testing Your Integration

### Test in browser console:
```javascript
// Check if logged in
api.isLoggedIn() // should be true

// Get current user
await api.getCurrentUser()

// Get deals
await api.getDeals()

// Get pricing
await api.getPricing()

// Check tier
api.getUserTier()

// Check if has elite tier
api.hasTier('elite')
```

### Test authentication:
1. Go to `/auth.html`
2. Sign up with test email
3. Verify redirected to `/index.html`
4. Check localStorage has token and user data
5. Logout and verify redirected back to `/auth.html`

### Test deals:
1. Load `/index.html`
2. Check deals load from API
3. Click upvote and verify count increases
4. Click save and verify confirmation

### Test checkout:
1. Click upgrade button
2. Verify redirected to Stripe checkout
3. Test with card `4242 4242 4242 4242`
4. Verify success and subscription updated

## Deployment

### Environment Variables

Create `.env` file:
```
API_URL=https://api.travelsmarter.com
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
NODE_ENV=production
```

Update API URL before deploying:
```javascript
// In auth.html or at app start
api.setBaseURL(process.env.API_URL || 'http://localhost:5000/api');
```

## Next Steps

✅ Copy `api-service.js` to your project
✅ Copy `auth.html` to your project  
✅ Update `index.html` with integration code
✅ Test authentication flow
✅ Test deal loading and interactions
✅ Test checkout flow
✅ Deploy to production

**Questions?** See `INTEGRATION_GUIDE.md` for detailed examples and troubleshooting.
