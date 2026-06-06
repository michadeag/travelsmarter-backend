# DigitalOcean Backend Deployment - Step by Step

## Prerequisites (Check These First):

- ✅ DigitalOcean account created
- ✅ Frontend already deployed (optional but good to have first)
- ✅ GitHub account with backend code pushed
- ✅ Backend code ready (Node.js/Express with package.json)
- ✅ PostgreSQL database created in DigitalOcean (we'll do this after)

---

## 📋 PART 1: PREPARE YOUR BACKEND CODE

### **Step 1.1: Make Sure You Have package.json**

Your backend folder should have a `package.json` file:

```json
{
  "name": "travelsmarter-backend",
  "version": "1.0.0",
  "description": "TravelSmarter backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.8.0",
    "dotenv": "^16.0.3",
    "stripe": "^12.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  }
}
```

If you don't have this, create it in your backend folder.

---

### **Step 1.2: Push Backend Code to GitHub**

If not already done:

```bash
cd ~/path/to/backend
git init
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git add .
git commit -m "Initial commit: Add backend API"
git remote add origin https://github.com/YOUR_USERNAME/travelsmarter-backend.git
git branch -M main
git push -u origin main
```

Your code is now at:
```
https://github.com/YOUR_USERNAME/travelsmarter-backend
```

---

## 🌐 PART 2: CREATE DIGITALOCEAN BACKEND APP

### **Step 2.1: Log Into DigitalOcean**

1. Go to: https://cloud.digitalocean.com/
2. Log in with your account

---

### **Step 2.2: Go to App Platform**

1. In left sidebar: **App Platform**
2. Click: **Create App** (or **New App**)

---

### **Step 2.3: Connect GitHub Repository**

You'll see: **"Select Source"**

1. Click: **GitHub**
2. Choose your account
3. Find and click: **travelsmarter-backend**
4. Click: **Next**

---

### **Step 2.4: Choose Branch**

You'll see: **"GitHub Integration"**

```
Repository: your-username/travelsmarter-backend
Branch: [ main ▼ ]
Auto deploy: [ ✓ Automatically deploy new commits ]
```

1. **Branch:** Make sure it says `main`
2. **Auto deploy:** Leave checked ✓
3. Click: **Next**

---

### **Step 2.5: Configure Build Settings**

You'll see: **"Build Settings"**

```
Build Command: npm install && npm run dev
Output Directory: . (or leave blank)
Run Command: npm start
```

**For Node.js/Express backend:**
1. **Build Command:** Leave blank (or `npm install`)
2. **Run Command:** `npm start`
3. Click: **Next**

---

### **Step 2.6: Set Environment Variables**

This is CRITICAL for the backend. You'll see: **"Environment Variables"**

Click: **"Edit"** and add these variables:

```
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
JWT_SECRET=your-super-secret-key-12345
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
PORT=5000
```

**Where to get each value:**

#### **STRIPE_SECRET_KEY:**
1. Go to: https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (starts with `sk_`)
3. Paste here

#### **SENDGRID_API_KEY:**
1. Go to: https://app.sendgrid.com/settings/api_keys
2. Create new API key
3. Copy it
4. Paste here

#### **JWT_SECRET:**
1. Make up a random string (very long, very random)
2. Example: `abc123def456ghi789jkl000xyz999`
3. Paste here

#### **DATABASE_URL:**
You'll get this from DigitalOcean PostgreSQL. For now, leave it blank - we'll add it after creating the database.

Actually, let's create the database first!

---

## 📊 PART 3: CREATE POSTGRESQL DATABASE (Do This First!)

### **Step 3.1: Go to Databases**

1. In DigitalOcean left sidebar: **Databases**
2. Click: **Create Database**

---

### **Step 3.2: Choose PostgreSQL**

1. Select: **PostgreSQL**
2. Version: Latest (14+ recommended)
3. Region: **Frankfurt** (same as your apps!)
4. Size: **$15/month plan** (good for launch)
5. Name: `travelsmarter-db`
6. Click: **Create Database**

**Wait 2-3 minutes for creation...**

---

### **Step 3.3: Get Connection String**

Once created:

1. Click your database: `travelsmarter-db`
2. Go to: **Connection Details** tab
3. Look for: **Connection String** or **URI**
4. Copy the entire string (looks like):
```
postgresql://doadmin:xxxxxxxxxxxxx@db-xxxxx.ondigitalocean.com:25060/defaultdb
```

**Save this - you'll need it in a second!**

---

## 🔄 PART 4: BACK TO BACKEND APP SETUP

### **Step 4.1: Add DATABASE_URL**

Go back to your backend app setup (where you were adding environment variables):

1. Click: **Edit** (next to "App-Level Environment Variables")
2. Add variable:
   - **Name:** `DATABASE_URL`
   - **Value:** (paste the connection string from Step 3.3)
3. Click: **Add**

---

### **Step 4.2: Review All Environment Variables**

Make sure you have:

```
✓ STRIPE_SECRET_KEY = sk_live_xxxxx
✓ SENDGRID_API_KEY = SG.xxxxx
✓ JWT_SECRET = your-random-secret
✓ DATABASE_URL = postgresql://...
✓ NODE_ENV = production
✓ PORT = 5000
```

All present? Click: **Next**

---

### **Step 4.3: Choose App Name and Region**

You'll see: **"App Info"**

```
App Name: [ travelsmarter-backend ]
Region: [ Frankfurt ▼ ]
```

**Important: Choose SAME region as database (Frankfurt)**

Click: **Next**

---

### **Step 4.4: Review and Create**

You'll see: **"Review"**

Check everything:
```
Repository: travelsmarter-backend ✓
Branch: main ✓
Build Command: (blank or npm install) ✓
Run Command: npm start ✓
Environment Variables: (all 6 set) ✓
App Name: travelsmarter-backend ✓
Region: Frankfurt (SAME as database) ✓
```

Click: **Create Resources**

---

### **Step 4.5: Wait for Deployment**

You'll see: **"Building and Deploying"**

This takes **3-5 minutes**. You'll see:
```
🔄 Building...
🚀 Deploying...
✅ Live!
```

---

## ✅ PART 5: GET YOUR BACKEND URL

### **Step 5.1: Find Your Backend URL**

After deployment:

```
App: travelsmarter-backend
Status: ✅ Live
URL: https://travelsmarter-backend-abc123xyz.ondigitalocean.app
```

**Copy this URL.**

Visit it in your browser:
```
https://travelsmarter-backend-abc123xyz.ondigitalocean.app/api/deals
```

You should see JSON data (or an empty array `[]`).

---

## 🔗 PART 6: ADD CUSTOM DOMAIN FOR BACKEND

### **Step 6.1: Go to Settings → Domains**

1. Your backend app → **Settings** tab
2. Scroll down to: **Domains**
3. Click: **Add Domain**

---

### **Step 6.2: Add Domain**

```
Input: api.travelsmarterapp.com
Click: Add Domain
```

DigitalOcean will show DNS records (if domain registered at DigitalOcean, it auto-configures).

---

### **Step 6.3: Verify Domain Works**

After DNS propagates (5-30 min):

Visit: `https://api.travelsmarterapp.com/api/deals`

Should show JSON data ✅

---

## 🔗 PART 7: UPDATE FRONTEND TO USE BACKEND

### **Step 7.1: Update API URL in Frontend**

In your frontend code, update `api-service.js`:

```javascript
// OLD:
this.baseURL = 'http://localhost:5000/api';

// NEW:
this.baseURL = 'https://api.travelsmarterapp.com';
```

Or set via environment variable:

```javascript
this.baseURL = process.env.API_URL || 'https://api.travelsmarterapp.com';
```

---

### **Step 7.2: Push Frontend Update to GitHub**

```bash
cd ~/path/to/frontend
git add .
git commit -m "Update API URL to production backend"
git push
```

DigitalOcean automatically redeploys your frontend!

---

## ✅ PART 8: TEST EVERYTHING

### **Step 8.1: Test Backend API**

Visit: `https://api.travelsmarterapp.com/api/deals`

Should return JSON (list of deals or empty array)

### **Step 8.2: Test Frontend**

Visit: `https://travelsmarterapp.com`

Should load and be able to:
- ✅ View deals
- ✅ Click buttons
- ✅ Sign up / login
- ✅ Make API calls to backend

### **Step 8.3: Check Browser Console (F12)**

Open DevTools → Console

Should show:
```
✓ API calls succeeding
✓ No CORS errors
✓ No 404 errors
```

---

## 🔄 PART 9: AUTO-DEPLOYMENT

### **How It Works:**

Every time you push to GitHub:

```bash
cd ~/path/to/backend
git add .
git commit -m "Add new feature"
git push

# Automatically triggers DigitalOcean deployment!
```

Check: **Deployments** tab in your app to see progress.

---

## ✅ FINAL CHECKLIST:

After following all steps:

- [ ] Backend code pushed to GitHub
- [ ] PostgreSQL database created
- [ ] Backend app created in DigitalOcean
- [ ] All environment variables set (Stripe, SendGrid, JWT, Database URL)
- [ ] Backend deployed and shows "Live"
- [ ] Temporary URL works: `https://travelsmarter-backend-xxxxx.ondigitalocean.app/api/deals`
- [ ] Custom domain added: `api.travelsmarterapp.com`
- [ ] DNS records updated (if needed)
- [ ] Custom domain works: `https://api.travelsmarterapp.com/api/deals`
- [ ] Frontend updated with production API URL
- [ ] Frontend redeployed
- [ ] Frontend can call backend successfully
- [ ] No CORS errors
- [ ] All buttons/APIs working end-to-end

---

## ⏱️ EXPECTED TIMELINE:

| Step | Time |
|------|------|
| Database creation | 5 min |
| Backend app setup | 5 min |
| Deployment | 5 min |
| Domain configuration | 2 min |
| Frontend update | 2 min |
| Frontend redeployment | 5 min |
| Testing | 5 min |
| **Total** | **30 min** |

---

## 🆘 TROUBLESHOOTING:

### **Problem: Build failed**

**Solution:**
1. Check: package.json exists
2. Check: server.js is in root directory
3. Check: Dependencies are listed in package.json
4. Go to **Deployments** → view logs

### **Problem: Database connection error**

**Solution:**
1. Check: DATABASE_URL is correct
2. Check: Region matches (Frankfurt)
3. Check: Connection string has password
4. Database and app must be in same account

### **Problem: CORS errors**

**Solution:**
In your backend `server.js`, add:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://travelsmarterapp.com', 'http://localhost:3000'],
  credentials: true
}));
```

Install CORS:
```bash
npm install cors
```

### **Problem: API returns 404**

**Solution:**
1. Check: Endpoints defined in backend
2. Test: `https://api.domain.com/api/health`
3. Check: Deployment logs for errors

### **Problem: Environment variables not working**

**Solution:**
1. Go to: App Settings → Environment Variables
2. Check: All variables listed
3. Redeploy app (Deployments → Trigger Deploy)

---

## 📚 HELPFUL LINKS:

- DigitalOcean Node.js docs: https://docs.digitalocean.com/products/app-platform/how-to/deploy-nodejs/
- Database connection: https://docs.digitalocean.com/products/databases/postgresql/
- Environment variables: https://docs.digitalocean.com/products/app-platform/references/app-spec/#envs

---

## 💡 PRO TIPS:

1. **Always set NODE_ENV=production** for performance
2. **Use same region for all resources** (database + apps)
3. **Database connection is PRIVATE** - only accessible within DigitalOcean
4. **Check Deployment Logs** if something fails
5. **Stripe/SendGrid keys are sensitive** - keep them private
6. **JWT_SECRET should be long and random** - hackers shouldn't guess it

---

## 🎉 CONGRATULATIONS!

Your backend is now live on DigitalOcean! 🚀

**Next:**
- Monitor your app
- Check Deployments tab for status
- View logs if errors occur
- Make updates and push to GitHub (auto-deploys)

---

**You now have a complete, production-ready TravelSmarter platform!** ✨

Frontend: `https://travelsmarterapp.com`
Backend: `https://api.travelsmarterapp.com`
Database: Private PostgreSQL ✓

