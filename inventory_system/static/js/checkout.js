// ===== checkout.js (WORKING + DEBUG SAFE) =====
console.log("✅ checkout.js loaded");

const CART_KEY = "omnicart_cart";

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
function money(n) {
  return `$${toNum(n).toFixed(2)}`;
}

function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, it) => sum + toNum(it.qty), 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = totalQty;
}

let discount = 0;
let shipping = 0;

function calcSubtotal(cart) {
  return cart.reduce((sum, it) => sum + toNum(it.price) * toNum(it.qty), 0);
}

function updateTotals(subtotal) {
  const subEl = document.getElementById("subTotal");
  const shipEl = document.getElementById("shipFee");
  const discEl = document.getElementById("discountAmt");
  const grandEl = document.getElementById("grandTotal");

  if (subEl) subEl.textContent = money(subtotal);
  if (shipEl) shipEl.textContent = money(shipping);
  if (discEl) discEl.textContent = `-${money(discount)}`;
  if (grandEl) grandEl.textContent = money(Math.max(0, subtotal + shipping - discount));
}

function renderSummary() {
  const wrap = document.getElementById("summaryItems");
  if (!wrap) return;

  const cart = getCart();

  if (!cart.length) {
    wrap.innerHTML = `<div class="text-muted">Your cart is empty.</div>`;
    updateTotals(0);
    return;
  }

  wrap.innerHTML = cart.map(it => `
    <div class="summary-item">
      <div>
        <p class="summary-title mb-1">${it.product_name || "Item"}</p>
        <div class="small text-muted">Qty: ${toNum(it.qty)}</div>
      </div>
      <div class="summary-price">${money(toNum(it.price) * toNum(it.qty))}</div>
    </div>
  `).join("");

  updateTotals(calcSubtotal(cart));
}

function applyDiscount() {
  const code = (document.getElementById("discountCode")?.value || "").trim().toUpperCase();
  const hint = document.getElementById("discountHint");

  const subtotal = calcSubtotal(getCart());

  if (code === "WELCOME10") {
    discount = subtotal * 0.10;
    if (hint) hint.textContent = "✅ 10% discount applied.";
  } else if (!code) {
    discount = 0;
    if (hint) hint.textContent = "";
  } else {
    discount = 0;
    if (hint) hint.textContent = "❌ Invalid code.";
  }

  updateTotals(subtotal);
}

function showError(msg) {
  const box = document.getElementById("checkoutError");
  if (!box) return;
  box.classList.remove("d-none");
  box.textContent = msg;
}

function clearError() {
  const box = document.getElementById("checkoutError");
  if (!box) return;
  box.classList.add("d-none");
  box.textContent = "";
}

async function placeOrder() {
  clearError();

  const name = (document.getElementById("custName")?.value || "").trim();
  const phone = (document.getElementById("custPhone")?.value || "").trim();
  const email = (document.getElementById("custEmail")?.value || "").trim();
  const address = (document.getElementById("shipAddress")?.value || "").trim();

  if (!name) return showError("Full name is required.");
  if (!phone) return showError("Phone number is required.");
  if (!address) return showError("Address is required.");

  const cart = getCart();
  if (!cart.length) return showError("Your cart is empty.");

  const items = cart.map(it => ({
    product_id: it.product_id ?? it.id,
    qty: toNum(it.qty)
  }));

  try {
    const res = await fetch("/api/public/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name, phone, email, address },
        items
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      return showError(data.message || "Checkout failed.");
    }

    // ✅ success
    saveCart([]);
    updateCartBadge();

    const code = data.order_code || data.order || data.code || "";
    window.location.href = `/thank-you?order=${encodeURIComponent(code)}`;
  } catch (e) {
    showError("Network error. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready: wiring buttons");

  renderSummary();
  updateCartBadge();

  document.getElementById("applyDiscountBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    applyDiscount();
  });

  document.getElementById("discountCode")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyDiscount();
    }
  });

  document.getElementById("checkoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    placeOrder();
  });
});
