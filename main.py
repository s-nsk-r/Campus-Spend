import os
from datetime import date, datetime
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import engine, Base, get_db
import models
import schemas

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
# Health Check Route (For Cloud PaaS Load Balancers)
# ==========================================
@app.get("/health", tags=["System Health"], summary="Cloud Health Probe")
def health_check():
    """Endpoint for Render / Cloud load balancers to verify service availability."""
    return {
        "status": "healthy",
        "service": "CampusSpend REST API",
        "environment": "Cloud / PaaS",
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
    db: Session = Depends(get_db)
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
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
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
# Aggregate KPI Summary Analytics Endpoint
# ==========================================
@app.get(
    "/api/summary/stats",
    response_model=schemas.ExpenseSummary,
    tags=["Analytics & Reporting"],
    summary="Get aggregated statistics and spending breakdown"
)
def get_expense_stats(db: Session = Depends(get_db)):
    """
    Computes real-time analytical metrics:
    - Total money spent
    - Total number of transactions
    - Highest single expense
    - Category-wise spending breakdown
    - Payment-method distribution
    """
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
        "monthly_budget_limit": round(budget.monthly_limit, 2)
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
    db: Session = Depends(get_db)
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
