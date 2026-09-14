import sys
from fastapi.testclient import TestClient
from main import app
import models
from database import Base, engine

client = TestClient(app)

def run_tests():
    print("==========================================")
    print("Testing CampusSpend Cloud REST API & CRUD")
    print("==========================================")
    
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. Cloud Health Check Probe")

    # 2. Seed Data
    res = client.post("/api/seed")
    assert res.status_code == 200, f"Seed failed: {res.text}"
    print("[PASS] 2. Seed Sample Expense Data")

    # 3. Read All Expenses
    res = client.get("/api/expenses")
    assert res.status_code == 200
    expenses = res.json()
    assert len(expenses) >= 8, f"Expected >= 8 expenses, got {len(expenses)}"
    print(f"[PASS] 3. Read All Expenses (Found {len(expenses)} records)")

    # 4. Filter by Category
    res = client.get("/api/expenses?category=Food%20%26%20Dining")
    assert res.status_code == 200
    food_items = res.json()
    assert all(item["category"] == "Food & Dining" for item in food_items)
    print(f"[PASS] 4. Category Filter Query (Found {len(food_items)} Food items)")

    # 5. Create New Expense
    new_expense = {
        "title": "Cloud Computing Architecture Book",
        "amount": 799.50,
        "category": "Academics & Books",
        "payment_method": "UPI",
        "expense_date": "2026-09-10",
        "notes": "Purchased for BACSE344 reference"
    }
    res = client.post("/api/expenses", json=new_expense)
    assert res.status_code == 201, f"Create failed: {res.text}"
    created_item = res.json()
    expense_id = created_item["id"]
    assert created_item["title"] == new_expense["title"]
    assert created_item["amount"] == 799.50
    print(f"[PASS] 5. CREATE Expense (ID: {expense_id}, Title: '{created_item['title']}')")

    # 6. Read Single Expense
    res = client.get(f"/api/expenses/{expense_id}")
    assert res.status_code == 200
    assert res.json()["id"] == expense_id
    print(f"[PASS] 6. READ Single Expense Details (ID: {expense_id})")

    # 7. Update Expense
    update_data = {
        "amount": 850.00,
        "notes": "Updated with expedited shipping"
    }
    res = client.put(f"/api/expenses/{expense_id}", json=update_data)
    assert res.status_code == 200
    updated_item = res.json()
    assert updated_item["amount"] == 850.00
    assert updated_item["notes"] == "Updated with expedited shipping"
    print(f"[PASS] 7. UPDATE Expense (New Amount: ₹{updated_item['amount']})")

    # 8. Analytical Summary Stats
    res = client.get("/api/summary/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_spent"] > 0
    assert stats["total_count"] > 0
    assert "Academics & Books" in stats["category_breakdown"]
    print(f"[PASS] 8. Summary & Analytics API (Total: ₹{stats['total_spent']}, Records: {stats['total_count']})")

    # 9. Delete Expense
    res = client.delete(f"/api/expenses/{expense_id}")
    assert res.status_code == 200
    print(f"[PASS] 9. DELETE Expense (Removed ID: {expense_id})")

    # 10. Verify Deletion
    res = client.get(f"/api/expenses/{expense_id}")
    assert res.status_code == 404
    print("[PASS] 10. Verify 404 on Deleted Record")

    # 11. HTML Web Dashboard Serving
    res = client.get("/")
    assert res.status_code == 200
    assert "CampusSpend" in res.text
    print("[PASS] 11. HTML Web Dashboard & Template Rendering")

    # 12. Cross-Device Cloud Budget Synchronization
    res = client.put("/api/budget", json={"monthly_limit": 20000.0})
    assert res.status_code == 200
    assert res.json()["monthly_limit"] == 20000.0

    res = client.get("/api/budget")
    assert res.status_code == 200
    assert res.json()["monthly_limit"] == 20000.0

    # Reset back to default
    client.put("/api/budget", json={"monthly_limit": 15000.0})
    print("[PASS] 12. Cross-Device Cloud Budget Synchronization (PUT & GET /api/budget)")

    print("==========================================")
    print("ALL 12 AUTOMATED VERIFICATION TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
