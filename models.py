from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from datetime import datetime, date
from database import Base

class Expense(Base):
    """
    SQLAlchemy Entity Model for Expense Tracking.
    Mapped to 'expenses' table in PostgreSQL / SQLite.
    """
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(50), nullable=False, index=True)
    payment_method = Column(String(50), nullable=False, default="UPI")
    expense_date = Column(Date, nullable=False, default=date.today)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "amount": self.amount,
            "category": self.category,
            "payment_method": self.payment_method,
            "expense_date": str(self.expense_date),
            "notes": self.notes,
            "created_at": str(self.created_at)
        }


class BudgetConfig(Base):
    """
    Cloud-synchronized monthly budget configuration.
    Stores the user's spending ceiling in the cloud database so all devices stay in sync.
    """
    __tablename__ = "budget_config"

    id = Column(Integer, primary_key=True, default=1)
    monthly_limit = Column(Float, nullable=False, default=15000.00)
