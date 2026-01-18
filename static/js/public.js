// ===== public.js (FINAL CLEAN - NO CHIPS) =====
let ALL = [];

// ---------- CART (localStorage) ----------
const CART_KEY = "omnicart_cart";

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}
function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, it) => sum + Number(it.qty || 0), 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = totalQty;
}

function showCartToast() {
  const toastEl = document.getElementById("cartToast");
  if (!toastEl) return;
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(x => x.product_id === item.product_id);

  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  updateCartBadge();
  showCartToast();
}

// ---------- Helpers ----------
function formatMoney(x) {
  return Number(x || 0).toFixed(2);
}

function clearFilters(){
  const s = document.getElementById("publicSearch");
  const c = document.getElementById("publicCategory");
  const sort = document.getElementById("publicSort");

  if (s) s.value = "";
  if (c) c.value = "";
  if (sort) sort.value = "default";

  applyFilter();
}

function sortProducts(arr){
  const sort = document.getElementById("publicSort")?.value || "default";
  const a = [...arr];

  if (sort === "price_asc") a.sort((x,y)=>Number(x.price||0)-Number(y.price||0));
  else if (sort === "price_desc") a.sort((x,y)=>Number(y.price||0)-Number(x.price||0));
  else if (sort === "name_asc") a.sort((x,y)=>String(x.product_name||"").localeCompare(String(y.product_name||"")));
  else if (sort === "name_desc") a.sort((x,y)=>String(y.product_name||"").localeCompare(String(x.product_name||"")));

  return a;
}

function renderCategories(products) {
  const catSelect = document.getElementById("publicCategory");
  if (!catSelect) return;

  const cats = [...new Set(products.map(p => p.category))].filter(Boolean).sort();
  catSelect.innerHTML =
    `<option value="">All Categories</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderGrid(products) {
  const grid = document.getElementById("publicGrid");
  const countEl = document.getElementById("resultCount");

  if (countEl) countEl.textContent = `Showing ${products.length} of ${ALL.length}`;

  if (!products.length) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="card shadow-sm rounded-4">
          <div class="card-body text-center py-5">
            <div style="font-size:42px;">🔍</div>
            <div class="fw-bold fs-5 mt-2">No products found</div>
            <div class="text-muted mt-1">
              Try clearing search or changing category.
            </div>
            <button class="btn btn-dark mt-3" id="emptyClearBtn">
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("emptyClearBtn")?.addEventListener("click", clearFilters);
    return;
  }

  grid.innerHTML = products.map(p => {
    const qty = Number(p.quantity || 0);

    const badgeClass = qty === 0
      ? "bg-secondary"
      : (qty <= 5 ? "bg-danger" : "bg-primary");

    const badgeText = qty === 0 ? "Out of stock" : `Stock: ${qty}`;

    return `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="card shadow-sm h-100 rounded-4 product-card" role="button"
          data-id="${p.id}"
          data-name="${p.product_name}"
          data-category="${p.category || ''}"
          data-price="${p.price}"
          data-qty="${p.quantity}"
          data-image="${p.image || 'default.jpg'}">

          ${qty > 0 && qty <= 5 ? `<div class="low-stock-ribbon">Low Stock</div>` : ""}
          ${qty === 0 ? `<div class="oos-overlay">OUT OF STOCK</div>` : ""}

          <div class="product-img"
            style="background-image:url('/static/assets/products/${p.image || "default.jpg"}')">
          </div>

          <div class="card-body">
            <div class="fw-bold">${p.product_name}</div>
            <div class="text-muted small">${p.category || ""}</div>

            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="fw-bold">$ ${formatMoney(p.price)}</div>
              <span class="badge ${badgeClass}">${badgeText}</span>
            </div>

            <button class="btn btn-sm btn-success w-100 mt-2 add-cart-btn"
              ${qty === 0 ? "disabled" : ""}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => {
      openProduct({
        product_name: card.dataset.name,
        category: card.dataset.category,
        price: card.dataset.price,
        quantity: card.dataset.qty,
        image: card.dataset.image
      });
    });
  });

  grid.querySelectorAll(".add-cart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".product-card");
      addToCart({
        product_id: Number(card.dataset.id),
        product_name: card.dataset.name,
        price: Number(card.dataset.price),
        image: card.dataset.image,
        qty: 1
      });
    });
  });
}

function applyFilter(){
  const q = (document.getElementById("publicSearch")?.value || "").toLowerCase();
  const catDrop = document.getElementById("publicCategory")?.value || "";

  let filtered = [...ALL];

  if (q){
    filtered = filtered.filter(p =>
      String(p.product_name || "").toLowerCase().includes(q)
    );
  }

  if (catDrop){
    filtered = filtered.filter(p => (p.category || "") === catDrop);
  }

  filtered = sortProducts(filtered);
  renderGrid(filtered);
}

(async () => {
  const res = await fetch("/api/public/products");
  const products = await res.json();

  ALL = products;

  renderCategories(ALL);
  renderGrid(ALL);
  updateCartBadge();

  document.getElementById("publicSearch")?.addEventListener("input", applyFilter);
  document.getElementById("publicCategory")?.addEventListener("change", applyFilter);
  document.getElementById("publicSort")?.addEventListener("change", applyFilter);
  document.getElementById("clearFilters")?.addEventListener("click", clearFilters);
})();

function openProduct(p) {
  document.getElementById("modalTitle").innerText = p.product_name;
  document.getElementById("modalName").innerText = p.product_name;
  document.getElementById("modalCategory").innerText = p.category || "";
  document.getElementById("modalStock").innerText = `Stock: ${p.quantity}`;
  document.getElementById("modalPrice").innerText = `$ ${formatMoney(p.price)}`;

  const img = p.image || "default.jpg";
  document.getElementById("modalImg").src = `/static/assets/products/${img}`;

  document.getElementById("modalContact").href =
    `https://t.me/yourtelegramusername?text=I want to order: ${encodeURIComponent(p.product_name)}`;

  const modal = new bootstrap.Modal(document.getElementById("productModal"));
  modal.show();
}
