import os
from datetime import date, datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import engine, Base, get_db
import models
import schemas
import auth

# Unique backend identifier for load balancer demonstration (DA3 - Q1a)
INSTANCE_ID = os.getenv("INSTANCE_ID", "backend-1")

# Create database tables automatically upon startup
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="CampusSpend API",
    description="Cloud-based RESTful API for Student Expense & Budget Management | Course: BACSE344",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable CORS for cross-origin client integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Middleware to stamp every HTTP response with the serving backend instance
@app.middleware("http")
async def add_load_balancer_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Backend-Instance"] = INSTANCE_ID
    response.headers["X-Served-By"] = f"CampusSpend-{INSTANCE_ID}"
    return response

# Ensure directories exist
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("templates", exist_ok=True)

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ==========================================
# Frontend Routes
# ==========================================
@app.get("/", response_class=HTMLResponse, summary="Serve Web Dashboard")
async def home_dashboard(request: Request):
    """Renders the main responsive web dashboard for expense tracking."""
    return templates.TemplateResponse(request=request, name="index.html")


# ==========================================
# Health Check Route (For Cloud PaaS & Nginx Load Balancers)
# ==========================================
@app.get("/health", tags=["System Health"], summary="Cloud Health Probe")
def health_check(request: Request = None):
    """Endpoint for Render / Nginx load balancers to verify service availability and node identity."""
    node_id = getattr(request.state, "instance_id", INSTANCE_ID) if request else INSTANCE_ID
    return {
        "status": "healthy",
        "service": "CampusSpend REST API",
        "instance_id": node_id,
        "environment": "Clustered behind Nginx",
        "timestamp": datetime.utcnow().isoformat()
    }


# ==========================================
# RESTful CRUD API Endpoints
# ==========================================

@app.post(
    "/api/expenses",
    response_model=schemas.ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Expenses CRUD"],
    summary="Create a new expense"
)
def create_expense(expense_in: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    """
    **Create Expense (C in CRUD)**
    Inserts a new expense record into the cloud database after schema validation.
    """
    db_expense = models.Expense(
        title=expense_in.title,
        amount=expense_in.amount,
        category=expense_in.category,
        payment_method=expense_in.payment_method,
        expense_date=expense_in.expense_date or date.today(),
        notes=expense_in.notes
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@app.get(
    "/api/expenses",
    response_model=List[schemas.ExpenseResponse],
    tags=["Expenses CRUD"],
    summary="List all expenses with optional search and filters"
)
def list_expenses(
    search: Optional[str] = Query(None, description="Search query matching title or notes"),
    category: Optional[str] = Query(None, description="Filter by category"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    db: Session = Depends(get_db)
):
    """
    **Read Expenses (R in CRUD)**
    Retrieves all expenses, ordered chronologically with optional keyword & category filters.
    """
    query = db.query(models.Expense)

    if category and category != "All":
        query = query.filter(models.Expense.category == category)

    if payment_method and payment_method != "All":
        query = query.filter(models.Expense.payment_method == payment_method)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            (models.Expense.title.ilike(search_pattern)) |
            (models.Expense.notes.ilike(search_pattern))
        )

    expenses = query.order_by(desc(models.Expense.expense_date), desc(models.Expense.id)).all()
    return expenses


@app.get(
    "/api/expenses/{expense_id}",
    response_model=schemas.ExpenseResponse,
    tags=["Expenses CRUD"],
    summary="Get details of a single expense by ID"
)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """
    **Read Single Expense (R in CRUD)**
    Fetches the full details of an expense by its unique identifier.
    """
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found."
        )
    return expense


@app.put(
    "/api/expenses/{expense_id}",
    response_model=schemas.ExpenseResponse,
    tags=["Expenses CRUD"],
    summary="Update an existing expense by ID"
)
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.require_role("admin"))
):
    """
    **Update Expense (U in CRUD)**
    Modifies fields of an existing expense record.
    """
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found."
        )

    update_data = expense_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(expense, field, value)

    db.commit()
    db.refresh(expense)
    return expense


@app.delete(
    "/api/expenses/{expense_id}",
    status_code=status.HTTP_200_OK,
    tags=["Expenses CRUD"],
    summary="Delete an expense by ID"
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.require_role("admin"))
):
    """
    **Delete Expense (D in CRUD)**
    Permanently deletes an expense from the cloud database.
    """
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {expense_id} not found."
        )

    db.delete(expense)
    db.commit()
    return {"message": f"Expense '{expense.title}' (ID: {expense_id}) deleted successfully.", "deleted_id": expense_id}


# ==========================================
# Aggregate KPI Summary Analytics Endpoint (Peak-Demand API - Q1)
# ==========================================
@app.get(
    "/api/summary/stats",
    response_model=schemas.ExpenseSummary,
    tags=["Analytics & Reporting"],
    summary="Get aggregated statistics and spending breakdown"
)
def get_expense_stats(request: Request = None, db: Session = Depends(get_db)):
    """
    Computes real-time analytical metrics:
    - Total money spent
    - Total number of transactions
    - Highest single expense
    - Category-wise spending breakdown
    - Payment-method distribution
    - Serving backend instance ID (for load balancer verification)
    """
    node_id = getattr(request.state, "instance_id", INSTANCE_ID) if request else INSTANCE_ID
    expenses = db.query(models.Expense).all()

    total_spent = sum(e.amount for e in expenses)
    total_count = len(expenses)
    highest_expense = max((e.amount for e in expenses), default=0.0)

    category_breakdown = {}
    for e in expenses:
        category_breakdown[e.category] = category_breakdown.get(e.category, 0.0) + e.amount

    payment_breakdown = {}
    for e in expenses:
        payment_breakdown[e.payment_method] = payment_breakdown.get(e.payment_method, 0.0) + e.amount

    budget = db.query(models.BudgetConfig).filter(models.BudgetConfig.id == 1).first()
    if not budget:
        budget = models.BudgetConfig(id=1, monthly_limit=15000.00)
        db.add(budget)
        db.commit()
        db.refresh(budget)

    return {
        "total_spent": round(total_spent, 2),
        "total_count": total_count,
        "highest_expense": round(highest_expense, 2),
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
        "payment_method_breakdown": {k: round(v, 2) for k, v in payment_breakdown.items()},
        "monthly_budget_limit": round(budget.monthly_limit, 2),
        "server_instance": node_id
    }


# ==========================================
# Cross-Device Synchronized Budget Endpoints
# ==========================================
@app.get(
    "/api/budget",
    response_model=schemas.BudgetConfigResponse,
    tags=["Budget & Planning"],
    summary="Get cross-device synchronized monthly budget limit"
)
def get_budget_limit(db: Session = Depends(get_db)):
    """Retrieves the cloud-synchronized monthly spending limit ceiling."""
    budget = db.query(models.BudgetConfig).filter(models.BudgetConfig.id == 1).first()
    if not budget:
        budget = models.BudgetConfig(id=1, monthly_limit=15000.00)
        db.add(budget)
        db.commit()
        db.refresh(budget)
    return {"monthly_limit": budget.monthly_limit}


@app.put(
    "/api/budget",
    response_model=schemas.BudgetConfigResponse,
    tags=["Budget & Planning"],
    summary="Update monthly budget limit synchronized across all devices"
)
def update_budget_limit(
    budget_in: schemas.BudgetConfigUpdate,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(auth.require_role("admin"))
):
    """Updates the cloud-synchronized monthly spending limit ceiling."""
    budget = db.query(models.BudgetConfig).filter(models.BudgetConfig.id == 1).first()
    if not budget:
        budget = models.BudgetConfig(id=1, monthly_limit=budget_in.monthly_limit)
        db.add(budget)
    else:
        budget.monthly_limit = budget_in.monthly_limit
    db.commit()
    db.refresh(budget)
    return {"monthly_limit": budget.monthly_limit}


# ==========================================
# Authentication & Multi-Factor Auth (TOTP) Endpoints (DA3 - Q2b)
# ==========================================
@app.post(
    "/api/auth/login",
    response_model=schemas.LoginResponse,
    tags=["Authentication & Security"],
    summary="User Login with bcrypt password check and TOTP MFA verification"
)
def login(
    login_in: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    import bcrypt
    user = db.query(models.User).filter(models.User.username == login_in.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: username not found."
        )

    # Check password hash
    pw_matches = False
    try:
        pw_matches = bcrypt.checkpw(login_in.password.encode("utf-8"), user.password_hash.encode("utf-8"))
    except Exception:
        pw_matches = (login_in.password == user.password_hash)

    if not pw_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: password incorrect."
        )

    # If MFA is enabled, verify TOTP code
    if user.is_mfa_enabled:
        if not login_in.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA Required: Please provide 6-digit TOTP code from your authenticator app."
            )
        if not auth.verify_totp_code(user.totp_secret, login_in.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA Verification Failed: Invalid or expired 6-digit TOTP code."
            )

    token = auth.create_access_token(user.username, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "mfa_required": user.is_mfa_enabled
    }


@app.post(
    "/api/auth/mfa/setup",
    response_model=schemas.MFASetupResponse,
    tags=["Authentication & Security"],
    summary="Setup TOTP MFA for Google Authenticator / Microsoft Authenticator"
)
def setup_mfa(
    username: str = Query(..., description="Username to configure TOTP for"),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found.")

    secret = auth.generate_totp_secret()
    user.totp_secret = secret
    db.commit()

    uri = auth.get_totp_provisioning_uri(username, secret)
    return {
        "username": username,
        "secret": secret,
        "provisioning_uri": uri,
        "message": "Scan provisioning URI or enter secret key into Google/Microsoft Authenticator"
    }


@app.post(
    "/api/auth/mfa/enable",
    tags=["Authentication & Security"],
    summary="Confirm 6-digit OTP code to activate MFA on user account"
)
def enable_mfa(
    verify_in: schemas.MFAVerifyRequest,
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == verify_in.username).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="MFA setup has not been initiated for this user.")

    if not auth.verify_totp_code(user.totp_secret, verify_in.totp_code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification failed: Invalid or expired 6-digit TOTP code."
        )

    user.is_mfa_enabled = True
    db.commit()
    return {
        "status": "success",
        "message": f"MFA successfully enabled for user '{user.username}'. Google Authenticator active."
    }


# ==========================================
# Demo Data Seeder (Helper for Evaluation/Video Demo)
# ==========================================
@app.post(
    "/api/seed",
    tags=["Demo Utilities"],
    summary="Seed sample data for testing and demonstration"
)
def seed_demo_data(db: Session = Depends(get_db)):
    """Seeds realistic student expense data for instant evaluation and demo."""
    sample_records = [
        {"title": "Hostel Mess Advance", "amount": 2800.00, "category": "Food & Dining", "payment_method": "UPI", "notes": "Monthly mess fee deposit"},
        {"title": "Data Structures Textbook", "amount": 650.00, "category": "Academics & Books", "payment_method": "Debit Card", "notes": "Purchased from campus bookstall"},
        {"title": "Metro Smart Card Recharge", "amount": 400.00, "category": "Transportation", "payment_method": "UPI", "notes": "Monthly metro commute pass"},
        {"title": "Lab Component Kit (Arduino & Sensors)", "amount": 850.00, "category": "Academics & Books", "payment_method": "UPI", "notes": "Microcontroller project kit"},
        {"title": "Weekend Movie & Snacks", "amount": 320.00, "category": "Entertainment", "payment_method": "Cash", "notes": "Hostel friends outing"},
        {"title": "Campus Canteen Lunch & Juice", "amount": 140.00, "category": "Food & Dining", "payment_method": "UPI", "notes": "Afternoon break with classmates"},
        {"title": "Hostel Wi-Fi Subscription", "amount": 350.00, "category": "Hostel & Utilities", "payment_method": "Net Banking", "notes": "Shared broadband plan"},
        {"title": "Semester Examination Fee", "amount": 1200.00, "category": "Academics & Books", "payment_method": "Net Banking", "notes": "Official university portal fee"}
    ]

    added_count = 0
    for item in sample_records:
        exists = db.query(models.Expense).filter(models.Expense.title == item["title"]).first()
        if not exists:
            db_item = models.Expense(
                title=item["title"],
                amount=item["amount"],
                category=item["category"],
                payment_method=item["payment_method"],
                expense_date=date.today(),
                notes=item["notes"]
            )
            db.add(db_item)
            added_count += 1

    db.commit()
    return {"message": f"Successfully seeded {added_count} sample expense records."}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
