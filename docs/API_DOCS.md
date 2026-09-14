# RESTful API Documentation & Specification

**Course:** BACSE344 — Cloud Infrastructure and Architecture  
**Slot:** C1 Slot | **Faculty:** Dr. P. Anandan  
**Student Name:** Sanskar | **Registration No:** 25BCE5808  
**Application:** CampusSpend REST API  
**Interactive Swagger Docs URL:** `https://campus-spend.onrender.com/docs`  
**Alternative ReDoc URL:** `https://campus-spend.onrender.com/redoc`  

---

## 1. REST Endpoints Summary

| HTTP Verb | Endpoint Path | Description | CRUD Role | Success Code |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/api/expenses` | Create a new student expense | **C** | `201 Created` |
| `GET` | `/api/expenses` | List all expenses (with search/filter) | **R** | `200 OK` |
| `GET` | `/api/expenses/{id}` | Retrieve details of a single expense | **R** | `200 OK` |
| `PUT` | `/api/expenses/{id}` | Update an existing expense record | **U** | `200 OK` |
| `DELETE` | `/api/expenses/{id}` | Delete an expense permanently | **D** | `200 OK` |
| `GET` | `/api/summary/stats` | Aggregate analytics (totals, breakdown) | Analytics | `200 OK` |
| `GET` | `/health` | Cloud PaaS health probe | Monitoring | `200 OK` |
| `POST` | `/api/seed` | Seed demo data for instant evaluation | Utility | `200 OK` |

---

## 2. Detailed Endpoint Specifications

### A. Create Expense (POST `/api/expenses`)
**Request Headers:** `Content-Type: application/json`  
**Request Payload:**
```json
{
  "title": "Semester Textbooks & Lab Manual",
  "amount": 750.00,
  "category": "Academics & Books",
  "payment_method": "UPI",
  "expense_date": "2026-09-10",
  "notes": "Purchased from university book depot"
}
```
**Response (`201 Created`):**
```json
{
  "id": 1,
  "title": "Semester Textbooks & Lab Manual",
  "amount": 750.0,
  "category": "Academics & Books",
  "payment_method": "UPI",
  "expense_date": "2026-09-10",
  "notes": "Purchased from university book depot",
  "created_at": "2026-09-10T14:30:00.000Z"
}
```

---

### B. List Expenses (GET `/api/expenses`)
**Query Parameters (Optional):**
- `search` (string): Keyword matching title or notes (e.g. `?search=canteen`)
- `category` (string): Filter by category (e.g. `?category=Food%20%26%20Dining`)
- `payment_method` (string): Filter by payment type (e.g. `?payment_method=UPI`)

**Response (`200 OK`):**
```json
[
  {
    "id": 1,
    "title": "Semester Textbooks & Lab Manual",
    "amount": 750.0,
    "category": "Academics & Books",
    "payment_method": "UPI",
    "expense_date": "2026-09-10",
    "notes": "Purchased from university book depot",
    "created_at": "2026-09-10T14:30:00.000Z"
  }
]
```

---

### C. Update Expense (PUT `/api/expenses/{id}`)
**Request Payload (Partial updates supported):**
```json
{
  "amount": 800.00,
  "notes": "Updated price including GST"
}
```
**Response (`200 OK`):** Updated expense object.

---

### D. Delete Expense (DELETE `/api/expenses/{id}`)
**Response (`200 OK`):**
```json
{
  "message": "Expense 'Semester Textbooks & Lab Manual' (ID: 1) deleted successfully.",
  "deleted_id": 1
}
```

---

### E. Analytical Summary (GET `/api/summary/stats`)
**Response (`200 OK`):**
```json
{
  "total_spent": 5460.0,
  "total_count": 8,
  "highest_expense": 2800.0,
  "category_breakdown": {
    "Food & Dining": 2940.0,
    "Academics & Books": 2700.0,
    "Transportation": 400.0,
    "Hostel & Utilities": 350.0,
    "Entertainment": 320.0
  },
  "payment_method_breakdown": {
    "UPI": 4190.0,
    "Debit Card": 650.0,
    "Cash": 320.0,
    "Net Banking": 1550.0
  }
}
```
