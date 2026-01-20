function money(x){
  return Number(x || 0).toFixed(2);
}

function getStatusBadgeClass(status){
  const raw = status ?? "Pending";
  const s = String(raw).trim().toLowerCase();

  // 🟡 default (Pending)
  if (s === "pending") return "bg-warning text-dark";

  // 🟢 Completed
  if (s === "completed") return "bg-success";

  // 🔴 Cancelled (support both spellings)
  if (s === "cancelled" || s === "canceled") return "bg-danger";

  // fallback
  return "bg-secondary";
}

async function loadDashboardSummary(){
  const res = await fetch("/api/dashboard/summary");
  const data = await res.json();

  // KPI
  const p = document.getElementById("kpiProducts");
  const low = document.getElementById("kpiLowStock");
  const rev = document.getElementById("kpiRevenue");

  if (p) p.textContent = data.total_products ?? "-";
  if (low) low.textContent = data.low_stock ?? "-";
  if (rev) rev.textContent = "$ " + money(data.total_revenue);

  // Top products
  const topBody = document.getElementById("topProductsBody");
  if (topBody){
    const rows = (data.top_products || []).map(x => `
      <tr>
        <td>${x.product_name}</td>
        <td class="text-end">${x.qty}</td>
        <td class="text-end">$ ${money(x.revenue)}</td>
      </tr>
    `).join("");
    topBody.innerHTML = rows || `<tr><td colspan="3" class="text-muted text-center">No data</td></tr>`;
  }

  // Recent orders
  const recentBody = document.getElementById("recentOrdersBody");
  if (recentBody){
    const rows = (data.recent_orders || [])
      .slice()
      .reverse()
      .map(o => {
        const statusText = o.status || "Pending";
        const badgeClass = getStatusBadgeClass(statusText);

        return `
          <tr>
            <td>${o.order_code || "-"}</td>
            <td><span class="badge ${badgeClass}">${statusText}</span></td>
            <td class="text-end">$ ${money(o.total)}</td>
            <td>${o.created_at || "-"}</td>
          </tr>
        `;
      })
      .join("");

    recentBody.innerHTML = rows || `<tr><td colspan="4" class="text-muted text-center">No data</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", loadDashboardSummary);
