/**
 * CampusSpend — Application Controller
 * Handles views, CRUD, analytics, budget, and theme.
 */

let bentoChartInstance   = null;
let donutChartInstance   = null;
let itemToDeleteId       = null;
let searchDebounceTimer  = null;
let allExpensesCache     = [];
let currentView          = 'dashboard';

let monthlyBudgetLimit = parseFloat(localStorage.getItem("camp_budget_limit")) || 15000.00;

// Category colour map — NO emojis
const CATEGORY_COLORS = {
    "Food & Dining":      { bg: "#fb923c", class: "seg-orange", badge: "b-food",      label: "Food & Dining"      },
    "Academics & Books":  { bg: "#a3e635", class: "seg-green",  badge: "b-academics",  label: "Academics & Books"  },
    "Transportation":     { bg: "#38bdf8", class: "seg-blue",   badge: "b-transport",  label: "Transportation"      },
    "Hostel & Utilities": { bg: "#c084fc", class: "seg-purple", badge: "b-hostel",     label: "Hostel & Utilities"  },
    "Entertainment":      { bg: "#f472b6", class: "seg-pink",   badge: "b-entertain",  label: "Entertainment"       },
    "Healthcare":         { bg: "#34d399", class: "seg-emerald",badge: "b-health",     label: "Healthcare"          },
    "Others":             { bg: "#9ca3af", class: "seg-gray",   badge: "b-others",     label: "Others"              }
};

// Category budget weights for dynamic allocation based on monthly budget limit
const CATEGORY_WEIGHTS = {
    "Food & Dining":      5.0,   // ~31%
    "Academics & Books":  4.0,   // ~25%
    "Hostel & Utilities": 2.5,   // ~16%
    "Transportation":     2.0,   // ~12.5%
    "Entertainment":      1.0,   // ~6%
    "Others":             1.0,   // ~6%
    "Healthcare":         0.5    // ~3%
};

function getCategoryBudgetLimit(cat) {
    const weights = CATEGORY_WEIGHTS;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weight = weights[cat] || 1.0;
    // Scale proportionally with monthlyBudgetLimit, rounded to nearest 50 for clean display
    const calculated = Math.round((monthlyBudgetLimit * (weight / totalWeight)) / 50) * 50;
    return Math.max(100, calculated);
}

// =========================================================
// Initialization
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();

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
        icon.innerHTML = theme === "dark"
            ? '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>'
            : '<path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>';
    }

    if (bentoChartInstance) renderBentoChart(allExpensesCache);
    if (donutChartInstance)  updateDonutChart(buildCategoryBreakdown(allExpensesCache));
}

// =========================================================
// View Navigation
// =========================================================
const VIEW_IDS = {
    dashboard:    "dashboardView",
    transactions: "transactionsView",
    analytics:    "analyticsView",
    budget:       "budgetView"
};

function switchView(viewName, navEl) {
    if (!VIEW_IDS[viewName]) return;

    currentView = viewName;

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    if (navEl) navEl.classList.add("active");

    // Alternatively find nav item by view name when called programmatically
    if (!navEl) {
        document.querySelectorAll(".nav-item").forEach(item => {
            if (item.getAttribute("onclick") && item.getAttribute("onclick").includes(`'${viewName}'`)) {
                item.classList.add("active");
            }
        });
    }

    // Show the right panel
    Object.entries(VIEW_IDS).forEach(([name, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (name === viewName) {
            el.style.display = name === "dashboard" ? "grid" : "block";
        } else {
            el.style.display = "none";
        }
    });

    // Scroll content container to top
    const container = document.getElementById("contentContainer");
    if (container) container.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" });

    // Sync analytics / budget / dashboard views on switch
    if (viewName === "dashboard") renderBentoChart(allExpensesCache);
    if (viewName === "analytics") renderAnalyticsView(allExpensesCache);
    if (viewName === "budget")    renderBudgetView(allExpensesCache);

    // Clear global search when switching views (optional UX improvement)
    const searchBar = document.getElementById("searchInput");
    if (searchBar && viewName !== "transactions") {
        searchBar.value = "";
        toggleSearchClear(false);
    }
}

function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("collapsed");
}

// =========================================================
// Global Search
// =========================================================
function handleGlobalSearch() {
    const val = document.getElementById("searchInput").value;
    toggleSearchClear(val.length > 0);

    // If not on transactions, switch to it so user sees results
    if (val.trim() && currentView !== "transactions") {
        switchView("transactions", null);
    }
    debounceSearch();
}

function clearSearch() {
    document.getElementById("searchInput").value = "";
    toggleSearchClear(false);
    fetchExpenses();
}

function toggleSearchClear(show) {
    const btn = document.getElementById("searchClearBtn");
    if (btn) btn.style.display = show ? "flex" : "none";
}

// =========================================================
// Fetch & Render Expenses
// =========================================================
async function fetchExpenses() {
    const topSearch   = document.getElementById("searchInput")?.value || "";
    const tableSearch = document.getElementById("tableSearchInput")?.value || "";
    const searchVal   = topSearch || tableSearch;

    const categoryVal = document.getElementById("categoryFilter")?.value || "All";
    const paymentVal  = document.getElementById("paymentFilter")?.value  || "All";

    const params = new URLSearchParams();
    if (searchVal.trim())                     params.append("search",         searchVal.trim());
    if (categoryVal && categoryVal !== "All") params.append("category",       categoryVal);
    if (paymentVal  && paymentVal  !== "All") params.append("payment_method", paymentVal);

    try {
        const res = await fetch(`/api/expenses?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch expenses");

        const data = await res.json();
        allExpensesCache = data;

        renderTable(data);
        renderRecentStream(data);

        const countBadge = document.getElementById("navBadgeCount");
        if (countBadge) countBadge.innerText = data.length;

        renderBentoChart(data);

        // Refresh current analytics/budget view if open
        if (currentView === "analytics") renderAnalyticsView(data);
        if (currentView === "budget")    renderBudgetView(data);

    } catch (err) {
        console.error("Fetch error:", err);
        showToast("Error connecting to database", "error");
    }
}

// =========================================================
// Table Rendering
// =========================================================
function renderTable(expenses) {
    const tbody = document.getElementById("expensesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted);">
                    No expenses found. Click <strong>Add Expense</strong> to record one.
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
        const escapedAttr = safeTitle.replace(/'/g, "\\'");

        tr.innerHTML = `
            <td style="color:var(--text-sub);white-space:nowrap;font-size:0.8rem;">${dateFormatted}</td>
            <td>
                <div style="font-weight:700;color:var(--text-main);">${safeTitle}</div>
                ${exp.notes ? `<div style="font-size:0.73rem;color:var(--text-muted);margin-top:2px;">${escapeHtml(exp.notes)}</div>` : ""}
            </td>
            <td><span class="badge-pill ${catInfo.badge}">${escapeHtml(exp.category)}</span></td>
            <td><span class="tiny-badge">${escapeHtml(exp.payment_method)}</span></td>
            <td style="font-weight:800;color:var(--text-main);white-space:nowrap;">Rs.${exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button onclick="openEditModal(${exp.id})" class="btn-mini">Edit</button>
                <button onclick="openDeleteModal(${exp.id}, '${escapedAttr}')" class="btn-mini danger" style="margin-left:4px;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// =========================================================
// Recent Transactions Stream (Dashboard)
// =========================================================
function renderRecentStream(expenses) {
    const stream = document.getElementById("recentTransactionsStream");
    if (!stream) return;
    stream.innerHTML = "";

    if (expenses.length === 0) {
        stream.innerHTML = `<div class="stream-empty">No transactions yet.<br>Add your first campus expense!</div>`;
        return;
    }

    expenses.slice(0, 7).forEach(exp => {
        const item = document.createElement("div");
        item.className = "stream-item";

        const catInfo = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS["Others"];
        const safeTitle  = escapeHtml(exp.title);
        const escapedAttr = safeTitle.replace(/'/g, "\\'");
        const dateStr = exp.expense_date
            ? new Date(exp.expense_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })
            : "Recent";

        // Use first letter of category as avatar text instead of emoji
        const avatarLetter = (exp.category || "O")[0].toUpperCase();

        item.innerHTML = `
            <div class="stream-avatar" style="background:${catInfo.bg}22; color:${catInfo.bg}; font-size:0.75rem; font-weight:800;">
                ${avatarLetter}
            </div>
            <div class="stream-details">
                <div class="stream-title">${safeTitle}</div>
                <div class="stream-date">${dateStr} &bull; ${escapeHtml(exp.payment_method)}</div>
            </div>
            <div class="stream-right">
                <div class="stream-amt">-Rs.${exp.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div class="stream-status">Recorded</div>
            </div>
            <div class="stream-actions-hover">
                <button onclick="openEditModal(${exp.id})" class="btn-mini">Edit</button>
                <button onclick="openDeleteModal(${exp.id}, '${escapedAttr}')" class="btn-mini danger">×</button>
            </div>
        `;
        stream.appendChild(item);
    });
}

// =========================================================
// Summary Stats & Dashboard Analytics
// =========================================================
async function fetchSummaryStats() {
    try {
        const res = await fetch("/api/summary/stats");
        if (!res.ok) return;

        const stats    = await res.json();
        const totalSpent = stats.total_spent || 0;

        // Hero metrics
        setInner("heroBalanceDisplay", fmt(totalSpent));
        setInner("statHeroExpenses",   fmt(totalSpent));
        setInner("statMonthlyBudget",  fmtInt(monthlyBudgetLimit));

        const saved    = Math.max(0, monthlyBudgetLimit - totalSpent);
        const savedPct = monthlyBudgetLimit > 0 ? Math.round((saved / monthlyBudgetLimit) * 100) : 100;
        setInner("statHeroSaved",    fmt(saved));
        setInner("statSavedPercent", `${savedPct}% remaining`);

        // Spending bar
        const spentPct = monthlyBudgetLimit > 0 ? Math.min(100, Math.round((totalSpent / monthlyBudgetLimit) * 100)) : 0;
        setStyle("spendingProgressBar", "width", `${spentPct}%`);
        setInner("spendingSpentLabel", `Rs.${totalSpent.toLocaleString("en-IN")}`);
        setInner("spendingLimitLabel", `Rs.${monthlyBudgetLimit.toLocaleString("en-IN")}`);

        // Budget view bars
        setStyle("budgetProgressBarMain", "width", `${spentPct}%`);
        setInner("budgetSpentVal",       fmt(totalSpent));
        setInner("budgetLimitVal",       fmtInt(monthlyBudgetLimit));
        setInner("budgetRemainingVal",   fmt(saved));
        setInner("budgetPctLabel",       `${spentPct}% used`);
        setInner("budgetRemainingLabel", `Rs.${saved.toLocaleString("en-IN")} remaining`);

        // Cost analysis
        renderCostAnalysis(stats.category_breakdown || {}, totalSpent);

        // Health gauge: shows how much budget is used
        const actualSpentPct = monthlyBudgetLimit > 0 ? Math.round((totalSpent / monthlyBudgetLimit) * 100) : 0;
        renderHealthGauge(actualSpentPct);

        // Goals
        renderGoals(stats.category_breakdown || {});

        // Analytics page
        if (currentView === "analytics") renderAnalyticsView(allExpensesCache, stats);
        if (currentView === "budget")    renderBudgetView(allExpensesCache, stats);

        // Analytics summary fields (always update for fast switch)
        updateAnalyticsSummary(stats, totalSpent);

    } catch (err) {
        console.error("Summary error:", err);
    }
}

function updateAnalyticsSummary(stats, totalSpent) {
    const count    = stats.total_count || 0;
    const highest  = stats.highest_expense || 0;
    const avg      = count > 0 ? totalSpent / count : 0;

    let topCat = "—";
    let maxAmt = 0;
    for (const [cat, amt] of Object.entries(stats.category_breakdown || {})) {
        if (amt > maxAmt) { maxAmt = amt; topCat = cat; }
    }

    setInner("anTotalSpent", fmt(totalSpent));
    setInner("anTotalCount", count);
    setInner("anHighest",    fmt(highest));
    setInner("anAverage",    fmt(avg));
    setInner("anTopCat",     topCat);
}

function renderCostAnalysis(breakdown, totalSpent) {
    setInner("costAnalysisTotal", fmt(totalSpent));

    const barEl  = document.getElementById("costSegmentedBar");
    const listEl = document.getElementById("categoryBreakdownList");
    if (!barEl || !listEl) return;

    barEl.innerHTML  = "";
    listEl.innerHTML = "";

    const entries = Object.entries(breakdown);
    if (entries.length === 0 || totalSpent === 0) {
        barEl.innerHTML  = `<div class="seg-item" style="width:100%;background:#9ca3af;"></div>`;
        listEl.innerHTML = `<div class="cat-list-empty">No expenses recorded yet</div>`;
        return;
    }

    entries.sort((a, b) => b[1] - a[1]);
    entries.forEach(([cat, amt]) => {
        const pctRaw  = (amt / totalSpent) * 100;
        const pct     = Math.round(pctRaw);
        const catInfo = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Others"];

        // Fill edge-to-edge with explicit flex basis and color
        const seg = document.createElement("div");
        seg.className             = `seg-item ${catInfo.class}`;
        seg.style.flex            = `${amt} 1 0px`;
        seg.style.backgroundColor = catInfo.bg;
        seg.title                 = `${cat}: Rs.${amt.toLocaleString("en-IN")} (${pct}%)`;
        barEl.appendChild(seg);

        const row = document.createElement("div");
        row.className = "cat-item-row";
        row.innerHTML = `
            <div class="cat-label-wrap">
                <span class="cat-bullet" style="background:${catInfo.bg}"></span>
                <span>${cat}</span>
            </div>
            <span class="cat-pct">${pct}%</span>
        `;
        listEl.appendChild(row);
    });
}

function renderHealthGauge(spentPct) {
    const scoreDisplay = document.getElementById("healthScoreDisplay");
    const pctText      = document.getElementById("gaugePercentText");
    const arc          = document.getElementById("gaugeArc");

    if (pctText) {
        pctText.innerText   = `${spentPct}%`;
        pctText.style.color = spentPct >= 100 ? "var(--danger)" : "var(--text-main)";
    }

    if (scoreDisplay) {
        if (spentPct < 70) {
            scoreDisplay.innerText   = "Optimal";
            scoreDisplay.style.color = "var(--accent-lime-dark)";
        } else if (spentPct < 100) {
            scoreDisplay.innerText   = "Moderate";
            scoreDisplay.style.color = "var(--color-yellow)";
        } else {
            scoreDisplay.innerText   = "Warning";
            scoreDisplay.style.color = "var(--danger)";
        }
    }

    if (arc) {
        const maxOffset = 141.37;
        const progress  = Math.max(0, Math.min(100, spentPct)) / 100;
        arc.style.strokeDashoffset = `${maxOffset * (1 - progress)}`;
        arc.style.stroke           = spentPct >= 100 ? "var(--danger)" : "var(--accent-lime)";
    }
}

function renderGoals(breakdown) {
    const academicLimit  = getCategoryBudgetLimit("Academics & Books");
    const foodLimit      = getCategoryBudgetLimit("Food & Dining");
    const transportLimit = getCategoryBudgetLimit("Transportation");

    const academic  = breakdown["Academics & Books"] || 0;
    const food      = breakdown["Food & Dining"]     || 0;
    const transport = breakdown["Transportation"]    || 0;

    setInner("goalAcademicAmount",  `Rs.${academic.toLocaleString("en-IN")} / Rs.${academicLimit.toLocaleString("en-IN")}`);
    setStyle("goalAcademicProg",    "width", `${Math.min(100, (academic  / academicLimit) * 100)}%`);

    setInner("goalFoodAmount",      `Rs.${food.toLocaleString("en-IN")} / Rs.${foodLimit.toLocaleString("en-IN")}`);
    setStyle("goalFoodProg",        "width", `${Math.min(100, (food      / foodLimit) * 100)}%`);

    setInner("goalTransportAmount", `Rs.${transport.toLocaleString("en-IN")} / Rs.${transportLimit.toLocaleString("en-IN")}`);
    setStyle("goalTransportProg",   "width", `${Math.min(100, (transport / transportLimit) * 100)}%`);
}

function editBudgetLimit() {
    const input = prompt("Set your monthly budget ceiling in Rs.:", monthlyBudgetLimit);
    if (input !== null) {
        const val = parseFloat(input);
        if (!isNaN(val) && val > 0) {
            monthlyBudgetLimit = val;
            localStorage.setItem("camp_budget_limit", val);
            fetchSummaryStats();
            if (allExpensesCache && allExpensesCache.length >= 0) {
                renderBudgetView(allExpensesCache);
            }
            showToast(`Budget ceiling updated to Rs.${val.toLocaleString("en-IN")}`, "success");
        }
    }
}

// =========================================================
// Analytics View (VIEW 3)
// =========================================================
function renderAnalyticsView(expenses) {
    const breakdown = buildCategoryBreakdown(expenses);
    updateDonutChart(breakdown);

    // Payment method breakdown
    const paymentBreakdown = {};
    expenses.forEach(e => {
        paymentBreakdown[e.payment_method] = (paymentBreakdown[e.payment_method] || 0) + e.amount;
    });

    const paymentEl = document.getElementById("analyticsPaymentList");
    if (paymentEl) {
        paymentEl.innerHTML = "";
        const total = Object.values(paymentBreakdown).reduce((a, b) => a + b, 0) || 1;
        Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]).forEach(([method, amt]) => {
            const pct = Math.round((amt / total) * 100);
            const row = document.createElement("div");
            row.className = "cat-item-row";
            row.innerHTML = `
                <div class="cat-label-wrap">
                    <span class="cat-bullet" style="background:var(--accent-lime)"></span>
                    <span>${method}</span>
                </div>
                <span class="cat-pct">${pct}%</span>
            `;
            paymentEl.appendChild(row);
        });
        if (Object.keys(paymentBreakdown).length === 0) {
            paymentEl.innerHTML = `<div class="cat-list-empty">No data yet</div>`;
        }
    }
}

function buildCategoryBreakdown(expenses) {
    const breakdown = {};
    expenses.forEach(e => {
        breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
    });
    return breakdown;
}

function updateDonutChart(categoryData) {
    const canvas      = document.getElementById("analyticsDonutChart");
    const placeholder = document.getElementById("analyticsDonutPlaceholder");
    if (!canvas) return;

    const labels = Object.keys(categoryData);
    const values = Object.values(categoryData);
    const isDark  = document.documentElement.getAttribute("data-theme") === "dark";

    if (labels.length === 0) {
        canvas.style.display      = "none";
        if (placeholder) placeholder.style.display = "block";
        if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }
        return;
    }

    canvas.style.display = "block";
    if (placeholder) placeholder.style.display = "none";

    const colors = labels.map(l => (CATEGORY_COLORS[l] || CATEGORY_COLORS["Others"]).bg);
    const legendColor = isDark ? "#9ca3af" : "#6b7280";
    const borderCol   = isDark ? "#111114" : "#f3f4f7";

    if (donutChartInstance) {
        donutChartInstance.data.labels                      = labels;
        donutChartInstance.data.datasets[0].data            = values;
        donutChartInstance.data.datasets[0].backgroundColor = colors;
        donutChartInstance.data.datasets[0].borderColor     = borderCol;
        donutChartInstance.options.plugins.legend.labels.color = legendColor;
        donutChartInstance.update();
        return;
    }

    const ctx = canvas.getContext("2d");
    donutChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: borderCol,
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { color: legendColor, font: { size: 12 }, boxWidth: 13, padding: 14 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` Rs.${ctx.raw.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                    }
                }
            },
            cutout: "68%"
        }
    });
}

// =========================================================
// Budget View (VIEW 4)
// =========================================================
function renderBudgetView(expenses) {
    const breakdown = buildCategoryBreakdown(expenses);
    const listEl    = document.getElementById("budgetCategoryList");
    if (!listEl) return;

    listEl.innerHTML = "";

    const allCats = Object.keys(CATEGORY_WEIGHTS);
    if (Object.keys(breakdown).length === 0) {
        listEl.innerHTML = `<div class="cat-list-empty">No expenses recorded yet</div>`;
        return;
    }

    allCats.forEach(cat => {
        const spent   = breakdown[cat] || 0;
        const limit   = getCategoryBudgetLimit(cat);
        const pct     = Math.min(100, Math.round((spent / limit) * 100));
        const catInfo = CATEGORY_COLORS[cat] || CATEGORY_COLORS["Others"];
        const over    = spent > limit;

        const row = document.createElement("div");
        row.className = "budget-cat-row";
        row.innerHTML = `
            <div class="budget-cat-header">
                <div class="budget-cat-name">
                    <span class="cat-bullet" style="background:${catInfo.bg};width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:6px;"></span>
                    ${cat}
                </div>
                <div class="budget-cat-amounts">
                    <span style="font-weight:700;color:${over ? 'var(--danger)' : 'var(--text-main)'};">Rs.${spent.toLocaleString("en-IN")}</span>
                    <span style="color:var(--text-muted);font-size:0.8rem;"> / Rs.${limit.toLocaleString("en-IN")}</span>
                </div>
            </div>
            <div class="spending-progress-bar" style="height:8px;margin-top:6px;">
                <div class="spending-fill" style="width:${pct}%;background:${over ? 'var(--danger)' : catInfo.bg};"></div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;text-align:right;">${pct}% used${over ? ' — over budget' : ''}</div>
        `;
        listEl.appendChild(row);
    });
}

// =========================================================
// Custom Chart.js plugin to draw a single 1px hairline divider ONLY between adjacent stacked categories
// (zero lines at the baseline/bottom, zero lines at the peak/top, zero lines on sides)
const categoryDividersPlugin = {
    id: 'categoryDividers',
    afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const dividerColor = isDark ? "#111114" : "#ffffff";

        ctx.save();
        ctx.strokeStyle = dividerColor;
        ctx.lineWidth = 1;

        const numDatasets = data.datasets.length;
        const numDays = data.labels.length;

        for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
            const activeElements = [];
            for (let dsIdx = 0; dsIdx < numDatasets; dsIdx++) {
                const meta = chart.getDatasetMeta(dsIdx);
                if (meta.hidden) continue;
                const el = meta.data[dayIdx];
                if (el && Math.abs(el.base - el.y) > 0.5) {
                    activeElements.push(el);
                }
            }

            if (activeElements.length <= 1) continue;

            // Sort from bottom to top (in canvas coords, larger y is lower on screen)
            activeElements.sort((a, b) => b.y - a.y);

            // Draw a single 1px hairline divider only between stacked categories
            // Never at the baseline (bottom), and never at the top of the entire bar
            for (let i = 0; i < activeElements.length - 1; i++) {
                const el = activeElements[i];
                const y = Math.round(el.y) + 0.5;
                const halfWidth = el.width / 2;
                const x1 = Math.round(el.x - halfWidth);
                const x2 = Math.round(el.x + halfWidth);

                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
};

// =========================================================
// Stacked Bar Chart (Dashboard Hero)
// =========================================================
function renderBentoChart(expenses) {
    const canvas = document.getElementById("bentoBarChart");
    if (!canvas) return;

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyData = {
        "Food & Dining":      [0, 0, 0, 0, 0, 0, 0],
        "Academics & Books":  [0, 0, 0, 0, 0, 0, 0],
        "Transportation":     [0, 0, 0, 0, 0, 0, 0],
        "Hostel & Utilities": [0, 0, 0, 0, 0, 0, 0],
        "Entertainment":      [0, 0, 0, 0, 0, 0, 0],
        "Healthcare":         [0, 0, 0, 0, 0, 0, 0],
        "Others":             [0, 0, 0, 0, 0, 0, 0]
    };

    (expenses || []).forEach(exp => {
        if (!exp.expense_date) return;
        const dateStr = (exp.expense_date || "").split("T")[0];
        const d       = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
        const dayIdx  = isNaN(d.getDay()) ? 0 : d.getDay();

        const cat = exp.category || "Others";
        if (dailyData[cat]) {
            dailyData[cat][dayIdx] += exp.amount;
        } else {
            dailyData["Others"][dayIdx] += exp.amount;
        }
    });

    const isDark     = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor  = isDark ? "#232328" : "#f0f2f5";
    const labelColor = isDark ? "#6b7280" : "#9ca3af";

    const datasets = [
        { label: "Food & Dining",      data: dailyData["Food & Dining"],      backgroundColor: "#fb923c",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Academics & Books",  data: dailyData["Academics & Books"],  backgroundColor: isDark ? "#bef264" : "#a3e635", borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Transportation",     data: dailyData["Transportation"],     backgroundColor: "#38bdf8",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Hostel & Utilities", data: dailyData["Hostel & Utilities"], backgroundColor: "#c084fc",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Entertainment",      data: dailyData["Entertainment"],      backgroundColor: "#f472b6",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Healthcare",         data: dailyData["Healthcare"],         backgroundColor: "#34d399",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 },
        { label: "Others",             data: dailyData["Others"],             backgroundColor: "#9ca3af",                      borderWidth: 0, borderRadius: 0, barPercentage: 0.55 }
    ];

    // If chart already exists with same number of datasets, update data smoothly in-place with animation
    if (bentoChartInstance && bentoChartInstance.data.datasets.length === datasets.length) {
        datasets.forEach((ds, idx) => {
            bentoChartInstance.data.datasets[idx].data = ds.data;
            bentoChartInstance.data.datasets[idx].backgroundColor = ds.backgroundColor;
            bentoChartInstance.data.datasets[idx].borderWidth = 0;
            bentoChartInstance.data.datasets[idx].borderRadius = 0;
        });
        bentoChartInstance.options.scales.x.ticks.color = labelColor;
        bentoChartInstance.options.scales.y.ticks.color = labelColor;
        bentoChartInstance.options.scales.y.grid.color = gridColor;
        bentoChartInstance.update();
        return;
    }

    if (bentoChartInstance) {
        bentoChartInstance.destroy();
        bentoChartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    bentoChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: days,
            datasets: datasets
        },
        plugins: [categoryDividersPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 450 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: item => item.raw > 0,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: Rs.${ctx.raw.toLocaleString("en-IN")}`
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { display: false },  ticks: { color: labelColor, font: { size: 11, weight: 600 } }, border: { display: false } },
                y: { stacked: true, grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 10 }, callback: v => `Rs.${v}` }, border: { display: false } }
            }
        }
    });
}

// =========================================================
// Modals & CRUD
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

    const saveBtn     = document.getElementById("saveButton");
    saveBtn.disabled  = true;
    saveBtn.innerText = "Saving…";

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
// CSV Export
// =========================================================
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
        `"${(e.notes || "").replace(/"/g, '""')}"`
    ]);
    const csv  = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `CampusSpend_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV!", "success");
}

// =========================================================
// Search
// =========================================================
function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(fetchExpenses, 280);
}

// =========================================================
// Toast Notifications
// =========================================================
function showToast(message, type = "info") {
    const area = document.getElementById("toastArea");
    if (!area) return;

    const toast = document.createElement("div");
    let cls  = "toast-msg";
    let icon = "";

    if (type === "success") {
        cls  = "toast-msg toast-success";
        icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4.5-4.5 1.41-1.41L10 13.67l7.18-7.18 1.41 1.41L10 16.5z"/></svg>`;
    } else if (type === "error") {
        cls  = "toast-msg toast-error";
        icon = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
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

// =========================================================
// Utilities
// =========================================================
function fmt(val)    { return `Rs.${(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`; }
function fmtInt(val) { return `Rs.${(val || 0).toLocaleString("en-IN")}`; }

function setInner(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function setStyle(id, prop, val) {
    const el = document.getElementById(id);
    if (el) el.style[prop] = val;
}

function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[c]);
}
