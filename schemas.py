from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict
from datetime import date, datetime

class ExpenseBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=100, description="Short title/description of expense")
    amount: float = Field(..., gt=0, description="Expense amount in currency (must be positive)")
    category: str = Field(..., description="Expense category e.g. Food, Academics, Travel")
    payment_method: str = Field(default="UPI", description="Payment method: UPI, Cash, Card, Net Banking")
    expense_date: Optional[date] = Field(default_factory=date.today, description="Date of the expense")
    notes: Optional[str] = Field(default=None, max_length=500, description="Optional notes or receipt details")

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Title cannot be empty or only spaces")
        return cleaned

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=2, max_length=100)
    amount: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None)
    payment_method: Optional[str] = Field(default=None)
    expense_date: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=500)

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExpenseSummary(BaseModel):
    total_spent: float
    total_count: int
    highest_expense: float
    category_breakdown: Dict[str, float]
    payment_method_breakdown: Dict[str, float]
    monthly_budget_limit: Optional[float] = 15000.00


class BudgetConfigUpdate(BaseModel):
    monthly_limit: float = Field(..., gt=0, description="Monthly spending limit ceiling in INR")


class BudgetConfigResponse(BaseModel):
    monthly_limit: float
