# 🚀 TravelSmarter Customer Journey Test Flow

**Objective:** Test the complete flow from welcome page → cheat sheet → modules → pricing → checkout → success

Test one step at a time. Only move to the next step if the current step works perfectly.

---

## ✅ STEP 1: Welcome Page (Landing)
**URL:** https://travelsmarterapp.com/welcome.html

### What to Check:
- [ ] Page loads without errors
- [ ] Headline and copy are visible
- [ ] Opt-in form is visible (email field + button)
- [ ] NO tier information should appear (user not logged in yet)
- [ ] "Get Free Access" or similar CTA button is prominent

### Action:
- Enter your **test email** in the form
- Click the opt-in button
- You should be redirected to the **cheat sheet page**

### What to Expect After Click:
- Form should process
- No errors in browser console (F12)
- Redirect to cheat-sheet.html (URL shows /cheat-sheet.html)

---

## ✅ STEP 2: Cheat Sheet Page (After Opt-in)
**URL:** https://travelsmarterapp.com/cheat-sheet.html

### What to Check:
- [ ] Page loads without errors
- [ ] Navigation bar visible with links to Home, Pricing, Account
- [ ] Cheat sheet content loads
- [ ] Check browser console (F12) → Network tab
  - Look for `/api/auth/me` request
  - Status should be 200 (or 401 if not logged in yet)

### User Tier Display:
- [ ] Look for tier badge/display (usually near top)
- [ ] Should show "FREE" tier (or default)
- [ ] Tier colors should be grey (#6b7280)

### Content Check:
- [ ] All cheat sheet sections visible
- [ ] No greyed-out locked content appearing yet (free tier should have basic access)

### Action:
- Scroll through the cheat sheet
- Look for any [data-tier-lock] sections (these would be locked for premium)
- Open DevTools (F12) → Console and check for errors

---

## ✅ STEP 3: Navigate to Modules Page
**URL:** https://travelsmarterapp.com/modules.html

### How to Get There:
- Click "Modules" or "Learn" link from navigation, OR
- Type the URL directly

### What to Check on Load:
- [ ] Page title: "📚 Learning Modules"
- [ ] Header shows "Master travel hacking with our comprehensive guide"
- [ ] Tier badge appears in header (should show "FREE")

### Module Cards Visibility:
**FREE TIER SHOULD SEE:**
- [ ] Modules 1-4 fully visible (normal colors, clickable)
  - Module 1: Flight Hacks
  - Module 2: Credit Card Strategy
  - Module 3: Hotel Hacks
  - Module 4: Timing Intelligence

**FREE TIER SHOULD NOT SEE AS ACCESSIBLE:**
- [ ] Modules 5-16 should be GREYED OUT (opacity 0.6, grayscale)
- [ ] Each locked module should have a 🔒 lock icon
- [ ] Should see "Upgrade to Smart Traveler" button on locked modules

### Browser Console Check:
- [ ] F12 → Network tab
- [ ] Find request to `/api/hacks/modules`
- [ ] Status should be 200
- [ ] Response should show: `"userTier": "free"` and `"accessible": 4`

### If Modules Are ALL Greyed Out (Bug):
- [ ] This is the issue from before!
- [ ] **DO NOT CONTINUE** - report this
- [ ] Console errors to check:
  ```javascript
  // In Console, type:
  console.log(localStorage.getItem('userToken'))
  ```
  - If null → not logged in
  - If token string → logged in, might be API issue

---

## ✅ STEP 4: Click on Unlocked Module (Module 1)
**Location:** Modules page, Module 1 card

### What to Check:
- [ ] Module 1 card is clickable (cursor should change to pointer)
- [ ] Click on Module 1 card
- [ ] Should navigate to the module detail page

### Expected Page:
- [ ] Module 1 hacks/content loads
- [ ] Title shows "Module 1: Flight Hacks"
- [ ] Content relevant to flights
- [ ] Tier badge still shows "FREE"

### Action:
- Spend 10 seconds viewing the module
- Go back to modules page (browser back button or navigation link)

---

## ✅ STEP 5: Try Clicking a Locked Module (Module 5)
**Location:** Modules page, Module 5 card

### What to Check:
- [ ] Module 5 card is GREYED OUT (opacity reduced)
- [ ] Module 5 card is NOT clickable (cursor should be default, not pointer)
- [ ] Card shows lock icon 🔒
- [ ] Card shows "Upgrade to Smart Traveler" button

### Action:
- Click the "Upgrade to Smart Traveler" button
- Should navigate to `/pricing` page

---

## ✅ STEP 6: Pricing Page
**URL:** https://travelsmarterapp.com/pricing (or /sales-page.html)

### What to Check on Load:
- [ ] Three tier cards visible: FREE, SMART TRAVELER, ELITE
- [ ] Pricing shown: Free ($0), Smart Traveler (€19/month), Elite (€49/month)
- [ ] Current tier badge shows "FREE" (if visible)

### Tier Comparison Matrix:
- [ ] FREE card shows: ✅ 4 modules, ✅ 22 hacks, ❌ Email sequences
- [ ] SMART TRAVELER card shows: ✅ 10 modules, ✅ 50+ hacks, ✅ Email sequences
- [ ] ELITE card shows: ✅ All 16 modules, ✅ 80+ hacks, ✅ Priority support
- [ ] SMART TRAVELER has "MOST POPULAR" badge
- [ ] SMART TRAVELER card is slightly enlarged (scale: 1.05)

### CTA Buttons:
- [ ] FREE tier: "Get Started" button
- [ ] SMART TRAVELER: "Start Free Trial" button
- [ ] ELITE: "Start Free Trial" button

### Action:
- Click "Start Free Trial" on SMART TRAVELER
- Should navigate to checkout page

---

## ✅ STEP 7: Checkout Page
**URL:** https://travelsmarterapp.com/checkout.html?tier=smart

### What to Check on Load:
- [ ] Header shows "✈️ TravelSmarter Checkout"
- [ ] Plan selection visible on left (Smart Traveler should be pre-selected)
- [ ] Pricing shows €19/month
- [ ] Order summary shows correct plan

### Current Tier Display:
- [ ] Tier badge shows "FREE" (you're not charged yet)
- [ ] Info box shows: "30 days free to try, then auto-renews at €19/month"

### Form Fields:
- [ ] First Name field
- [ ] Last Name field
- [ ] Email field
- [ ] Billing address fields
- [ ] Payment method section (Stripe info)
- [ ] Terms & Conditions checkbox
- [ ] Pay button with total price

### Security Badges:
- [ ] 🔒 SSL Encrypted
- [ ] 💳 Secure Payment
- [ ] ✓ Money-Back Guarantee

### Fill Out Form:
- [ ] Enter test details:
  - First Name: `TestUser`
  - Last Name: `Tester`
  - Email: same as squeeze page email
  - Address: `123 Test Street`
  - City: `Berlin`
  - Postal: `10115`
  - Country: `Germany`

### Before Clicking Pay:
- [ ] Check Terms checkbox
- [ ] Verify no errors in console (F12)

### Action:
- Click "Complete Purchase" button
- Should redirect to Stripe payment page (in production)
- For testing: Should redirect to success page after successful payment simulation

---

## ✅ STEP 8: Success Page
**URL:** https://travelsmarterapp.com/success.html?session_id=...

### What to Check on Load:
- [ ] Success icon (✓) with bounce animation
- [ ] Heading: "Payment Successful!"
- [ ] Message: "Thank you for your subscription to TravelSmarter"
- [ ] Confirmation message visible

### Tier Update Check:
- [ ] Tier badge should now show "SMART TRAVELER" (not FREE anymore)
- [ ] Tier color should be BLUE (#3b82f6)

### Details Section:
- [ ] Session ID displayed (partial: first 20 chars + "...")
- [ ] Status shows ✓ Confirmed
- [ ] Date shows today's date in format: "6. Juni 2026"

### Action Buttons:
- [ ] "Back to App" button (goes to /)
- [ ] "Contact Support" button (goes to mailto:michael@reesin.com)

### Email Notification:
- [ ] Check your test email inbox
- [ ] Should have confirmation email from TravelSmarter

### Action:
- Click "Back to App" button
- Should go to home page (index.html)

---

## ✅ STEP 9: Home Page After Purchase
**URL:** https://travelsmarterapp.com/index.html

### What to Check:
- [ ] Page loads normally
- [ ] Tier badge now shows "SMART TRAVELER" (blue color)
- [ ] Navigation shows your tier status
- [ ] Tier comparison matrix visible on page
- [ ] SMART TRAVELER tier should be highlighted as "Your Current Plan"

### Content Access:
- [ ] "Account" or "Dashboard" link visible in navigation
- [ ] Click to view account/subscription page

### Action:
- Navigate to modules page again

---

## ✅ STEP 10: Modules Page (After Upgrade)
**URL:** https://travelsmarterapp.com/modules.html

### What to Check:
- [ ] Tier badge shows "SMART TRAVELER" (blue)
- [ ] Modules 1-10 are now FULLY VISIBLE (normal colors, clickable)
- [ ] Modules 11-16 are GREYED OUT (only for ELITE)
- [ ] Each locked module (11-16) shows lock icon 🔒
- [ ] Locked modules show "Upgrade to Elite" button

### Module Count:
- [ ] Header shows "10 modules accessible" (or similar)
- [ ] All 10 Smart Traveler modules visible and clickable

### Action:
- Click on Module 5 (should now be accessible)
- Should open Module 5 content (not locked anymore)
- Go back to modules page

---

## ✅ STEP 11: Try Upgrading to Elite
**Location:** Modules page, locked module button

### What to Check:
- [ ] Click "Upgrade to Elite" on Module 11-16
- [ ] Should navigate to pricing page
- [ ] ELITE tier should be highlighted
- [ ] Price shows €49/month

### Action:
- For this test, we can skip actual payment
- Just verify the flow works to pricing page

---

## 📊 Summary Checklist

### After STEP 1 (Welcome):
- [ ] Form submits without error
- [ ] Redirects to cheat sheet

### After STEP 2 (Cheat Sheet):
- [ ] Page loads, no console errors
- [ ] Tier shows FREE
- [ ] Content visible

### After STEP 3 (Modules - Before Buy):
- [ ] FREE: 4 modules visible and clickable
- [ ] FREE: 12 modules greyed out with lock icons
- [ ] Network request shows `userTier: "free"`

### After STEP 7 (Checkout):
- [ ] Form loads with pre-selected Smart Traveler plan
- [ ] Pricing correct (€19/month)
- [ ] Stripe integration works or test payment succeeds

### After STEP 8 (Success):
- [ ] Success page displays
- [ ] Tier updates to SMART TRAVELER
- [ ] Confirmation email received

### After STEP 10 (Modules - After Buy):
- [ ] Tier shows SMART TRAVELER
- [ ] 10 modules visible and clickable
- [ ] 6 modules greyed out (ELITE only)

---

## 🔧 Debug Commands (Use in Browser Console)

If anything fails, use these to debug:

```javascript
// Check if logged in
console.log(localStorage.getItem('userToken'))

// Check API endpoint directly
fetch('https://api.travelsmarterapp.com/api/auth/me', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('userToken') }
}).then(r => r.json()).then(d => console.log(d))

// Check modules API
fetch('https://api.travelsmarterapp.com/api/hacks/modules', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('userToken') }
}).then(r => r.json()).then(d => console.log(d))
```

---

## ⚠️ Known Issues to Watch For

1. **All modules greyed out for FREE user**
   - Expected: Modules 1-4 colored, 5-16 greyed
   - If seeing all greyed: Check `/api/hacks/modules` response in Network tab

2. **Tier not updating after purchase**
   - Check localStorage token after success page
   - Try refreshing page
   - Check Network tab for `/api/auth/me` showing updated tier

3. **Stripe payment errors**
   - For testing, you may need test card numbers
   - Common test card: `4242 4242 4242 4242` (any future date, any CVC)

---

**Start with STEP 1 and report back when you complete it! 🎯**
