// sales.js (FIX undefined fields)

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

async function loadSales() {
  const tbody = document.getElementById("salesBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/sales");
    const sales = await res.json();

    if (!Array.isArray(sales) || sales.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No sales yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = sales.map(s => {
      const saleId = s.id ?? s.sale_id ?? s.saleId ?? "";
      const customer = s.customer_name ?? s.customer ?? (s.customer_id ? `#${s.customer_id}` : "");
      const product = s.product_name ?? s.product ?? "";
      const qty = s.quantity ?? s.qty ?? "";
      const total = s.total_price ?? s.total ?? 0;
      const date = s.sale_date ?? s.date ?? "";

      return `
        <tr>
          <td>${esc(saleId)}</td>
          <td>${esc(customer)}</td>
          <td>${esc(product)}</td>
          <td class="text-end">${esc(qty)}</td>
          <td class="text-end">${n(total).toFixed(2)}</td>
          <td>${esc(date)}</td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("loadSales error:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load sales.</td></tr>`;
  }
}

// call it (if you don't already)
loadSales();
