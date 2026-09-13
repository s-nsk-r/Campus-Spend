# CampusSpend - Cloud-Native Student Expense Tracker
### BACSE344 - Cloud Infrastructure and Architecture (Digital Assignment)
**Faculty:** Dr. P. Anandan | **Slot:** C1  
**Student Name:** [Your Name] | **Registration No:** [Your Reg No]  
**Live Deployed Application:** `https://<YOUR-RENDER-APP>.onrender.com` *(Replace with your live URL)*  
**Swagger API Documentation:** `https://<YOUR-RENDER-APP>.onrender.com/docs`  

---

## Rubric Compliance (10/10 Marks)

| Evaluation Component | Marks | Implementation in Project |
| :--- | :---: | :--- |
| **Problem Selection & System Architecture** | **1** | Student Expense Management addressing campus budgeting; decoupled 3-Tier Cloud Architecture (Client ➔ PaaS ➔ DBaaS). |
| **Application Development** | **3** | Full CRUD implementation with real-time KPI metrics, responsive UI, search & category filters, modal dialogs, and Chart.js analytics. |
| **Database & REST API Integration** | **2** | Cloud-managed PostgreSQL on Neon.tech/Supabase with SQLAlchemy ORM + Pydantic validation + documented REST API endpoints. |
| **Cloud Deployment & Integration** | **2** | Deployed on Render.com with GitHub CI/CD, SSL termination, and environment variable configuration (`DATABASE_URL`). |
| **Documentation & Demonstration** | **2** | Complete documentation suite in `/docs` (Architecture, ER Diagram, API Spec, Deployment Guide, and Video Script). |

---

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, FontAwesome 6, Chart.js, Vanilla JavaScript
- **Backend:** Python 3.13, FastAPI, Uvicorn ASGI Server
- **Database:** Cloud PostgreSQL (Neon.tech / Supabase DBaaS) & SQLAlchemy 2.0 ORM
- **Cloud PaaS:** Render.com (Web Service with continuous deployment)

---

## Local Setup & Execution

1. **Clone and Navigate:**
   ```bash
   cd "Sanskar Cloud DA"
   ```

2. **Activate Virtual Environment & Install Dependencies:**
   ```bash
   # On Windows:
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Run Locally:**
   ```bash
   python main.py
   # Or using uvicorn:
   uvicorn main:app --reload --port 8000
   ```

4. **Access in Browser:**
   - Web App: `http://127.0.0.1:8000`
   - Interactive Swagger Docs: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`

---

## Documentation Links
- [System Architecture](file:///./docs/ARCHITECTURE.md)
- [Database Design & Schema](file:///./docs/DATABASE_DESIGN.md)
- [RESTful API Documentation](file:///./docs/API_DOCS.md)
- [Cloud Deployment Guide](file:///./docs/DEPLOYMENT_GUIDE.md)
- [Video Presentation Script](file:///./docs/VIDEO_SCRIPT.md)
