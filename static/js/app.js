/**
 * CampusSpend — Client-side Application Controller
 * Communicates with the FastAPI REST backend.
 */

let categoryChartInstance = null;
let itemToDeleteId = null;
let searchDebounceTimer = null;

// =========================================================
// Initialisation
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    // Default date to today
    const dateInput = document.getElementById("formDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    fetchExpenses();
    fetchSummaryStats();
});

// =========================================================
// Theme Management
// =========================================================
function initTheme() {
    const saved = localStorage.getItem("camp_theme") || "dark";
    applyTheme(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("camp_theme", theme);

    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.innerHTML = theme === "light"
            // Sun
            ? '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>'
            // Moon
            : '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
    }

    // Sync chart colours
    if (categoryChartInstance) {
        const isLight = theme === "light";
        categoryChartInstance.options.plugins.legend.labels.color = isLight ? "#52525b" : "#a1a1aa";
        categoryChartInstance.data.datasets[0].borderColor = isLight ? "#f4f4f5" : "#111113";
        categoryChartInstance.update();
    }
}

// =========================================================
// Fetch & Render Expenses
// =========================================================
async function fetchExpenses() {
    const searchVal   = document.getElementById("searchInput").value;
    const categoryVal = document.getElementById("categoryFilter").value;
    const paymentVal  = document.getElementById("paymentFilter").value;

    const params = new URLSearchParams();
    if (searchVal.trim())                    params.append("search",         searchVal.trim());
    if (categoryVal && categoryVal !== "All") params.append("category",       categoryVal);
    if (paymentVal  && paymentVal  !== "All") params.append("payment_method", paymentVal);

    try {
        const res = await fetch(`/api/expenses?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch expenses");

        const data = await res.json();
        renderTable(data);
        document.getElementById("recordCountBadge").innerText = `${data.length} record${data.length !== 1 ? "s" : ""}`;
    } catch (err) {
        console.error(err);
        showToast("Error connecting to the API", "error");
    }
}

function renderTable(expenses) {
    const tbody = document.getElementById("expensesTableBody");
    tbody.innerHTML = "";

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24">
                            <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.52 15.48 0 12.36 0c-1.71 0-3.24.73-4.29 1.89L12 5.94l3.93-3.95C16.57 1.37 17.43 1 18.36 1 19.82 1 21 2.18 21 3.64c0 1.47-1.18 2.64-2.64 2.64H5.64C4.18 6.28 3 5.1 3 3.64 3 2.18 4.18 1 5.64 1c.93 0 1.79.37 2.43.98L12 6.06l3.93-3.95A6.274 6.274 0 0 0 12.36 0C9.24 0 6.72 2.52 6.72 4.64c0 .48.11.92.18 1.36H4C2.9 6 2 6.9 2 8v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V8h16v12z"/>
                        </svg>
                        <p>No expenses found.<br><span style="font-size:0.78rem;">Try adjusting your filters or add a new expense.</span></p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    expenses.forEach(exp => {
        const tr = document.createElement("tr");

        // Badge class mapping
        let badgeClass = "badge-others";
        if      (exp.category.includes("Food"))           badgeClass = "badge-food";
        else if (exp.category.includes("Academics"))      badgeClass = "badge-academics";
        else if (exp.category.includes("Transportation")) badgeClass = "badge-transportation";
        else if (exp.category.includes("Hostel"))         badgeClass = "badge-hostel";
        else if (exp.category.includes("Entertainment"))  badgeClass = "badge-entertainment";
        else if (exp.category.includes("Healthcare"))     badgeClass = "badge-healthcare";

        // Format date nicely
        const dateFormatted = exp.expense_date
            ? new Date(exp.expense_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "N/A";

        const safeTitle = escapeHtml(exp.title);
        const escapedTitleAttr = safeTitle.replace(/'/g, "\\'");

        tr.innerHTML = `
            <td style="color:var(--text-sub);white-space:nowrap;font-size:0.8rem;">${dateFormatted}</td>
            <td>
                <div class="row-title">${safeTitle}</div>
                ${exp.notes ? `<div class="row-notes">${escapeHtml(exp.notes)}</div>` : ""}
            </td>
            <td><span class="badge ${badgeClass}">${escapeHtml(exp.category)}</span></td>
            <td><span class="payment-tag">${escapeHtml(exp.payment_method)}</span></td>
            <td class="row-amount">₹${exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button onclick="openEditModal(${exp.id})" class="btn btn-action-edit">Edit</button>
                <button onclick="openDeleteModal(${exp.id}, '${escapedTitleAttr}')" class="btn btn-action-delete" style="margin-left:4px;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// =========================================================
// Summary Stats & Chart
// =========================================================
async function fetchSummaryStats() {
    try {
        const res = await fetch("/api/summary/stats");
        if (!res.ok) return;

        const stats = await res.json();

        document.getElementById("statTotalSpent").innerText =
            `₹${stats.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
        document.getElementById("statTotalCount").innerText   = stats.total_count;
        document.getElementById("statHighestExpense").innerText =
            `₹${stats.highest_expense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        let topCat = "N/A";
        let maxAmt = 0;
        for (const [cat, amt] of Object.entries(stats.category_breakdown)) {
            if (amt > maxAmt) { maxAmt = amt; topCat = cat; }
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
    const canvas      = document.getElementById("categoryChart");
    const placeholder = document.getElementById("chartPlaceholder");

    if (labels.length === 0) {
        canvas.style.display      = "none";
        placeholder.style.display = "block";
        if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }
        return;
    }

    canvas.style.display      = "block";
    placeholder.style.display = "none";

    const colors = ["#f97316", "#6366f1", "#0ea5e9", "#a855f7", "#ec4899", "#10b981", "#94a3b8"];
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    if (categoryChartInstance) {
        categoryChartInstance.data.labels = labels;
        categoryChartInstance.data.datasets[0].data        = values;
        categoryChartInstance.data.datasets[0].borderColor = isLight ? "#f4f4f5" : "#111113";
        categoryChartInstance.options.plugins.legend.labels.color = isLight ? "#52525b" : "#a1a1aa";
        categoryChartInstance.update();
    } else {
        const ctx = canvas.getContext("2d");
        categoryChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: isLight ? "#f4f4f5" : "#111113",
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            color: isLight ? "#52525b" : "#a1a1aa",
                            font: { family: "Inter, sans-serif", size: 12 },
                            boxWidth: 13,
                            padding: 14
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ₹${ctx.raw.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                cutout: "68%"
            }
        });
    }
}

// =========================================================
// Add / Edit Modal
// =========================================================
function openAddModal() {
    document.getElementById("modalTitle").innerText = "Add New Expense";
    document.getElementById("expenseId").value = "";
    document.getElementById("expenseForm").reset();
    document.getElementById("formDate").value = new Date().toISOString().split("T")[0];
    document.getElementById("expenseModal").classList.add("open");
}

async function openEditModal(id) {
    try {
        const res = await fetch(`/api/expenses/${id}`);
        if (!res.ok) throw new Error("Record not found");

        const data = await res.json();
        document.getElementById("modalTitle").innerText         = "Edit Expense";
        document.getElementById("expenseId").value              = data.id;
        document.getElementById("formTitle").value              = data.title;
        document.getElementById("formAmount").value             = data.amount;
        document.getElementById("formDate").value               = data.expense_date;
        document.getElementById("formCategory").value           = data.category;
        document.getElementById("formPaymentMethod").value      = data.payment_method;
        document.getElementById("formNotes").value              = data.notes || "";
        document.getElementById("expenseModal").classList.add("open");
    } catch (err) {
        showToast("Failed to load expense details", "error");
    }
}

function closeModal() {
    document.getElementById("expenseModal").classList.remove("open");
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const id     = document.getElementById("expenseId").value;
    const isEdit = Boolean(id);

    const payload = {
        title:          document.getElementById("formTitle").value.trim(),
        amount:         parseFloat(document.getElementById("formAmount").value),
        expense_date:   document.getElementById("formDate").value,
        category:       document.getElementById("formCategory").value,
        payment_method: document.getElementById("formPaymentMethod").value,
        notes:          document.getElementById("formNotes").value.trim() || null
    };

    const saveBtn = document.getElementById("saveButton");
    saveBtn.disabled   = true;
    saveBtn.innerText  = "Saving…";

    try {
        const res = await fetch(isEdit ? `/api/expenses/${id}` : "/api/expenses", {
            method:  isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error saving record");
        }

        closeModal();
        showToast(isEdit ? "Expense updated!" : "Expense added!", "success");
        fetchExpenses();
        fetchSummaryStats();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Operation failed", "error");
    } finally {
        saveBtn.disabled  = false;
        saveBtn.innerText = "Save Expense";
    }
}

// =========================================================
// Delete Modal
// =========================================================
function openDeleteModal(id, title) {
    itemToDeleteId = id;
    document.getElementById("deleteItemTitle").innerText = `"${title}"`;
    document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
    itemToDeleteId = null;
    document.getElementById("deleteModal").classList.remove("open");
}

async function executeDelete() {
    if (!itemToDeleteId) return;
    try {
        const res = await fetch(`/api/expenses/${itemToDeleteId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");

        closeDeleteModal();
        showToast("Expense deleted", "success");
        fetchExpenses();
        fetchSummaryStats();
    } catch (err) {
        showToast("Error deleting expense", "error");
    }
}

// =========================================================
// Debounced Search
// =========================================================
function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(fetchExpenses, 320);
}

// =========================================================
// Toast Notifications
// =========================================================
function showToast(message, type = "info") {
    const area  = document.getElementById("toastArea");
    const toast = document.createElement("div");

    let cls = "toast-msg";
    let icon = "";
    if (type === "success") {
        cls  = "toast-msg toast-success";
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4.5-4.5 1.41-1.41L10 13.67l7.18-7.18 1.41 1.41L10 16.5z"/></svg>`;
    } else if (type === "error") {
        cls  = "toast-msg toast-error";
        icon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    }

    toast.className = cls;
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    area.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease";
        toast.style.opacity    = "0";
        setTimeout(() => toast.remove(), 310);
    }, 3200);
}

// =========================================================
// Utility
// =========================================================
function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[c]);
}
