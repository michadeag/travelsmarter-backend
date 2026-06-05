# Frontend-Backend Integration Guide

Complete guide for connecting your TravelSmarter web application to the backend API.

## Overview

Your web application now connects to a production-ready Node.js/Express backend that handles:
- User authentication (signup/login)
- Subscription management (Stripe payments)
- Deal management (create, read, upvote, save)
- Hack management (save, retrieve user preferences)
- Real-time data updates

## Files

### `api-service.js` (600+ lines)
Centralized API communication layer with:
- Authentication handling (JWT tokens)
- All API endpoints
- Error handling
- User state management
- Subscription tier checking

### `auth.html` (400+ lines)
Complete authentication page with:
- Login form
- Signup form
- API configuration settings
- Error alerts
- Loading states

## Quick Start

### 1. Update index.html

Add this to the `<head>` section:

```html
<!-- API Service -->
<script src="api-service.js"></script>
<!-- Authentication Check -->
<script>
    if (!api.isLoggedIn()) {
        window.location.href = '/auth.html';
    }
</script>
```

### 2. Configure API URL

Users can configure API URL on login page or by clicking "Change API URL" link.

Default: `http://localhost:5000/api`

For production: `https://your-api-domain.com/api`

### 3. Load Real Data

Replace static data with API calls (see examples below).

## Integration Examples

### Authentication

#### Check if user is logged in
```javascript
if (api.isLoggedIn()) {
    console.log('User is logged in');
    console.log(api.user);
}
```

#### Get current user
```javascript
async function loadUserProfile() {
    try {
        const response = await api.getCurrentUser();
        document.getElementById('user-name').textContent = response.user.first_name;
        document.getElementById('user-tier').textContent = response.user.subscription_tier;
    } catch (error) {
        console.error('Failed to load user:', error);
    }
}
```

#### Logout
```javascript
function logout() {
    api.logout();
    window.location.href = '/auth.html';
}
```

### Deals Management

#### Load all deals from API
```javascript
async function loadDeals() {
    try {
        const response = await api.getDeals();
        displayDeals(response.deals);
    } catch (error) {
        console.error('Failed to load deals:', error);
    }
}

function displayDeals(deals) {
    const container = document.getElementById('deals-container');
    container.innerHTML = deals.map(deal => `
        <div class="deal-item">
            <h3>${deal.title}</h3>
            <p>${deal.description}</p>
            <span class="deal-value">€${deal.value_amount}</span>
            <button onclick="upvoteDeal('${deal.id}')">👍 ${deal.upvote_count}</button>
            <button onclick="saveDeal('${deal.id}')">💾 Save</button>
        </div>
    `).join('');
}
```

#### Search deals
```javascript
async function searchDeals(query) {
    try {
        const response = await api.searchDeals(query);
        displayDeals(response.deals);
    } catch (error) {
        console.error('Search failed:', error);
    }
}
```

#### Get trending deals
```javascript
async function getTrendingDeals() {
    try {
        const response = await api.getTrendingDeals();
        displayTrendingSection(response.deals);
    } catch (error) {
        console.error('Failed to load trending:', error);
    }
}
```

#### Upvote deal
```javascript
async function upvoteDeal(dealId) {
    try {
        const response = await api.upvoteDeal(dealId);
        if (response.success) {
            // Reload deals to show updated count
            loadDeals();
        }
    } catch (error) {
        alert('Failed to upvote deal: ' + error.message);
    }
}
```

#### Save deal
```javascript
async function saveDeal(dealId) {
    try {
        const response = await api.saveDeal(dealId);
        if (response.success) {
            alert('Deal saved!');
            // Update button state
        }
    } catch (error) {
        alert('Failed to save deal: ' + error.message);
    }
}
```

### Hacks Management

#### Load modules
```javascript
async function loadModules() {
    try {
        const response = await api.getModules();
        console.log(`Loaded ${response.modules.length} modules`);
        displayModules(response.modules);
    } catch (error) {
        console.error('Failed to load modules:', error);
    }
}
```

#### Get hacks in module
```javascript
async function loadModuleHacks(moduleId) {
    try {
        const response = await api.getHacksByModule(moduleId);
        displayHacks(response.module);
    } catch (error) {
        console.error('Failed to load hacks:', error);
    }
}
```

#### Save hack
```javascript
async function saveHack(moduleId, hackId, hackTitle, hackCategory) {
    try {
        const response = await api.saveHack(moduleId, hackId, hackTitle, hackCategory);
        if (response.success) {
            // Update UI to show saved status
            event.target.textContent = '✅ Saved';
        }
    } catch (error) {
        alert('Failed to save hack: ' + error.message);
    }
}
```

#### Get user's saved hacks
```javascript
async function loadSavedHacks() {
    try {
        const response = await api.getSavedHacks();
        displaySavedHacks(response.savedHacks);
    } catch (error) {
        console.error('Failed to load saved hacks:', error);
    }
}
```

### Subscription Management

#### Get pricing plans
```javascript
async function loadPricing() {
    try {
        const response = await api.getPricing();
        displayPricingCards(response.pricing);
    } catch (error) {
        console.error('Failed to load pricing:', error);
    }
}
```

#### Get current subscription
```javascript
async function loadSubscription() {
    try {
        const response = await api.getCurrentSubscription();
        document.getElementById('current-tier').textContent = response.subscription.tier;
        document.getElementById('next-billing').textContent = response.subscription.currentPeriodEnd;
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
}
```

#### Create checkout session
```javascript
async function startCheckout(tier, promoCode = null) {
    try {
        const response = await api.createCheckoutSession(tier, promoCode);
        
        if (response.success) {
            // Redirect to Stripe checkout
            window.location.href = response.url;
        }
    } catch (error) {
        alert('Failed to create checkout: ' + error.message);
    }
}
```

### User Profile

#### Update profile
```javascript
async function updateUserProfile(firstName, lastName) {
    try {
        const response = await api.updateProfile(firstName, lastName);
        if (response.success) {
            api.setUser(response.user);
            alert('Profile updated!');
        }
    } catch (error) {
        alert('Failed to update profile: ' + error.message);
    }
}
```

#### Change password
```javascript
async function changePassword(currentPassword, newPassword) {
    try {
        const response = await api.changePassword(currentPassword, newPassword);
        if (response.success) {
            alert('Password changed successfully!');
        }
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
}
```

## Tier-Based Features

Check user's subscription tier before showing premium features:

```javascript
// Check if user has specific tier
if (api.hasTier('elite')) {
    // Show Elite-only features
    document.getElementById('sms-alerts').style.display = 'block';
    document.getElementById('expert-consultation').style.display = 'block';
}

// Check current tier
const tier = api.getUserTier();
if (tier === 'free') {
    // Show upgrade prompt
} else if (tier === 'smart_traveler') {
    // Show Smart Traveler features
} else if (tier === 'elite') {
    // Show Elite features
}
```

## Error Handling

### Global error handler
```javascript
window.addEventListener('error', (event) => {
    console.error('Error:', event.error);
    showErrorAlert('Something went wrong. Please try again.');
});

function showErrorAlert(message) {
    const alertEl = document.getElementById('error-alert');
    alertEl.textContent = message;
    alertEl.classList.add('show');
    
    setTimeout(() => {
        alertEl.classList.remove('show');
    }, 5000);
}
```

### Retry logic
```javascript
async function retryRequest(fn, maxRetries = 3) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            attempts++;
            if (attempts >= maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
}

// Usage
const deals = await retryRequest(() => api.getDeals());
```

## API Configuration

### Local Development
```javascript
// Default: http://localhost:5000/api
// Backend must be running: npm run dev
```

### Production
```javascript
// Update API URL before deployment
localStorage.setItem('apiUrl', 'https://api.travelsmarter.com');
api.setBaseURL('https://api.travelsmarter.com');
```

## Loading States

Show loading indicators while fetching data:

```javascript
async function loadDealsWithSpinner() {
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'block';
    
    try {
        const response = await api.getDeals();
        displayDeals(response.deals);
    } finally {
        spinner.style.display = 'none';
    }
}
```

HTML:
```html
<div id="spinner" style="display: none;">
    <div class="spinner"></div>
    Loading...
</div>
```

CSS:
```css
.spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```

## Stripe Payment Integration

### 1. Add Stripe script to checkout.html

```html
<script src="https://js.stripe.com/v3/"></script>
<script src="api-service.js"></script>
```

### 2. Initialize Stripe
```javascript
const stripe = Stripe('pk_test_your_publishable_key');

async function initiatePayment(tier) {
    try {
        const response = await api.createCheckoutSession(tier);
        
        // Redirect to Stripe checkout
        const result = await stripe.redirectToCheckout({
            sessionId: response.sessionId
        });
        
        if (result.error) {
            alert(result.error.message);
        }
    } catch (error) {
        alert('Payment initiation failed: ' + error.message);
    }
}
```

### 3. Handle payment success

After successful payment, Stripe webhook will:
- Create subscription in database
- Update user tier
- Send confirmation email

User is redirected to success page with receipt.

## Data Persistence

User data is automatically saved to localStorage:

```javascript
// Token is saved automatically
localStorage.getItem('userToken');

// User data is saved automatically
const user = JSON.parse(localStorage.getItem('userData'));

// API URL is saved automatically
localStorage.getItem('apiUrl');
```

## Real-Time Updates

For real-time deal feeds, poll the API periodically:

```javascript
// Update trending deals every 30 seconds
setInterval(async () => {
    const response = await api.getTrendingDeals();
    updateTrendingUI(response.deals);
}, 30000);
```

Or use WebSocket for true real-time (backend implementation needed):

```javascript
const ws = new WebSocket('ws://localhost:5000/deals');
ws.onmessage = (event) => {
    const deal = JSON.parse(event.data);
    prependDealToUI(deal);
};
```

## Testing

### Test authentication
```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Test API calls
```javascript
// In browser console
await api.getDeals();
await api.getTrendingDeals();
await api.getCurrentUser();
await api.getPricing();
```

## Performance Optimization

### Cache API responses
```javascript
const cache = {
    deals: null,
    modules: null,
    deals_ttl: Date.now()
};

async function getDealsCached() {
    // Return cached if less than 1 minute old
    if (cache.deals && Date.now() - cache.deals_ttl < 60000) {
        return cache.deals;
    }
    
    const response = await api.getDeals();
    cache.deals = response.deals;
    cache.deals_ttl = Date.now();
    return cache.deals;
}
```

### Lazy load modules
```javascript
// Load modules only when tab is clicked
document.getElementById('module-tab').addEventListener('click', async () => {
    if (!modulesLoaded) {
        await loadModules();
        modulesLoaded = true;
    }
});
```

## Security Best Practices

✅ **Store tokens securely**
```javascript
// Good: localStorage (auto-clears on logout)
localStorage.setItem('userToken', token);

// Better: sessionStorage (clears on tab close)
sessionStorage.setItem('userToken', token);
```

✅ **Never expose API keys**
```javascript
// Don't do this:
const apiKey = 'sk_live_xxxxx'; // ❌ NEVER

// Do this instead: Keep on backend only
```

✅ **Validate user input**
```javascript
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 8;
}
```

✅ **Use HTTPS in production**
```javascript
// Check protocol
if (window.location.protocol !== 'https:' && !isDevelopment) {
    window.location.href = 'https:' + window.location.href.substring(5);
}
```

## Deployment Checklist

- [ ] Update API URL for production
- [ ] Add Stripe live publishable key
- [ ] Configure CORS on backend
- [ ] Enable HTTPS
- [ ] Set Content Security Policy headers
- [ ] Test authentication flow
- [ ] Test payment flow
- [ ] Test deal interactions
- [ ] Monitor error logs
- [ ] Set up analytics
- [ ] Configure email notifications

## Support

For issues with integration:
1. Check backend is running: `npm run dev` in backend directory
2. Check API URL is correct
3. Check token is stored: `localStorage.getItem('userToken')`
4. Check console for errors: `F12` → Console tab
5. Check network requests: `F12` → Network tab

---

**Ready to integrate!** Start with `auth.html`, then use the examples above to update `index.html`.
