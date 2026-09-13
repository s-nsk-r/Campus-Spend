# Cloud Infrastructure & System Architecture

**Course:** BACSE344 - Cloud Infrastructure and Architecture  
**Project:** CampusSpend - Cloud-Native Student Expense & Budget Tracker  
**Faculty:** Dr. P. Anandan | Slot: C1  

---

## 1. Architectural Overview

CampusSpend is designed following a modern **3-Tier Cloud Architecture** that separates the presentation, application logic, and persistent storage into distinct cloud-managed layers. This decoupling enables horizontal scaling, high availability, stateless compute execution, and security isolation.

```mermaid
graph TD
    subgraph Client Tier
        UserBrowser["Student Client Devices<br/>(Laptops, Tablets, Smartphones)<br/>SPA UI (HTML5 / TailwindCSS / JS)"]
    end

    subgraph Cloud PaaS Tier (Render.com)
        CDN["Global CDN / Edge DNS & TLS Router<br/>(HTTPS / SSL Termination)"]
        AppInstance["FastAPI Web Service<br/>(Python 3.13 ASGI Engine - Uvicorn)<br/>Stateless REST API Engine"]
        SwaggerDocs["OpenAPI / Swagger UI Engine<br/>(/docs & /redoc)"]
        
        CDN --> AppInstance
        AppInstance --- SwaggerDocs
    end

    subgraph Cloud DBaaS Tier (Neon.tech / PostgreSQL)
        ConnPool["PgBouncer Connection Pooler<br/>(TLS Encrypted Channel)"]
        PostgresEngine[("Managed PostgreSQL Cluster<br/>(Automated Backups & Storage Replication)")]
        
        ConnPool --> PostgresEngine
    end

    UserBrowser -->|HTTPS JSON REST Requests| CDN
    AppInstance -->|Encrypted SSL Database Connection| ConnPool
```

---

## 2. Cloud Tier Breakdown

### Tier 1: Client Tier (Presentation)
- **Interface:** Modern Single Page Application (SPA) style web interface.
- **Technologies:** Semantic HTML5, Tailwind CSS, FontAwesome, Chart.js, and Vanilla JavaScript.
- **Communication:** Asynchronous non-blocking HTTP requests using the browser `fetch()` API against backend REST endpoints.
- **Responsiveness:** Fluid grid layout optimized for mobile screens and desktop monitors.

### Tier 2: Application Tier (PaaS - Platform as a Service)
- **Cloud Provider:** **Render.com** (Cloud Web Service).
- **Backend Framework:** **FastAPI** on **Python 3.13** running under the high-performance **Uvicorn** ASGI web server.
- **Stateless Architecture:** The application server maintains zero session state in local memory. All state is maintained in the decoupled database layer, allowing seamless autoscaling and zero-downtime rolling deployments.
- **Data Validation:** Strict schema enforcement using **Pydantic v2** models, preventing malformed payload injection.
- **Auto-Documentation:** Generates interactive OpenAPI specifications accessible via `/docs`.

### Tier 3: Data Tier (DBaaS - Database as a Service)
- **Cloud Provider:** **Neon.tech / Supabase** (Managed Cloud PostgreSQL).
- **Connection Security:** Forced SSL/TLS encrypted transport (`sslmode=require`).
- **ORM & Connection Pooling:** **SQLAlchemy 2.0** connection manager with pre-ping validation (`pool_pre_ping=True`) and active connection reuse.
- **Reliability:** Managed automated point-in-time recovery, daily backups, and storage-compute separation.

---

## 3. Cloud Characteristics & Best Practices Demonstrated

1. **Decoupled Architecture:** Separation of static asset delivery, business compute, and relational storage.
2. **Environment Parameterization:** Database credentials and deployment ports are injected via runtime environment variables (`DATABASE_URL`, `PORT`), following **12-Factor App methodology**.
3. **Continuous Deployment (CI/CD):** Integration between the GitHub version control repository and Render PaaS triggers automated builds upon every `git push`.
4. **Resilience & Health Probes:** A dedicated `/health` endpoint allows cloud orchestrators and load balancers to monitor container health and automatically restart unhealthy instances.
