# CampusSpend

A cloud-native expense tracking web application built for university students.

**Live App:** https://campus-spend.onrender.com

---

## About

CampusSpend helps students log and monitor their daily campus expenses across categories like food, academics, transport, and accommodation. It features a clean bento-style dashboard, real-time spending analytics, and a monthly budget tracker — all backed by a serverless PostgreSQL database in the cloud.

---

## Architecture

The application follows a three-tier cloud architecture:

```
Client (Browser SPA)
        |
        | HTTPS / REST
        v
Render.com  —  FastAPI + Python 3.13 (PaaS)
        |
        | SQLAlchemy / TLS
        v
Neon.tech  —  Serverless PostgreSQL (DBaaS)
```

- **Presentation** — Vanilla HTML, CSS, and JavaScript with Chart.js for visualisations
- **Application** — FastAPI running on Uvicorn; stateless REST endpoints with Pydantic validation
- **Data** — Managed PostgreSQL on Neon with connection pooling and automatic backups

---

## Features

- Dashboard with total spend, savings, and budget utilisation at a glance
- Full CRUD — add, view, edit, and delete expense records
- Category-based budget limits that scale with your monthly total
- Analytics view with a spending doughnut chart and stacked category bar
- Dark mode by default, with a clean light mode toggle
- Responsive layout that works on mobile and desktop

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Front-end  | HTML5, CSS3, JavaScript       |
| Charts     | Chart.js v4                   |
| Back-end   | FastAPI 0.141+, Uvicorn       |
| ORM        | SQLAlchemy 2.0                |
| Validation | Pydantic v2                   |
| Database   | PostgreSQL via Neon.tech      |
| Hosting    | Render.com (Web Service)      |

---

## Local Setup

**Prerequisites:** Python 3.10+, Git

```bash
# 1. Clone the repo
git clone https://github.com/s-nsk-r/Campus-Spend.git
cd Campus-Spend

# 2. Create and activate a virtual environment
python -m venv venv
# Windows
.\venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set your database URL
# Create a .env file or set the environment variable:
# DATABASE_URL=postgresql://...

# 5. Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000 in your browser.

---

## API Reference

| Method   | Endpoint              | Description                          |
|----------|-----------------------|--------------------------------------|
| GET      | /api/expenses         | List all expenses (supports filters) |
| POST     | /api/expenses         | Create a new expense                 |
| GET      | /api/expenses/{id}    | Get a single expense by ID           |
| PUT      | /api/expenses/{id}    | Update an existing expense           |
| DELETE   | /api/expenses/{id}    | Delete an expense                    |
| GET      | /api/summary/stats    | Aggregated spending statistics       |
| GET      | /health               | Service health check                 |

Full interactive docs available at `/docs` (Swagger UI) and `/redoc` (ReDoc).

---

## Running Tests

```bash
python test_app.py
```

The test suite covers all CRUD operations, analytics endpoints, and UI rendering. All 11 tests pass against the live cloud environment.

---

## Deployment

The app is deployed as a Web Service on **Render.com**, connected to a **Neon.tech** PostgreSQL database. The `DATABASE_URL` is stored as a secure environment variable in Render — no credentials are committed to the repository.

Every push to the `main` branch triggers an automatic redeploy via Render's built-in CI/CD pipeline.
