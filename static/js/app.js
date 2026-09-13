/**
 * CampusSpend — Modern Fintech Dashboard Controller (ACRU Style)
 * Connects with FastAPI REST API and coordinates dynamic Bento widgets.
 */

let bentoChartInstance = null;
let itemToDeleteId = null;
let searchDebounceTimer = null;
let allExpensesCache = [];

// Monthly budget target stored in local storage
let monthlyBudgetLimit = parseFloat(localStorage.getItem("camp_budget_limit")) || 15000.00;

// Category colors for segmented bars & charts
const CATEGORY_COLORS = {
    "Food & Dining":        { bg: "#fb923c", class: "seg-orange", badge: "b-food", emoji: "🍔" },
    "Academics & Books":    { bg: "#a3e635", class: "seg-green",  badge: "b-academics", emoji: "📚" },
    "Transportation":       { bg: "#38bdf8", class: "seg-blue",   badge: "b-transport", emoji: "🚌" },
    "Hostel & Utilities":   { bg: "#c084fc", class: "seg-purple", badge: "b-hostel", emoji: "🏠" },
    "Entertainment":        { bg: "#f472b6", class: "seg-pink",   badge: "b-entertain", emoji: "🎬" },
    "Healthcare":           { bg: "#34d399", class: "seg-emerald",badge: "b-health", emoji: "💊" },
    "Others":               { bg: "#9ca3af", class: "seg-gray",   badge: "b-others", emoji: "📦" }
};

// =========================================================
// Initialization
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    // Default form date to today
    const dateInput = document.getElementById("formDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    // Load expenses & analytics
    fetchExpenses();
    fetchSummaryStats();
});

// =========================================================
// Theme Management (Light vs True-Black Dark)
// =========================================================
function initTheme() {
    const saved = localStorage.getItem("camp_theme") || "light";
    applyTheme(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("camp_theme", theme);

    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.innerHTML = theme === "dark"
            // Sun icon for switching back to light
            ? '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>'
            // Moon icon for switching to dark
            : '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
    }

    if (bentoChartInstance) {
        renderBentoChart(allExpensesCache);
    }
}

// =========================================================
// Layout Views & Sidebar Navigation
// =========================================================
function switchView(viewName, el) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (el) el.classList.add("active");

    const dashView  = document.getElementById("dashboardView");
    const transView = document.getElementById("transactionsView");

    if (viewName === "transactions") {
        dashView.style.display  = "none";
        transView.style.display = "block";
    } else {
        dashView.style.display  = "grid";
        transView.style.display = "none";
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("collapsed");
}

// =========================================================
// Fetch & Render Expenses
// =========================================================
async function fetchExpenses() {
    const topSearch   = document.getElementById("searchInput")?.value || "";
    const tableSearch = document.getElementById("tableSearchInput")?.value || "";
    const searchVal   = topSearch || tableSearch;

    const categoryVal = document.getElementById("categoryFilter")?.value || "All";
    const paymentVal  = document.getElementById("paymentFilter")?.value || "All";

    const params = new URLSearchParams();
    if (searchVal.trim())                     params.append("search", searchVal.trim());
    if (categoryVal && categoryVal !== "All") params.append("category", categoryVal);
    if (paymentVal  && paymentVal  !== "All") params.append("payment_method", paymentVal);

    try {
        const res = await fetch(`/api/expenses?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch expenses");

        const data = await res.json();
        allExpensesCache = data;

        // Render both views
        renderTable(data);
        renderRecentStream(data);

        // Update badge counts
        const countBadge = document.getElementById("navBadgeCount");
        if (countBadge) countBadge.innerText = data.length;

        // Sync chart
        renderBentoChart(data);
    } catch (err) {
        console.error("Fetch error:", err);
        showToast("Error connecting to database", "error");
    }
}

// Render full table view
function renderTable(expenses) {
    const tbody = document.getElementById("expensesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted);">
                    No expenses found. Click <strong>+ Add Expense</strong> to record one.
                </td>
            </tr>
        `;
        return;
    }

    expenses.forEach(exp => {
        const tr = document.createElement("tr");
        const catInfo = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Others"];

        const dateFormatted = exp.expense_date
            ? new Date(exp.expense_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "N/A";

        const safeTitle = escapeHtml(exp.title);
        const escapedTitleAttr = safeTitle.replace(/'/g, "\\'");

        tr.innerHTML = `
            <td style="color:var(--text-sub);white-space:nowrap;font-size:0.8rem;">${dateFormatted}</td>
            <td>
                <div style="font-weight:700;color:var(--text-main);">${safeTitle}</div>
                ${exp.notes ? `<div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(exp.notes)}</div>` : ""}
            </td>
            <td><span class="badge-pill ${catInfo.badge}">${catInfo.emoji} ${escapeHtml(exp.category)}</span></td>
            <td><span class="tiny-badge">${escapeHtml(exp.payment_method)}</span></td>
            <td style="font-weight:800;color:var(--text-main);">₹${exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button onclick="openEditModal(${exp.id})" class="btn-mini">Edit</button>
                <button onclick="openDeleteModal(${exp.id}, '${escapedTitleAttr}')" class="btn-mini danger" style="margin-left:4px;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Render right column recent stream
function renderRecentStream(expenses) {
    const stream = document.getElementById("recentTransactionsStream");
    if (!stream) return;
    stream.innerHTML = "";

    if (expenses.length === 0) {
        stream.innerHTML = `<div class="stream-empty">No transactions yet.<br>Add your first campus spend!</div>`;
        return;
    }

    // Show latest 6 records
    const recent = expenses.slice(0, 6);
    recent.forEach(exp => {
        const item = document.createElement("div");
        item.className = "stream-item";

        const catInfo = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Others"];
        const safeTitle = escapeHtml(exp.title);
        const escapedTitleAttr = safeTitle.replace(/'/g, "\\'");

        const dateStr = exp.expense_date
            ? new Date(exp.expense_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "Recent";

        item.innerHTML = `
            <div class="stream-avatar" style="background:${catInfo.bg}22; color:${catInfo.bg};">
                ${catInfo.emoji}
            </div>
            <div class="stream-details">
                <div class="stream-title">${safeTitle}</div>
                <div class="stream-date">${dateStr} • ${escapeHtml(exp.payment_method)}</div>
            </div>
            <div class="stream-right">
                <div class="stream-amt">-₹${exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div class="stream-status">Completed</div>
            </div>
            <div class="stream-actions-hover">
                <button onclick="openEditModal(${exp.id})" class="btn-mini">Edit</button>
                <button onclick="openDeleteModal(${exp.id}, '${escapedTitleAttr}')" class="btn-mini danger">×</button>
            </div>
        `;
        stream.appendChild(item);
    });
}

// =========================================================
// Summary Stats & Bento Analytics
// =========================================================
async function fetchSummaryStats() {
    try {
        const res = await fetch("/api/summary/stats");
        if (!res.ok) return;

        const stats = await res.json();
        const totalSpent = stats.total_spent || 0;

        // 1. Hero Card Metrics
        const heroAmt = document.getElementById("heroBalanceDisplay");
        if (heroAmt) heroAmt.innerText = `₹${totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        const heroExp = document.getElementById("statHeroExpenses");
        if (heroExp) heroExp.innerText = `₹${totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        const budgetEl = document.getElementById("statMonthlyBudget");
        if (budgetEl) budgetEl.innerText = `₹${monthlyBudgetLimit.toLocaleString("en-IN")}`;

        const savedAmount = Math.max(0, monthlyBudgetLimit - totalSpent);
        const heroSaved = document.getElementById("statHeroSaved");
        if (heroSaved) heroSaved.innerText = `₹${savedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        const savedPct = Math.round((savedAmount / monthlyBudgetLimit) * 100);
        const savedPctEl = document.getElementById("statSavedPercent");
        if (savedPctEl) savedPctEl.innerText = `${savedPct}% remaining`;

        // 2. Spending Limit Progress Bar
        const progBar = document.getElementById("spendingProgressBar");
        const spentPct = Math.min(100, Math.round((totalSpent / monthlyBudgetLimit) * 100));
        if (progBar) progBar.style.width = `${spentPct}%`;

        const spentLbl = document.getElementById("spendingSpentLabel");
        if (spentLbl) spentLbl.innerText = `₹${totalSpent.toLocaleString("en-IN")}`;

        const limitLbl = document.getElementById("spendingLimitLabel");
        if (limitLbl) limitLbl.innerText = `₹${monthlyBudgetLimit.toLocaleString("en-IN")}`;

        // 3. Cost Analysis Breakdown
        renderCostAnalysis(stats.category_breakdown || {}, totalSpent);

        // 4. Financial Health Radial Half-Circle Gauge
        renderHealthGauge(savedPct);

        // 5. Goals Tracker Sync
        renderGoals(stats.category_breakdown || {});

    } catch (err) {
        console.error("Summary error:", err);
    }
}

// Cost analysis segmented bar & category breakdown
function renderCostAnalysis(breakdown, totalSpent) {
    const costTotalEl = document.getElementById("costAnalysisTotal");
    if (costTotalEl) costTotalEl.innerText = `₹${totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

    const barEl = document.getElementById("costSegmentedBar");
    const listEl = document.getElementById("categoryBreakdownList");
    if (!barEl || !listEl) return;

    barEl.innerHTML = "";
    listEl.innerHTML = "";

    const entries = Object.entries(breakdown);
    if (entries.length === 0 || totalSpent === 0) {
        barEl.innerHTML = `<div class="seg-item seg-gray" style="width: 100%;"></div>`;
        listEl.innerHTML = `<div class="cat-list-empty">No expenses recorded yet</div>`;
        return;
    }

    entries.sort((a, b) => b[1] - a[1]);

    entries.forEach(([cat, amt]) => {
        const pct = Math.round((amt / totalSpent) * 100);
        const catInfo = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Others"];

        // Segment bar slice
        const seg = document.createElement("div");
        seg.className = `seg-item ${catInfo.class}`;
        seg.style.width = `${pct}%`;
        seg.title = `${cat}: ₹${amt.toLocaleString("en-IN")} (${pct}%)`;
        barEl.appendChild(seg);

        // List row
        const row = document.createElement("div");
        row.className = "cat-item-row";
        row.innerHTML = `
            <div class="cat-label-wrap">
                <span class="cat-bullet" style="background:${catInfo.bg}"></span>
                <span>${catInfo.emoji} ${cat}</span>
            </div>
            <span class="cat-pct">${pct}%</span>
        `;
        listEl.appendChild(row);
    });
}

// Financial Health Radial Gauge
function renderHealthGauge(savedPct) {
    const scoreDisplay = document.getElementById("healthScoreDisplay");
    const pctText = document.getElementById("gaugePercentText");
    const arc = document.getElementById("gaugeArc");

    if (pctText) pctText.innerText = `${savedPct}%`;

    if (scoreDisplay) {
        if (savedPct >= 60) {
            scoreDisplay.innerText = "Optimal";
            scoreDisplay.style.color = "var(--accent-lime-dark)";
        } else if (savedPct >= 30) {
            scoreDisplay.innerText = "Moderate";
            scoreDisplay.style.color = "var(--color-yellow)";
        } else {
            scoreDisplay.innerText = "Warning";
            scoreDisplay.style.color = "var(--danger)";
        }
    }

    if (arc) {
        // Half circle circumference is ~ 141.37
        const maxOffset = 141.37;
        const progress = Math.max(0, Math.min(100, savedPct)) / 100;
        const offset = maxOffset * (1 - progress);
        arc.style.strokeDashoffset = offset;
    }
}

// Goal tracker progress
function renderGoals(breakdown) {
    const academicSpend = breakdown["Academics & Books"] || 0;
    const foodSpend = breakdown["Food & Dining"] || 0;
    const transportSpend = breakdown["Transportation"] || 0;

    const elAcad = document.getElementById("goalAcademicAmount");
    const elAcadProg = document.getElementById("goalAcademicProg");
    if (elAcad) elAcad.innerText = `₹${academicSpend.toLocaleString("en-IN")} / ₹4,000`;
    if (elAcadProg) elAcadProg.style.width = `${Math.min(100, (academicSpend / 4000) * 100)}%`;

    const elFood = document.getElementById("goalFoodAmount");
    const elFoodProg = document.getElementById("goalFoodProg");
    if (elFood) elFood.innerText = `₹${foodSpend.toLocaleString("en-IN")} / ₹5,000`;
    if (elFoodProg) elFoodProg.style.width = `${Math.min(100, (foodSpend / 5000) * 100)}%`;

    const elTrans = document.getElementById("goalTransportAmount");
    const elTransProg = document.getElementById("goalTransportProg");
    if (elTrans) elTrans.innerText = `₹${transportSpend.toLocaleString("en-IN")} / ₹2,000`;
    if (elTransProg) elTransProg.style.width = `${Math.min(100, (transportSpend / 2000) * 100)}%`;
}

// Customizable Budget Limit
function editBudgetLimit() {
    const input = prompt("Set your monthly budget ceiling in ₹:", monthlyBudgetLimit);
    if (input !== null) {
        const val = parseFloat(input);
        if (!isNaN(val) && val > 0) {
            monthlyBudgetLimit = val;
            localStorage.setItem("camp_budget_limit", val);
            fetchSummaryStats();
            showToast(`Budget ceiling updated to ₹${val.toLocaleString("en-IN")}`, "success");
        }
    }
}

// =========================================================
// Bento Rounded Bar Chart
// =========================================================
function renderBentoChart(expenses) {
    const canvas = document.getElementById("bentoBarChart");
    if (!canvas) return;

    // Group last 7 days or days of week
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyAcademics = [0, 0, 0, 0, 0, 0, 0];
    const dailyFood = [0, 0, 0, 0, 0, 0, 0];
    const dailyOther = [0, 0, 0, 0, 0, 0, 0];

    expenses.forEach(exp => {
        if (!exp.expense_date) return;
        const d = new Date(exp.expense_date + "T00:00:00");
        const dayIdx = d.getDay();
        if (exp.category === "Academics & Books") {
            dailyAcademics[dayIdx] += exp.amount;
        } else if (exp.category === "Food & Dining") {
            dailyFood[dayIdx] += exp.amount;
        } else {
            dailyOther[dayIdx] += exp.amount;
        }
    });

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "#232328" : "#f0f2f5";
    const labelColor = isDark ? "#6b7280" : "#9ca3af";

    if (bentoChartInstance) {
        bentoChartInstance.destroy();
    }

    const ctx = canvas.getContext("2d");
    bentoChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: days,
            datasets: [
                {
                    label: "Academics",
                    data: dailyAcademics,
                    backgroundColor: isDark ? "#bef264" : "#a3e635",
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55
                },
                {
                    label: "Food",
                    data: dailyFood,
                    backgroundColor: "#facc15",
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55
                },
                {
                    label: "Living",
                    data: dailyOther,
                    backgroundColor: "#fb923c",
                    borderRadius: 6,
                    borderSkipped: false,
                    barPercentage: 0.55
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString("en-IN")}`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: labelColor, font: { family: "Plus Jakarta Sans", size: 11, weight: 600 } },
                    border: { display: false }
                },
                y: {
                    stacked: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: labelColor,
                        font: { family: "Plus Jakarta Sans", size: 10 },
                        callback: val => `₹${val}`
                    },
                    border: { display: false }
                }
            }
        }
    });
}

// =========================================================
// Modals & CRUD Actions
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
        document.getElementById("modalTitle").innerText    = "Edit Expense";
        document.getElementById("expenseId").value         = data.id;
        document.getElementById("formTitle").value         = data.title;
        document.getElementById("formAmount").value        = data.amount;
        document.getElementById("formDate").value          = data.expense_date;
        document.getElementById("formCategory").value      = data.category;
        document.getElementById("formPaymentMethod").value = data.payment_method;
        document.getElementById("formNotes").value         = data.notes || "";
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
        showToast(isEdit ? "Expense updated!" : "Expense added successfully!", "success");
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
// Search & Utilities
// =========================================================
function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(fetchExpenses, 280);
}

function exportDataCSV() {
    if (allExpensesCache.length === 0) {
        showToast("No expenses to export", "error");
        return;
    }

    const headers = ["ID", "Title", "Amount", "Category", "Payment Method", "Date", "Notes"];
    const rows = allExpensesCache.map(e => [
        e.id,
        `"${e.title.replace(/"/g, '""')}"`,
        e.amount,
        `"${e.category}"`,
        `"${e.payment_method}"`,
        e.expense_date,
        `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CampusSpend_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV successfully!", "success");
}

function showToast(message, type = "info") {
    const area  = document.getElementById("toastArea");
    if (!area) return;

    const toast = document.createElement("div");
    let cls = "toast-msg";
    let icon = "";

    if (type === "success") {
        cls  = "toast-msg toast-success";
        icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--accent-lime);flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4.5-4.5 1.41-1.41L10 13.67l7.18-7.18 1.41 1.41L10 16.5z"/></svg>`;
    } else if (type === "error") {
        cls  = "toast-msg toast-error";
        icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:var(--danger);flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    }

    toast.className = cls;
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    area.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        toast.style.opacity    = "0";
        toast.style.transform  = "translateY(10px)";
        setTimeout(() => toast.remove(), 320);
    }, 3200);
}

function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[c]);
}
