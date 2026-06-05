# DigitalOcean Frontend Deployment - Step by Step

## Prerequisites (Check These First):

- ✅ DigitalOcean account created (free signup at digitalocean.com)
- ✅ GitHub account with your frontend code pushed
- ✅ Domain registered (or will register during this process)
- ✅ Frontend code ready (index.html, api-service.js, etc.)

---

## 📍 PART 1: PREPARE YOUR GITHUB REPOSITORY

### **Step 1.1: Push Frontend Code to GitHub**

If you haven't already:

```bash
# In your frontend directory
git init
git add .
git commit -m "Initial commit: TravelSmarter frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/travelsmarter-frontend.git
git push -u origin main
```

Your code is now on GitHub at:
```
https://github.com/YOUR_USERNAME/travelsmarter-frontend
```

---

### **Step 1.2: Create app.json File (Optional but Recommended)**

Create a file in your frontend root directory called `app.json`:

```json
{
  "name": "TravelSmarter Frontend",
  "description": "Frontend web app for TravelSmarter travel hacking platform",
  "buildCommand": "echo 'Frontend is static HTML'",
  "env": {
    "API_URL": {
      "description": "Backend API URL",
      "value": "https://api.travelsmarterapp.com"
    }
  },
  "static_sites": [
    {
      "name": "TravelSmarter Frontend",
      "source_dir": ".",
      "routes": [
        {
          "path": "/",
          "file": "index.html"
        },
        {
          "path": "/squeeze-page.html",
          "file": "squeeze-page.html"
        },
        {
          "path": "/sales-page.html",
          "file": "sales-page.html"
        },
        {
          "path": "/checkout.html",
          "file": "checkout.html"
        },
        {
          "path": "/frontend/auth.html",
          "file": "frontend/auth.html"
        }
      ]
    }
  ]
}
```

Push this to GitHub:
```bash
git add app.json
git commit -m "Add app.json for DigitalOcean deployment"
git push
```

---

## 🌐 PART 2: CREATE DIGITALOCEAN APP

### **Step 2.1: Log Into DigitalOcean**

1. Go to: https://cloud.digitalocean.com/
2. Enter your email and password
3. Click "Log in"

You should see the DigitalOcean dashboard.

---

### **Step 2.2: Navigate to App Platform**

1. In the left sidebar, look for **"App Platform"**
2. Click on it
3. You should see: "Create your first app"

---

### **Step 2.3: Click "Create App"**

You'll see a blue button that says **"Create App"** or **"New App"**

Click it.

---

### **Step 2.4: Connect Your GitHub Repository**

You'll see a screen: **"Select Source"**

**Option A: Connect GitHub (First Time)**
1. Click: **"GitHub"**
2. You'll see: "Authorize DigitalOcean"
3. Click: "Authorize DigitalOcean on GitHub" (green button)
4. GitHub will ask for permission - click "Authorize"
5. You'll be redirected back to DigitalOcean

**Option B: GitHub Already Connected**
1. Click: **"GitHub"**
2. Choose account (if multiple)

---

### **Step 2.5: Select Your Repository**

After GitHub is connected, you'll see:

```
Select a GitHub repository:
[ Search... ]

Your repositories:
☐ travelsmarter-frontend
☐ travelsmarter-backend
☐ other-repo
```

1. Click on: **travelsmarter-frontend** (or whatever your repo is named)
2. Click: "Next"

---

### **Step 2.6: Choose Branch and Configure**

You'll see: **"GitHub Integration"**

```
Repository: your-username/travelsmarter-frontend
Branch: [ main ▼ ]
Auto deploy: [ ✓ Automatically deploy new commits ]
```

1. **Branch:** Make sure it says `main` (or your branch name)
2. **Auto deploy:** Leave checked ✓ (deploys automatically on GitHub pushes)
3. Click: "Next"

---

### **Step 2.7: Configure Build Settings**

You'll see: **"Build Settings"**

Since your frontend is **static HTML** (not Node.js/React build), you have options:

#### **Option A: Static Site (SIMPLEST - DO THIS)**

```
Build Command: [Leave blank or: echo "Static files"]
Output Directory: . (or / - wherever your files are)
```

1. **Build Command:** Leave blank (nothing to build)
2. **Output Directory:** `.` (current directory where index.html is)
3. Click: "Next"

#### **Option B: If You Have a Build Step (Skip if unsure)**

If you later have a React/Vue/etc. build:
```
Build Command: npm run build
Output Directory: dist/ (or build/, depending on framework)
```

For now, just use Option A.

---

### **Step 2.8: Set Environment Variables**

You'll see: **"Environment Variables"**

This is where you set the API URL.

```
Variable Name: API_URL
Value: https://api.travelsmarterapp.com
[ Add Another ]
```

1. **Click:** "Edit" or "Add Environment Variable"
2. **Name:** `API_URL`
3. **Value:** `https://api.travelsmarterapp.com`
   - For development: `http://localhost:5000/api`
   - For production: `https://api.travelsmarterapp.com` (or your backend URL)
4. Click: "Add Variable" or "Save"

If you have other secrets (Stripe keys, etc.):
```
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
SENDGRID_API_KEY=SG.xxxxx
```

Add them the same way.

Click: "Next"

---

### **Step 2.9: Choose App Name and Region**

You'll see: **"App Info"**

```
App Name: [ travelsmarter-frontend ]
Region: [ New York (nyc) ▼ ]
```

**App Name:**
- Change to: `travelsmarter-frontend`
- This becomes your temporary URL: `https://travelsmarter-frontend-xxxxx.ondigitalocean.app`

**Region:**
- For EU users: Choose `Frankfurt (fra)` or `Amsterdam (ams)`
- For Global: Choose `New York (nyc)` or `San Francisco (sfo)`
- **Recommendation for Europe:** Frankfurt

Click: "Next"

---

### **Step 2.10: Review and Create**

You'll see: **"Review"**

Check everything:
```
Repository: your-username/travelsmarter-frontend ✓
Branch: main ✓
Build Command: (blank) ✓
Output Directory: . ✓
Environment Variables: API_URL=... ✓
App Name: travelsmarter-frontend ✓
Region: Frankfurt ✓
```

If everything looks good:

**Click: "Create Resources"**

---

### **Step 2.11: Wait for Deployment**

You'll see a **"Building and Deploying"** screen with a progress bar.

This will take about **2-5 minutes**. You'll see:
```
🔄 Building...
🚀 Deploying...
✅ Live!
```

Once it says **"Live"**, your app is deployed!

---

## 🌍 PART 3: GET YOUR APP URL

### **Step 3.1: Find Your Live URL**

After deployment finishes, you'll see:

```
App: travelsmarter-frontend
Status: ✅ Live
URL: https://travelsmarter-frontend-abc123xyz.ondigitalocean.app
```

**This is your temporary URL.** Copy it.

Visit it in your browser:
```
https://travelsmarter-frontend-abc123xyz.ondigitalocean.app
```

You should see your app! 🎉

---

## 🔗 PART 4: ADD CUSTOM DOMAIN

### **Step 4.1: Go to App Settings**

In your DigitalOcean App Platform dashboard:

1. Click your app: **travelsmarter-frontend**
2. Click: **Settings** (in the left menu)
3. Scroll down to: **"Domains"**

---

### **Step 4.2: Add Custom Domain**

You'll see: **"Domains"** section

```
Add a domain:
[ input field: "example.com" ]
[ Add Domain ]
```

1. In the input field, type: `travelsmarterapp.com`
2. Click: **"Add Domain"**

DigitalOcean will show:
```
💡 To use this domain, update your DNS records:
CNAME: your-subdomain.ondigitalocean.app
```

---

### **Step 4.3: Update DNS Records**

You have two options:

#### **Option A: Already Registered Domain at DigitalOcean (EASIEST)**

If you registered your domain at DigitalOcean:
1. Go to: **Networking → Domains**
2. Click your domain: **travelsmarterapp.com**
3. DigitalOcean automatically adds the DNS records
4. Done! (May take 5-30 minutes to propagate)

#### **Option B: Domain at Different Registrar (GoDaddy, Namecheap, etc.)**

If your domain is elsewhere:
1. Get the DNS record from DigitalOcean (shown in Step 4.2)
2. Go to your registrar's dashboard (GoDaddy, Namecheap, etc.)
3. Find "DNS Settings" or "Name Servers"
4. Update the CNAME record to point to DigitalOcean
5. Wait 5-30 minutes for propagation

**Example:**
```
Type: CNAME
Name: travelsmarterapp.com
Value: travelsmarter-frontend-abc123.ondigitalocean.app
```

---

### **Step 4.4: Verify Domain Works**

After DNS propagates (5-30 min):

1. Open: `https://travelsmarterapp.com` in your browser
2. You should see your app!
3. Check HTTPS works (green lock icon 🔒)

If it doesn't work:
- Wait another 10 minutes (DNS takes time)
- Or check your DNS settings are correct

---

## ✅ PART 5: VERIFY EVERYTHING WORKS

### **Step 5.1: Test Your Frontend**

Visit: `https://travelsmarterapp.com`

You should see:
- ✅ Your app loads
- ✅ All CSS styling works
- ✅ All JavaScript works
- ✅ HTTPS/SSL works (green lock)
- ✅ No 404 errors

### **Step 5.2: Test Navigation**

Click around your app:
- ✅ Click squeeze page link
- ✅ Click sales page link
- ✅ Click checkout link
- ✅ Test all buttons

### **Step 5.3: Test API Connection**

Open browser console (F12):

```javascript
// Test if api-service.js loaded
console.log(typeof api)  // Should print: "object"

// Test API URL
console.log(api.baseURL)  // Should print your API URL
```

### **Step 5.4: Check Page Loading**

Open DevTools (F12) → Network tab:

```
GET https://travelsmarterapp.com/ [200]
GET https://travelsmarterapp.com/api-service.js [200]
GET https://travelsmarterapp.com/index.css [200]
(etc.)
```

All should show `200` (success).

---

## 🔄 PART 6: AUTO-DEPLOYMENT FROM GITHUB

### **How It Works:**

Once set up, every time you push to GitHub, DigitalOcean automatically redeploys:

```bash
# In your project
git add .
git commit -m "Update feature X"
git push origin main

# Automatically triggers DigitalOcean deployment!
# Check: App Platform → Your App → Deployments
```

---

## 🆘 TROUBLESHOOTING:

### **Problem: App shows 404 error**

**Solution:**
1. Check app.json has correct routes
2. Make sure index.html is in root directory
3. Rebuild: Go to App → Deployments → Trigger Deploy

### **Problem: Custom domain not working**

**Solution:**
1. Wait 15-30 minutes (DNS propagation)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check DNS records in DigitalOcean → Domains

### **Problem: API calls not working**

**Solution:**
1. Check API_URL environment variable is set
2. Check API URL is correct (should be your backend URL)
3. Check backend is running/deployed
4. Check CORS is enabled on backend

### **Problem: CSS/Images not loading**

**Solution:**
1. Check file paths are relative (not absolute)
2. Bad: `/css/style.css` 
3. Good: `./css/style.css` or just `css/style.css`

---

## 📋 FINAL CHECKLIST:

After following all steps:

- [ ] GitHub account with frontend code
- [ ] DigitalOcean account created
- [ ] App Platform app created
- [ ] GitHub connected to DigitalOcean
- [ ] Build settings configured (static HTML)
- [ ] Environment variables set (API_URL)
- [ ] App deployed and shows "Live"
- [ ] Temporary URL works: `https://travelsmarter-frontend-xxxxx.ondigitalocean.app`
- [ ] Custom domain added: `travelsmarterapp.com`
- [ ] DNS records updated (if needed)
- [ ] Custom domain works: `https://travelsmarterapp.com`
- [ ] HTTPS/SSL working (green lock)
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] API connection configured

---

## ⏱️ EXPECTED TIMELINE:

| Step | Time |
|------|------|
| GitHub setup | 5 min |
| DigitalOcean connection | 5 min |
| Create app | 2 min |
| Configure settings | 5 min |
| Deploy | 3-5 min |
| Add domain | 2 min |
| DNS propagation | 5-30 min |
| **Total** | **30-50 min** |

---

## 🎉 CONGRATULATIONS!

Your frontend is now live on DigitalOcean! 🚀

Next steps:
1. Deploy backend the same way
2. Create PostgreSQL database
3. Connect everything together
4. Test end-to-end flow

---

## 📚 HELPFUL LINKS:

- DigitalOcean App Platform Docs: https://docs.digitalocean.com/products/app-platform/
- Deploy Static Sites: https://docs.digitalocean.com/products/app-platform/how-to/deploy-static-site/
- Custom Domains: https://docs.digitalocean.com/products/app-platform/references/app-spec/#domains

---

## 💡 PRO TIPS:

1. **Redeployment:** If something breaks, go to Deployments → "Trigger Deploy"
2. **Logs:** Check Deployment Logs if something fails
3. **Rollback:** Can revert to previous deployment if needed
4. **Scaling:** As traffic grows, increase resource allocation in Settings
5. **Auto-scaling:** DigitalOcean can auto-scale based on traffic

---

**You're all set! Your frontend is live.** 🌍✅

