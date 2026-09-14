# Cloud Deployment Guide: Render.com & Neon.tech DBaaS

**Course:** BACSE344 — Cloud Infrastructure and Architecture  
**Slot:** C1 Slot | **Faculty:** Dr. P. Anandan  
**Student Name:** Sanskar | **Registration No:** 25BCE5808  
**Application:** CampusSpend  
**Live Application:** `https://campus-spend.onrender.com`  

This guide provides step-by-step instructions to deploy CampusSpend to production on the cloud for **100% free with zero credit card required**.

---

## Step 1: Create Free Cloud PostgreSQL Database (Neon.tech)

1. Open **[https://neon.tech](https://neon.tech)** and sign up using your GitHub or Google account.
2. Click **Create Project**, give it a name (e.g. `campus-spend-db`), and select the region closest to you (e.g. `AWS Asia Pacific (Singapore)` or `AWS US East`).
3. Neon will display your **Connection Details**.
4. Copy the **Connection string** (it looks like `postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`).
5. *Save this connection string for Step 3.*

---

## Step 2: Push Code to GitHub

1. Open your terminal in this project folder (`Sanskar Cloud DA`):
   ```bash
   git init
   git add .
   git commit -m "Initial commit for BACSE344 Cloud DA"
   ```
2. Create a new repository on **[https://github.com](https://github.com)** named `campus-spend-cloud`.
3. Link your remote repository and push:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/campus-spend-cloud.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy on Render.com (Free PaaS)

1. Open **[https://render.com](https://render.com)** and sign in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Select your repository `campus-spend-cloud`.
4. Configure the settings:
   - **Name:** `campus-spend` (or any unique name)
   - **Region:** Singapore / Oregon / Frankfurt
   - **Branch:** `main`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. Scroll down to **Environment Variables** and click **Add Environment Variable**:
   - **Key:** `DATABASE_URL`
   - **Value:** Paste your Neon PostgreSQL connection string from Step 1.
6. Click **Create Web Service**.
7. Render will build and deploy your application in ~2 minutes! Once completed, you will receive a public HTTPS URL (e.g. `https://campus-spend.onrender.com`).

---

## Step 4: Verification

1. Open `https://campus-spend.onrender.com` in your browser.
2. Click **Seed Demo Data** to populate initial records.
3. Open `https://campus-spend.onrender.com/docs` to verify interactive Swagger API docs.
4. Perform CRUD tests (Add, Edit, Delete).
