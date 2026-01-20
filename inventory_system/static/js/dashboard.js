const msg = document.getElementById("msg");
const show = (t, type = "success") => {
  // Toast first ✅
  const toastType = type === "danger" ? "error" : type;
  window.ui?.toast(t, toastType);

  // Optional inline message (kept for accessibility / page context)
  if (msg) msg.innerHTML = `<div class="alert alert-${type}">${t}</div>`;
};

let revenueChartInstance = null;
let range = "today"; // default

function setActiveRangeUI(r) {
  document.querySelectorAll(".range-btn").forEach(btn => {
    btn.classList.remove("active", "btn-primary");
    btn.classList.add("btn-outline-primary");
  });

  const activeBtn = document.querySelector(`[data-range="${r}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active", "btn-primary");
    activeBtn.classList.remove("btn-outline-primary");
  }
}

function renderTopProducts(rows) {
  const body = document.getElementById("topProductsBody");
  if (!body) return;

  if (!rows || !rows.length) {
    body.innerHTML = `<tr><td colspan="3" class="text-muted text-center">No data</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(r => `
    <tr>
      <td>${r.product_name || r.product || "-"}</td>
      <td class="text-end">${r.qty ?? 0}</td>
      <td class="text-end">$ ${Number(r.revenue ?? 0).toFixed(2)}</td>
    </tr>
  `).join("");
}

function renderRecentOrders(rows) {
  const body = document.getElementById("recentOrdersBody");
  if (!body) return;

  if (!rows || !rows.length) {
    body.innerHTML = `<tr><td colspan="4" class="text-muted text-center">No orders</td></tr>`;
    return;
  }

  body.innerHTML = rows.map(o => {
    const raw = o.status ?? "Pending";
    const status = String(raw).trim().toLowerCase();

    let badgeClass = "bg-warning text-dark"; // Pending default
    if (status === "completed") badgeClass = "bg-success";
    else if (status === "cancelled" || status === "canceled") badgeClass = "bg-danger";
    else if (status === "processing") badgeClass = "bg-info text-dark";

    return `
      <tr>
        <td>${o.order_code || o.code || "-"}</td>
        <td><span class="badge ${badgeClass}">${raw}</span></td>
        <td class="text-end">$ ${Number(o.total ?? 0).toFixed(2)}</td>
        <td>${o.created_at || "-"}</td>
      </tr>
    `;
  }).join("");
}

async function loadDashboardSummary() {
  try {
    const res = await fetch(`/api/dashboard/summary?range=${range}`);
    const data = await res.json();

    document.getElementById("kpiProducts").innerText = data.total_products ?? 0;
    document.getElementById("kpiCustomers").innerText = data.total_customers ?? 0;
    document.getElementById("kpiLowStock").innerText = data.low_stock ?? 0;
    document.getElementById("kpiRevenue").innerText = "$ " + Number(data.total_revenue ?? 0).toFixed(2);

    renderTopProducts(data.top_products || []);
    renderRecentOrders(data.recent_orders || []);
  } catch (err) {
    console.error("Dashboard summary error:", err);
    show(err.message || "Failed to load dashboard summary", "danger");
  }
}

async function loadRevenueChart() {
  try {
    const res = await fetch(`/api/dashboard/revenue_by_date?range=${range}`);
    const data = await res.json();

    const labels = data.labels || [];
    const values = data.values || [];

    const emptyEl = document.getElementById("chartEmpty");
    const canvas = document.getElementById("revenueChart");
    if (!canvas) return;

    if (!labels.length) {
      if (emptyEl) emptyEl.style.display = "block";
      if (revenueChartInstance) revenueChartInstance.destroy();
      return;
    } else {
      if (emptyEl) emptyEl.style.display = "none";
    }

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Revenue ($)",
          data: values,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (err) {
    console.error("Revenue chart error:", err);
    show(err.message || "Failed to load chart", "danger");
  }
}

async function refreshDashboard() {
  setActiveRangeUI(range);
  await loadDashboardSummary();
  await loadRevenueChart();
}

async function getMe() {
  const res = await fetch("/api/me");
  return await res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const me = await getMe();
  if (!me.logged_in) return window.location.href = "/";

  document.getElementById("roleLine").textContent = `${me.username} (${me.role})`;

  if (me.role === "manager") {
    const box = document.getElementById("addProductBox");
    if (box) box.style.display = "none";
  }

  document.querySelectorAll(".range-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      range = btn.dataset.range;
      refreshDashboard();
    });
  });

  refreshDashboard();
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  show("Logged out");
  window.location.href = "/";
});
