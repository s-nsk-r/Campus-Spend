# 3-Minute Demonstration Video Script

**Course:** BACSE344 — Cloud Infrastructure and Architecture  
**Slot:** C1 Slot | **Faculty:** Dr. P. Anandan  
**Student Name:** Sanskar | **Registration No:** 25BCE5808  
**Project:** CampusSpend — Cloud-Native Student Expense & Budget Management System  
**GitHub Repository:** `https://github.com/s-nsk-r/Campus-Spend`  
**Live Deployed Application:** `https://campus-spend.onrender.com`  

---

### [0:00 - 0:35] Introduction & Problem Statement
> *"Hello everyone and respected faculty Dr. P. Anandan sir. My name is Sanskar, Registration Number 25BCE5808, from the C1 slot.*  
> *Today, I am presenting my Digital Assignment for BACSE344 — Cloud Infrastructure and Architecture.*  
> *The real-world problem we are addressing is **University Student Budget & Expense Management**. College students and hostellers struggle to track volatile daily expenses across food, books, campus travel, utilities, and entertainment. Our solution is **CampusSpend**, a decoupled 3-tier cloud-native web application that allows students to record, manage, and visually analyze their personal finances in real time from any device."*

---

### [0:35 - 1:15] 3-Tier Cloud Architecture & Cloud Services
*(Show the Cloud Architecture Diagram from ARCHITECTURE.md on your screen)*  
> *"Let us examine the Cloud Architecture underpinning CampusSpend:*  
> 1. **Tier 1 — Client Presentation Layer:** A responsive Single Page Application (SPA) designed as an ACRU-inspired fintech Bento Grid, supporting seamless Dark and Light themes and asynchronous JSON communication.  
> 2. **Tier 2 — PaaS Application Layer:** A high-performance stateless RESTful backend built with **FastAPI** on Python 3.13, hosted on **Render.com** (Cloud PaaS) with automated continuous deployment from GitHub and zero-downtime rolling updates.  
> 3. **Tier 3 — DBaaS Data Layer:** A managed cloud **PostgreSQL database on Neon.tech**, connected securely over encrypted TLS with PgBouncer connection pooling and an automated connection-resilience fallback.  
> 4. **API Engine:** Strict RESTful standards validated with Pydantic schemas and auto-documented interactive Swagger UI at `/docs`."*

---

### [1:15 - 2:25] Live Application Demo & Full CRUD Workflows
*(Switch browser tab to the live deployed application `https://campus-spend.onrender.com`)*  
> *"Now let's demonstrate the live deployed application:*  
> - **DASHBOARD OVERVIEW:** *On our live dashboard, we see our monthly spend, dynamic budget limits, and our 7-category daily stacked bar chart with 1px hairline dividers and clean borderless baselines.*  
> - **CREATE (C in CRUD):** *Let's add a new expense. I'll click 'Add Expense', enter 'Cloud Computing Lab Component Kit', amount ₹850, category 'Academics & Books', payment method 'UPI', and click Save. Notice the instant toast notification, and our total monthly spend updates immediately in the cloud database.*  
> - **READ & FILTER (R in CRUD):** *Switching to the Transactions tab, we can filter by category or use the live search bar to search 'Lab' to instantaneously isolate matching records.*  
> - **UPDATE (U in CRUD):** *Let's edit this record. I'll click Edit, change the amount to ₹900, and save. The record updates in PostgreSQL, recalculating our total spend and category breakdown in real time.*  
> - **DELETE (D in CRUD):** *To delete an expense, clicking the trash icon opens a confirmation modal. Confirming permanently deletes the entry from our Cloud PostgreSQL database.*  
> - **BUDGET & HEALTH:** *In the Budget view, notice how our category budgets scale dynamically based on our monthly ceiling, and the Financial Health gauge tracks our exact budget-used percentage in real time."*

---

### [2:25 - 2:50] Swagger API Docs & Cloud Health Probe
*(Switch tab to `https://campus-spend.onrender.com/docs`)*  
> *"Next, let's inspect our REST API documentation. Navigating to `/docs`, FastAPI provides interactive Swagger documentation. We can test our CRUD endpoints: POST, GET, PUT, and DELETE, our aggregated analytics endpoint `/api/summary/stats`, and our cloud load-balancer health probe `/health` directly from the browser."*

---

### [2:50 - 3:00] Conclusion
> *"In summary, CampusSpend fulfills every requirement of BACSE344: delivering complete CRUD operations, cloud database integration, RESTful API architecture, and automated PaaS deployment. Thank you!"*
