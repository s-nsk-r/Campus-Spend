# 3-Minute Demonstration Video Script

**Course:** BACSE344 - Cloud Infrastructure and Architecture  
**Slot:** C1 Slot | **Faculty:** Dr. P. Anandan  
**Student Name:** [Your Name] | **Registration No:** [Your Reg No]  
**Project:** CampusSpend - Cloud-Native Student Expense & Budget Management System  

---

### [0:00 - 0:30] Introduction & Problem Statement
> *"Hello everyone and respected faculty Dr. P. Anandan sir. My name is [Your Name], Registration Number [Your Reg No], from the C1 slot.*  
> *Today, I am presenting my Digital Assignment for BACSE344 - Cloud Infrastructure and Architecture.*  
> *The problem we are addressing is **Student Budget & Expense Management**. College and hostel students often struggle to track daily spending across food, academics, travel, and housing. Our solution is **CampusSpend**, a 3-tier cloud-native web application that allows students to record, analyze, and manage expenses seamlessly from any device."*

---

### [0:30 - 1:10] Cloud Architecture & Technologies
*(Show the Architecture Diagram from ARCHITECTURE.md on your screen)*  
> *"Let us review the Cloud Infrastructure and Architecture:*  
> 1. **Client Tier:** A responsive Single Page Application built with HTML5, Tailwind CSS, and asynchronous JavaScript `fetch()` APIs.  
> 2. **PaaS Application Tier:** A stateless RESTful backend built with **FastAPI** on Python 3.13, hosted as a cloud web service on **Render.com** with automatic CI/CD deployment from GitHub.  
> 3. **DBaaS Data Tier:** A cloud-managed **PostgreSQL database hosted on Neon.tech**, connected securely over encrypted TLS/SSL with connection pooling.  
> 4. **API Standards:** Built strictly following RESTful principles with OpenAPI / Swagger documentation automatically generated at `/docs`."*

---

### [1:10 - 2:20] Live Application Demo & Full CRUD Operations
*(Switch tab to your live Render URL `https://your-app.onrender.com`)*  
> *"Now let's demonstrate the live deployed application:*  
> - *Here on our live Render URL, we see real-time KPI metrics: Total Spent, Total Records, and Highest Single Expense, along with a category distribution chart powered by our backend aggregation API.*  
> - **CREATE:** *Let's add a new expense. I'll click 'Add New Expense', enter 'Cloud Computing Textbook', amount ₹650, category 'Academics & Books', method 'UPI', and click Save. Notice the instant toast notification and the table updates immediately.*  
> - **READ & FILTER:** *We can filter by category or search 'Textbook' in the search bar to filter records instantaneously.*  
> - **UPDATE:** *Let's edit this record. I'll change the amount to ₹700 and update the notes. The cloud database updates and recalculates our total spend metrics in real time.*  
> - **DELETE:** *Let's delete an entry. Clicking delete brings up a confirmation modal, and confirming removes it permanently from our Cloud PostgreSQL database."*

---

### [2:20 - 2:50] Swagger API Documentation & Cloud Health Check
*(Switch tab to `https://your-app.onrender.com/docs`)*  
> *"Next, let's examine our API Documentation. Navigating to `/docs`, FastAPI provides full interactive Swagger documentation. We can test our CRUD endpoints: POST, GET, PUT, and DELETE, as well as our analytical `/api/summary/stats` and cloud load balancer `/health` check endpoints directly from the browser."*

---

### [2:50 - 3:00] Conclusion
> *"In conclusion, CampusSpend successfully demonstrates complete CRUD functionality, cloud database integration, RESTful API architecture, and production cloud deployment on PaaS. Thank you!"*
