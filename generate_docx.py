"""
Script to generate the comprehensive BACSE344 Digital Assignment Word Document (.docx).
"""
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_report():
    doc = docx.Document()

    # Page Margins: 1 inch on all sides
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Color Palette
    PRIMARY = RGBColor(16, 124, 65)      # Deep Emerald Green
    SECONDARY = RGBColor(33, 37, 41)     # Dark Slate
    MUTED = RGBColor(108, 117, 125)      # Cool Grey
    CODE_BG = "F4F5F7"
    HEADER_BG = "E8F5E9"

    # Style: Default Body
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = SECONDARY
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)

    # ==========================================
    # Title & Header Block
    # ==========================================
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_after = Pt(2)
    title_p.paragraph_format.space_before = Pt(0)
    run_t = title_p.add_run("BACSE344 — Cloud Infrastructure and Architecture")
    run_t.font.size = Pt(22)
    run_t.font.bold = True
    run_t.font.color.rgb = PRIMARY

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(14)
    run_sub = sub_p.add_run("Digital Assignment (C1 Slot) — Comprehensive Project Report")
    run_sub.font.size = Pt(14)
    run_sub.font.bold = True
    run_sub.font.color.rgb = MUTED

    # Meta Info Card / Table
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Course Faculty:", "Dr. P. Anandan"),
        ("Student Name:", "Sanskar"),
        ("Registration Number:", "25BCE5808"),
        ("Project Title:", "CampusSpend — Cloud-Native Student Expense & Budget Tracker"),
        ("Academic Slot & Year:", "C1 Slot | Academic Year 2025–2026")
    ]
    for idx, (label, val) in enumerate(meta_data):
        row = meta_table.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.2)
        c1.width = Inches(4.3)
        set_cell_background(c0, "F8F9FA")
        set_cell_background(c1, "FFFFFF")
        set_cell_margins(c0, top=80, bottom=80, left=120, right=120)
        set_cell_margins(c1, top=80, bottom=80, left=120, right=120)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.font.bold = True
        r0.font.size = Pt(10)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.size = Pt(10)
        if label == "Registration Number:":
            r1.font.bold = True
            r1.font.color.rgb = PRIMARY

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Deliverables & Links Table
    link_table = doc.add_table(rows=4, cols=2)
    link_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    links = [
        ("Source Code (GitHub):", "https://github.com/s-nsk-r/Campus-Spend"),
        ("Production URL (Render PaaS):", "https://campus-spend.onrender.com"),
        ("Interactive Swagger Docs:", "https://campus-spend.onrender.com/docs"),
        ("Video Demonstration:", "[Insert Video Link Here — YouTube / Google Drive]")
    ]
    for idx, (label, val) in enumerate(links):
        row = link_table.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width = Inches(2.5)
        c1.width = Inches(4.0)
        set_cell_background(c0, HEADER_BG)
        set_cell_background(c1, "F8F9FA")
        set_cell_margins(c0, top=70, bottom=70, left=120, right=120)
        set_cell_margins(c1, top=70, bottom=70, left=120, right=120)

        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.font.bold = True
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = PRIMARY

        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.size = Pt(9.5)
        r1.font.name = 'Consolas'

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # Helper: Add Section Header
    def add_section_header(num, title):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(f"Section {num}: {title}")
        r.font.size = Pt(14)
        r.font.bold = True
        r.font.color.rgb = PRIMARY
        # Add horizontal divider
        return p

    def add_subheading(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = SECONDARY
        return p

    def add_code_block(code_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.left_indent = Inches(0.25)
        r = p.add_run(code_text)
        r.font.name = 'Consolas'
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(30, 41, 59)

    # ==========================================
    # Section 1: Problem Selection & System Architecture
    # ==========================================
    add_section_header("1", "Problem Selection & System Architecture")

    add_subheading("1.1 Real-World Problem Identification")
    doc.add_paragraph(
        "University students, especially hostellers, face recurring challenges in tracking daily personal expenditures. "
        "With multiple daily micro-transactions (campus mess, books, transit, stationery, internet subscriptions, and snacks), "
        "students typically scatter expenses across cash, UPI, and cards without unified tracking. Commercial personal finance apps "
        "are often cluttered with ads, credit score marketing, and banking integrations that fail to provide student-tailored budget "
        "allocation and real-time spending velocity."
    )
    doc.add_paragraph(
        "CampusSpend addresses this challenge by providing a lightweight, cloud-native expense management application engineered "
        "specifically for university students. It combines real-time budget scaling, multi-category expenditure tracking, and visual "
        "health diagnostics accessible across mobile, tablet, and desktop environments."
    )

    add_subheading("1.2 3-Tier Cloud Architecture Model")
    doc.add_paragraph(
        "CampusSpend is engineered following the 3-Tier Cloud Architecture pattern to ensure strict separation of concerns, "
        "fault isolation, and independent scalability:"
    )
    doc.add_paragraph(
        "• Tier 1 — Client Presentation Layer: A responsive Single Page Application (SPA) delivered via semantic HTML5, "
        "custom CSS design tokens, and vanilla JavaScript. Communicates asynchronously via HTTP REST requests (JSON) using the "
        "browser fetch() API, ensuring zero full-page reloads and sub-second UI updates.\n"
        "• Tier 2 — Cloud Application Layer (PaaS): Powered by FastAPI on Python 3.13 running under the asynchronous Uvicorn ASGI server, "
        "hosted as a containerized web service on Render.com. Implements stateless compute execution, strict Pydantic v2 data validation, "
        "and automated OpenAPI documentation generation at /docs.\n"
        "• Tier 3 — Cloud Database Layer (DBaaS): A managed serverless PostgreSQL 16 cluster hosted on Neon.tech. Features PgBouncer connection "
        "pooling (-pooler endpoint), enforced SSL/TLS transport encryption, automated cloud backups, and a connection-timeout fallback mechanism."
    )

    add_subheading("1.3 Cloud Services Catalog")
    srv_table = doc.add_table(rows=5, cols=3)
    srv_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Architecture Tier", "Cloud Service / Technology", "Primary Cloud Role & Function"]
    for i, h in enumerate(headers):
        cell = srv_table.rows[0].cells[i]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = PRIMARY

    srv_rows = [
        ("Presentation Layer", "Client Browsers / Mobile", "Cross-device responsive UI with real-time Chart.js visual analytics"),
        ("Compute Layer (PaaS)", "Render.com Web Service", "Stateless Python 3.13 runtime with automated GitHub CI/CD and SSL termination"),
        ("Database Layer (DBaaS)", "Neon.tech Serverless PostgreSQL", "Encrypted relational persistence with PgBouncer connection pooling"),
        ("Edge & DNS Router", "Cloudflare / Render CDN Edge", "Global edge DNS routing, TLS 1.3 encryption, and DDoS mitigation")
    ]
    for row_idx, data in enumerate(srv_rows, start=1):
        row = srv_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            if row_idx % 2 == 0:
                set_cell_background(cell, "F8F9FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9.5)

    add_subheading("1.4 Cloud Computing Principles Demonstrated")
    doc.add_paragraph(
        "1. Stateless Compute Execution: The FastAPI container maintains zero state in memory or local disk. All persistence resides in "
        "the decoupled Neon database, enabling seamless container teardowns, rolling updates, and horizontal auto-scaling without session loss.\n"
        "2. 12-Factor App Compliance: All configuration and credentials (database connection strings, port bindings, runtime version) are injected "
        "dynamically via cloud environment variables (DATABASE_URL, PORT, PYTHON_VERSION).\n"
        "3. High Availability & Connection Pooling: Neon's PgBouncer pooler efficiently multiplexes client connections, protecting against "
        "connection exhaustion in high-concurrency cloud environments.\n"
        "4. Health Probes & Self-Healing: The dedicated /health endpoint enables cloud load balancers and orchestrators to continuously monitor "
        "container availability and restart failing instances automatically."
    )

    # ==========================================
    # Section 2: Application Development & Full CRUD Implementation
    # ==========================================
    add_section_header("2", "Application Development & Full CRUD Implementation")

    add_subheading("2.1 Modern Fintech Bento Grid Dashboard")
    doc.add_paragraph(
        "CampusSpend's frontend was engineered with a modern fintech Bento Grid aesthetic inspired by institutional financial platforms: "
        "• Balance Hero Card: Displays total monthly spend, active budget limit, remaining balance, and live savings rate.\n"
        "• 7-Category Stacked Bar Graph: Tracks daily spending across all 7 student categories (Food & Dining, Academics & Books, "
        "Transportation, Hostel & Utilities, Entertainment, Healthcare, Others). Engineered with custom 1px hairline category dividers "
        "and zero baseline or top lines for razor-sharp visual clarity.\n"
        "• Dynamic Category Budget Scaling: Category budget limits automatically recalculate and scale proportionally whenever the overall "
        "monthly spending limit ceiling is adjusted by the user.\n"
        "• Financial Health Radial Gauge: Visualizes the Budget Used percentage in real time. Features clean green-to-red alert thresholds: "
        "remains vibrant lime-green under budget, switching to solid red when 100% is exceeded, with remaining budget shown in neutral grey.\n"
        "• Segmented Cost Analysis Bar: A level, uncrooked segmented pill bar with crisp 2px slice spacing providing an instant visual category breakdown.\n"
        "• Dual-Theme Engine: Full support for Dark Mode (deep black surfaces #111114 with lime accents) and Light Mode (crisp white surfaces with signature lime-green branding).\n"
        "• Sleek Custom Scrollbars: Replaces bulky browser scrollbars with custom ultra-thin sliders."
    )

    add_subheading("2.2 Complete CRUD Operations Implementation")
    crud_table = doc.add_table(rows=5, cols=3)
    crud_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    crud_headers = ["CRUD Operation", "User Workflow & UI Trigger", "Cloud & Database Execution"]
    for i, h in enumerate(crud_headers):
        cell = crud_table.rows[0].cells[i]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = PRIMARY

    crud_data = [
        ("CREATE (C)", "Student clicks '+ Add Expense', fills modal form (title, amount, category, payment method, date, notes) and clicks Save.",
         "POST /api/expenses with JSON payload. Validated via Pydantic ExpenseCreate schema; committed to Neon PostgreSQL; UI updates live with toast notification."),
        ("READ (R)", "Recent transactions stream on dashboard; full interactive table on Transactions tab; analytics breakdowns in Analytics/Budget tabs.",
         "GET /api/expenses with optional ?search=, ?category=, and ?payment_method= query filters. Ordered chronologically by expense_date DESC."),
        ("UPDATE (U)", "Clicking the Edit button opens modal pre-filled with existing record; user edits amount, notes, or category and saves.",
         "PUT /api/expenses/{id} with updated fields. Database updates row and returns refreshed entity; dashboard KPIs, charts, and health gauge instantly recalculate."),
        ("DELETE (D)", "Clicking trash icon opens destructive confirmation modal; confirming permanently removes the expense.",
         "DELETE /api/expenses/{id}. SQLAlchemy issues DELETE query; returns 200 OK with deleted ID; table row animates out and totals refresh live.")
    ]
    for row_idx, data in enumerate(crud_data, start=1):
        row = crud_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            if row_idx % 2 == 0:
                set_cell_background(cell, "F8F9FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9.5)
            if col_idx == 0:
                r.font.bold = True

    # ==========================================
    # Section 3: Cloud Database & REST API Integration
    # ==========================================
    add_section_header("3", "Cloud Database & REST API Integration")

    add_subheading("3.1 Cloud Database Architecture (Neon.tech PostgreSQL)")
    doc.add_paragraph(
        "CampusSpend integrates with Neon.tech, a serverless PostgreSQL database built on a modern architecture that separates "
        "compute and storage. Key architectural benefits include:\n"
        "• Transport Security: Mandatory SSL/TLS encryption (sslmode=require) across all client connections.\n"
        "• PgBouncer Connection Pooling: Uses the -pooler connection proxy with pool_size=10 and max_overflow=20 to handle bursty student traffic.\n"
        "• Resilience Fallback: database.py includes a 3-second connection timeout probe with automatic SQLite fallback for offline development."
    )

    add_subheading("3.2 Table Schema & Data Dictionary (expenses)")
    dd_table = doc.add_table(rows=9, cols=5)
    dd_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    dd_headers = ["Column", "Data Type", "Constraints", "Default", "Description"]
    for i, h in enumerate(dd_headers):
        cell = dd_table.rows[0].cells[i]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = PRIMARY

    dd_rows = [
        ("id", "INTEGER / SERIAL", "PRIMARY KEY, NOT NULL", "Auto-increment", "Unique record identifier"),
        ("title", "VARCHAR(100)", "NOT NULL, INDEXED", "None", "Title / subject of the expense"),
        ("amount", "NUMERIC(10,2)", "NOT NULL, CHECK (amount > 0)", "None", "Expense amount in INR (₹)"),
        ("category", "VARCHAR(50)", "NOT NULL, INDEXED", "None", "One of 7 campus categories"),
        ("payment_method", "VARCHAR(50)", "NOT NULL", "'UPI'", "UPI, Cash, Debit Card, Net Banking"),
        ("expense_date", "DATE", "NOT NULL, INDEXED", "CURRENT_DATE", "Date transaction occurred"),
        ("notes", "TEXT", "NULLABLE", "NULL", "Optional remarks or vendor details"),
        ("created_at", "TIMESTAMPTZ", "NOT NULL", "CURRENT_TIMESTAMP", "Cloud audit timestamp in UTC")
    ]
    for row_idx, data in enumerate(dd_rows, start=1):
        row = dd_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            if row_idx % 2 == 0:
                set_cell_background(cell, "F8F9FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9)
            if col_idx == 0:
                r.font.bold = True
                r.font.name = 'Consolas'

    add_subheading("3.3 Production SQL DDL & Performance Indexes")
    ddl_code = (
        "CREATE TABLE IF NOT EXISTS expenses (\n"
        "    id SERIAL PRIMARY KEY,\n"
        "    title VARCHAR(100) NOT NULL,\n"
        "    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),\n"
        "    category VARCHAR(50) NOT NULL,\n"
        "    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',\n"
        "    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,\n"
        "    notes TEXT,\n"
        "    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n"
        ");\n\n"
        "-- B-Tree Indexes for High-Speed Filtering & Sorting\n"
        "CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);\n"
        "CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);\n"
        "CREATE INDEX IF NOT EXISTS idx_expenses_title ON expenses(title);"
    )
    add_code_block(ddl_code)

    add_subheading("3.4 RESTful API Endpoints Specification")
    api_table = doc.add_table(rows=10, cols=4)
    api_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    api_headers = ["Verb", "Endpoint Path", "Function / Role", "HTTP Status"]
    for i, h in enumerate(api_headers):
        cell = api_table.rows[0].cells[i]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = PRIMARY

    api_rows = [
        ("GET", "/health", "Cloud health check probe for load balancers", "200 OK"),
        ("GET", "/", "Delivers responsive HTML5 Bento Dashboard", "200 OK"),
        ("GET", "/api/expenses", "List expenses (supports search, category, method filters)", "200 OK"),
        ("POST", "/api/expenses", "Create new student expense record", "201 Created"),
        ("GET", "/api/expenses/{id}", "Fetch full details of an expense by ID", "200 OK / 404"),
        ("PUT", "/api/expenses/{id}", "Update fields of an existing expense record", "200 OK / 404"),
        ("DELETE", "/api/expenses/{id}", "Permanently delete an expense record", "200 OK / 404"),
        ("GET", "/api/summary/stats", "Compute real-time KPI totals and category breakdowns", "200 OK"),
        ("POST", "/api/seed", "Seed realistic sample records for demonstration", "200 OK")
    ]
    for row_idx, data in enumerate(api_rows, start=1):
        row = api_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            if row_idx % 2 == 0:
                set_cell_background(cell, "F8F9FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9)
            if col_idx == 0:
                r.font.bold = True
                r.font.name = 'Consolas'
                if text == "POST": r.font.color.rgb = RGBColor(16, 124, 65)
                elif text == "GET": r.font.color.rgb = RGBColor(13, 110, 253)
                elif text == "PUT": r.font.color.rgb = RGBColor(217, 119, 6)
                elif text == "DELETE": r.font.color.rgb = RGBColor(220, 38, 38)
            elif col_idx == 1:
                r.font.name = 'Consolas'

    # ==========================================
    # Section 4: Cloud Deployment & Integration
    # ==========================================
    add_section_header("4", "Cloud Deployment & Integration")

    add_subheading("4.1 Cloud PaaS Deployment (Render.com)")
    doc.add_paragraph(
        "CampusSpend is deployed to production on Render.com as a containerized web service. "
        "The deployment pipeline integrates directly with GitHub for automated Continuous Deployment (CI/CD). "
        "Every push to the main branch automatically triggers a build, runs dependency installation, validates environment "
        "variables, and performs a zero-downtime rolling restart."
    )

    add_subheading("4.2 Infrastructure as Code (render.yaml)")
    iac_code = (
        "services:\n"
        "  - type: web\n"
        "    name: campus-spend-cloud\n"
        "    env: python\n"
        "    buildCommand: pip install -r requirements.txt\n"
        "    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT\n"
        "    envVars:\n"
        "      - key: PYTHON_VERSION\n"
        "        value: 3.13.1\n"
        "      - key: DATABASE_URL\n"
        "        sync: false"
    )
    add_code_block(iac_code)

    add_subheading("4.3 Cloud Security & Parameterization")
    doc.add_paragraph(
        "• Transport Layer Security: Automated SSL/TLS 1.3 certificates provisioned and managed by Let's Encrypt at the Render edge.\n"
        "• Zero Hardcoded Credentials: All database credentials, ports, and secret configurations are securely stored as cloud "
        "environment variables in the Render PaaS dashboard.\n"
        "• Database Encryption: Neon PostgreSQL enforces encrypted communication via SSL mode required."
    )

    # ==========================================
    # Section 5: Documentation & Demonstration
    # ==========================================
    add_section_header("5", "Documentation & Demonstration")

    add_subheading("5.1 3-Minute Demonstration Video Script")
    doc.add_paragraph(
        "Below is the structured transcript and timing sequence for the video presentation:"
    )
    script_table = doc.add_table(rows=6, cols=3)
    script_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sc_headers = ["Timestamp", "Presentation Section", "Demonstration Narration & Screen Actions"]
    for i, h in enumerate(sc_headers):
        cell = script_table.rows[0].cells[i]
        set_cell_background(cell, HEADER_BG)
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.font.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = PRIMARY

    script_rows = [
        ("0:00 – 0:35", "Intro & Problem Statement", "Introduce self: Sanskar, Reg: 25BCE5808, Slot C1, Dr. P. Anandan. Explain the student budgeting problem and overview of CampusSpend."),
        ("0:35 – 1:15", "3-Tier Cloud Architecture", "Display Cloud Architecture diagram. Explain Tier 1 Client SPA, Tier 2 FastAPI PaaS on Render, Tier 3 Neon PostgreSQL DBaaS with PgBouncer."),
        ("1:15 – 2:25", "Live CRUD Demo on Render", "Switch to live Render URL. Demonstrate CREATE (Add Expense modal), READ (Filtering & Search), UPDATE (Edit amount), and DELETE (Confirm modal). Highlight dynamic budget scaling, 1px dividers, and budget-used health gauge."),
        ("2:25 – 2:50", "Interactive Swagger Docs", "Switch to /docs. Show interactive OpenAPI Swagger UI. Execute /api/summary/stats and demonstrate the /health load balancer probe."),
        ("2:50 – 3:00", "Conclusion", "Summarize cloud concepts applied (statelessness, DBaaS, PaaS, CI/CD) and conclude presentation.")
    ]
    for row_idx, data in enumerate(script_rows, start=1):
        row = script_table.rows[row_idx]
        for col_idx, text in enumerate(data):
            cell = row.cells[col_idx]
            set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
            if row_idx % 2 == 0:
                set_cell_background(cell, "F8F9FA")
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(text)
            r.font.size = Pt(9)
            if col_idx == 0:
                r.font.bold = True
                r.font.name = 'Consolas'

    add_subheading("5.2 Automated Testing & Verification Evidence")
    doc.add_paragraph(
        "The application includes an automated test suite (test_app.py) validating all 11 core system functions:"
    )
    test_log = (
        "==========================================\n"
        "Testing CampusSpend Cloud REST API & CRUD\n"
        "==========================================\n"
        "[PASS] 1. Cloud Health Check Probe (/health)\n"
        "[PASS] 2. Seed Sample Expense Data (/api/seed)\n"
        "[PASS] 3. Read All Expenses (Found 11 records)\n"
        "[PASS] 4. Category Filter Query (Found 3 Food items)\n"
        "[PASS] 5. CREATE Expense (ID: 13, Title: 'Cloud Computing Book')\n"
        "[PASS] 6. READ Single Expense Details (ID: 13)\n"
        "[PASS] 7. UPDATE Expense (New Amount: Rs.850.0)\n"
        "[PASS] 8. Summary & Analytics API (Total: Rs.9793.0, Records: 12)\n"
        "[PASS] 9. DELETE Expense (Removed ID: 13)\n"
        "[PASS] 10. Verify 404 on Deleted Record\n"
        "[PASS] 11. HTML Web Dashboard & Template Rendering\n"
        "==========================================\n"
        "ALL 11 AUTOMATED VERIFICATION TESTS PASSED!\n"
        "=========================================="
    )
    add_code_block(test_log)

    # ==========================================
    # Deliverables Checklist & Sign-off
    # ==========================================
    add_subheading("5.3 Final Deliverables Verification Checklist")
    checklist_items = [
        "Source Code Repository: GitHub repository with clean commit history: https://github.com/s-nsk-r/Campus-Spend",
        "Production Cloud Application: Live web app running on Render PaaS: https://campus-spend.onrender.com",
        "Cloud Database Integration: Serverless PostgreSQL hosted on Neon.tech with PgBouncer connection pooling",
        "Interactive REST API Docs: Swagger UI live at /docs and ReDoc at /redoc",
        "Cloud Architecture Diagram: Documented 3-tier architecture separating Client, PaaS, and DBaaS tiers",
        "Video Presentation Script: Formatted 3-minute demonstration script with timestamps and cues",
        "Automated Test Suite: 11/11 automated verification probes passing successfully"
    ]
    for item in checklist_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.2)
        p.paragraph_format.space_after = Pt(3)
        r_box = p.add_run("☑  ")
        r_box.font.bold = True
        r_box.font.color.rgb = PRIMARY
        r_txt = p.add_run(item)
        r_txt.font.size = Pt(10)

    doc.add_paragraph().paragraph_format.space_after = Pt(16)

    # Sign-off block
    p_sign = doc.add_paragraph()
    p_sign.paragraph_format.space_before = Pt(20)
    r_s = p_sign.add_run("Report Generated for BACSE344 Digital Assignment Evaluation\n")
    r_s.font.size = Pt(10)
    r_s.font.bold = True
    r_s.font.color.rgb = PRIMARY
    r_s2 = p_sign.add_run("Author: Sanskar | Registration No: 25BCE5808 | Slot: C1 | Faculty: Dr. P. Anandan")
    r_s2.font.size = Pt(9.5)
    r_s2.font.color.rgb = MUTED

    # Save to file
    filename = "BACSE344_Cloud_DA_Sanskar_25BCE5808.docx"
    try:
        doc.save(filename)
        print(f"Document successfully created: {filename}")
    except PermissionError:
        fallback = "BACSE344_Cloud_DA_Sanskar_25BCE5808_Updated.docx"
        doc.save(fallback)
        print(f"File locked in Word. Saved as: {fallback}")

    try:
        doc.save("CampusSpend_Documentation.docx")
        print("Also saved as: CampusSpend_Documentation.docx")
    except PermissionError:
        pass

if __name__ == "__main__":
    create_report()
