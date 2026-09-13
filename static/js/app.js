/**
 * CampusSpend - Client-side REST Controller
 * Communicates with FastAPI REST Backend
 */

let categoryChartInstance = null;
let itemToDeleteId = null;
let searchDebounceTimer = null;

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("formDate");
    if (dateInput) dateInput.value = today;

    fetchExpenses();
    fetchSummaryStats();
});

async function fetchExpenses() {
    const searchVal = document.getElementById("searchInput").value;
    const categoryVal = document.getElementById("categoryFilter").value;
    const paymentVal = document.getElementById("paymentFilter").value;

    const params = new URLSearchParams();
    if (searchVal.trim()) params.append("search", searchVal.trim());
    if (categoryVal && categoryVal !== "All") params.append("category", categoryVal);
    if (paymentVal && paymentVal !== "All") params.append("payment_method", paymentVal);

    try {
        const response = await fetch(`/api/expenses?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch expenses");
        
        const data = await response.json();
        renderTable(data);
        document.getElementById("recordCountBadge").innerText = `${data.length} records`;
    } catch (err) {
        console.error(err);
        showToast("Error connecting to cloud API", "error");
    }
}

function renderTable(expenses) {
    const tbody = document.getElementById("expensesTableBody");
    tbody.innerHTML = "";

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: #64748b;">
                    <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: #475569;"></i>
                    No expenses found matching current filters.
                </td>
            </tr>
        `;
        return;
    }

    expenses.forEach(exp => {
        const tr = document.createElement("tr");

        let badgeClass = "badge-others";
        if (exp.category.includes("Food")) badgeClass = "badge-food";
        else if (exp.category.includes("Academics")) badgeClass = "badge-academics";
        else if (exp.category.includes("Transportation")) badgeClass = "badge-transportation";
        else if (exp.category.includes("Hostel")) badgeClass = "badge-hostel";
        else if (exp.category.includes("Entertainment")) badgeClass = "badge-entertainment";
        else if (exp.category.includes("Healthcare")) badgeClass = "badge-healthcare";

        const dateFormatted = exp.expense_date || "N/A";

        tr.innerHTML = `
            <td style="color: #64748b; font-family: monospace;">#${exp.id}</td>
            <td style="color: #cbd5e1; white-space: nowrap;">${dateFormatted}</td>
            <td>
                <div class="item-title">${escapeHtml(exp.title)}</div>
                ${exp.notes ? `<div class="item-notes">${escapeHtml(exp.notes)}</div>` : ''}
            </td>
            <td>
                <span class="badge ${badgeClass}">${escapeHtml(exp.category)}</span>
            </td>
            <td>
                <span class="payment-chip">
                    ${getPaymentIcon(exp.payment_method)} ${escapeHtml(exp.payment_method)}
                </span>
            </td>
            <td class="item-amount">₹${exp.amount.toFixed(2)}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button onclick="openEditModal(${exp.id})" class="btn btn-action-edit">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button onclick="openDeleteModal(${exp.id}, '${escapeHtml(exp.title).replace(/'/g, "\\'")}')" class="btn btn-action-delete">
                    <i class="fa-solid fa-trash-can"></i> Delete
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function fetchSummaryStats() {
    try {
        const response = await fetch("/api/summary/stats");
        if (!response.ok) return;

        const stats = await response.json();

        document.getElementById("statTotalSpent").innerText = `₹${stats.total_spent.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
        document.getElementById("statTotalCount").innerText = stats.total_count;
        document.getElementById("statHighestExpense").innerText = `₹${stats.highest_expense.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

        let topCat = "N/A";
        let maxCatAmount = 0;
        for (const [cat, amt] of Object.entries(stats.category_breakdown)) {
            if (amt > maxCatAmount) {
                maxCatAmount = amt;
                topCat = cat;
            }
        }
        document.getElementById("statTopCategory").innerText = topCat;

        updateChart(stats.category_breakdown);
    } catch (err) {
        console.error("Error fetching summary stats:", err);
    }
}

function updateChart(categoryData) {
    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData);

    const canvas = document.getElementById("categoryChart");
    const placeholder = document.getElementById("chartPlaceholder");

    if (labels.length === 0) {
        canvas.style.display = "none";
        placeholder.style.display = "block";
        if (categoryChartInstance) categoryChartInstance.destroy();
        return;
    }

    canvas.style.display = "block";
    placeholder.style.display = "none";

    const colors = [
        "#f97316", // Orange
        "#6366f1", // Indigo
        "#0ea5e9", // Sky
        "#a855f7", // Purple
        "#ec4899", // Pink
        "#10b981", // Emerald
        "#94a3b8"  // Slate
    ];

    if (categoryChartInstance) {
        categoryChartInstance.data.labels = labels;
        categoryChartInstance.data.datasets[0].data = values;
        categoryChartInstance.update();
    } else {
        const ctx = canvas.getContext("2d");
        categoryChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: "#151c2e"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            color: "#cbd5e1",
                            font: { family: "'Segoe UI', sans-serif", size: 12 },
                            boxWidth: 14,
                            padding: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ₹${context.raw.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
                            }
                        }
                    }
                },
                cutout: "68%"
            }
        });
    }
}

function openAddModal() {
    document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-plus" style="color: #6366f1;"></i> Add New Expense';
    document.getElementById("expenseId").value = "";
    document.getElementById("expenseForm").reset();
    document.getElementById("formDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("expenseModal").classList.add("active");
}

async function openEditModal(id) {
    try {
        const response = await fetch(`/api/expenses/${id}`);
        if (!response.ok) throw new Error("Could not find record");
        
        const data = await response.json();
        document.getElementById("modalTitle").innerHTML = '<i class="fa-solid fa-pen-to-square" style="color: #6366f1;"></i> Edit Expense';
        document.getElementById("expenseId").value = data.id;
        document.getElementById("formTitle").value = data.title;
        document.getElementById("formAmount").value = data.amount;
        document.getElementById("formDate").value = data.expense_date;
        document.getElementById("formCategory").value = data.category;
        document.getElementById("formPaymentMethod").value = data.payment_method;
        document.getElementById("formNotes").value = data.notes || "";

        document.getElementById("expenseModal").classList.add("active");
    } catch (err) {
        showToast("Failed to load expense details", "error");
    }
}

function closeModal() {
    document.getElementById("expenseModal").classList.remove("active");
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const id = document.getElementById("expenseId").value;
    const isEdit = Boolean(id);

    const payload = {
        title: document.getElementById("formTitle").value.trim(),
        amount: parseFloat(document.getElementById("formAmount").value),
        expense_date: document.getElementById("formDate").value,
        category: document.getElementById("formCategory").value,
        payment_method: document.getElementById("formPaymentMethod").value,
        notes: document.getElementById("formNotes").value.trim() || null
    };

    const url = isEdit ? `/api/expenses/${id}` : "/api/expenses";
    const method = isEdit ? "PUT" : "POST";

    const saveBtn = document.getElementById("saveButton");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Error saving record");
        }

        closeModal();
        showToast(isEdit ? "Expense updated successfully!" : "Expense saved to Cloud DB!", "success");
        fetchExpenses();
        fetchSummaryStats();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Operation failed", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Expense";
    }
}

function openDeleteModal(id, title) {
    itemToDeleteId = id;
    document.getElementById("deleteItemTitle").innerText = `"${title}"`;
    document.getElementById("deleteModal").classList.add("active");
}

function closeDeleteModal() {
    itemToDeleteId = null;
    document.getElementById("deleteModal").classList.remove("active");
}

async function executeDelete() {
    if (!itemToDeleteId) return;

    try {
        const response = await fetch(`/api/expenses/${itemToDeleteId}`, {
            method: "DELETE"
        });

        if (!response.ok) throw new Error("Failed to delete record");

        closeDeleteModal();
        showToast("Expense record removed from Cloud DB", "success");
        fetchExpenses();
        fetchSummaryStats();
    } catch (err) {
        showToast("Error deleting expense", "error");
    }
}

async function seedSampleData() {
    try {
        const response = await fetch("/api/seed", { method: "POST" });
        const res = await response.json();
        showToast(res.message, "success");
        fetchExpenses();
        fetchSummaryStats();
    } catch (err) {
        showToast("Failed to seed demo data", "error");
    }
}

function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        fetchExpenses();
    }, 300);
}

function getPaymentIcon(method) {
    switch (method) {
        case "UPI": return '<i class="fa-solid fa-mobile-screen-button" style="color: #818cf8;"></i>';
        case "Cash": return '<i class="fa-solid fa-money-bill-wave" style="color: #34d399;"></i>';
        case "Debit Card": return '<i class="fa-solid fa-credit-card" style="color: #38bdf8;"></i>';
        case "Net Banking": return '<i class="fa-solid fa-building-columns" style="color: #fbbf24;"></i>';
        default: return '<i class="fa-solid fa-receipt"></i>';
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");

    let toastClass = "toast";
    let icon = '<i class="fa-solid fa-circle-info" style="color: #38bdf8;"></i>';

    if (type === "success") {
        toastClass = "toast toast-success";
        icon = '<i class="fa-solid fa-circle-check" style="color: #34d399;"></i>';
    } else if (type === "error") {
        toastClass = "toast toast-error";
        icon = '<i class="fa-solid fa-triangle-exclamation" style="color: #f87171;"></i>';
    }

    toast.className = toastClass;
    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return "";
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}
