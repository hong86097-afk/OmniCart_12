// cart.js (UPDATED UX)
// - Shows empty message when no items
// - Disables checkout when empty
// - Hides clear button when empty
// - Uses one consistent key

const CART_KEY = "omnicart_cart";

function money(x){ return Number(x || 0).toFixed(2); }

function getCart(){
  return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
}

function setCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge(){
  const cart = getCart();
  const count = cart.reduce((s,i)=> s + Number(i.qty || 0), 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.innerText = count;
}

function calcTotals(cart){
  const subtotal = cart.reduce((s,i)=> s + (Number(i.price||0) * Number(i.qty||0)), 0);
  const shipping = subtotal > 0 ? 0 : 0; // demo
  const total = Math.max(0, subtotal + shipping);
  const count = cart.reduce((s,i)=>s+Number(i.qty||0),0);
  return { subtotal, shipping, total, count };
}

function setEmptyState(isEmpty){
  const emptyBox = document.getElementById("cartEmpty");
  const list = document.getElementById("cartList");
  const btnCheckout = document.getElementById("btnCheckout");
  const btnClear = document.getElementById("btnClear");

  if (emptyBox) emptyBox.classList.toggle("d-none", !isEmpty);

  // If empty, remove list HTML
  if (isEmpty && list) list.innerHTML = "";

  // Disable checkout when empty
  if (btnCheckout){
    if (isEmpty){
      btnCheckout.classList.add("disabled");
      btnCheckout.setAttribute("aria-disabled", "true");
      btnCheckout.style.pointerEvents = "none";
      btnCheckout.style.opacity = "0.6";
    }else{
      btnCheckout.classList.remove("disabled");
      btnCheckout.removeAttribute("aria-disabled");
      btnCheckout.style.pointerEvents = "";
      btnCheckout.style.opacity = "";
    }
  }

  // Hide clear button when empty
  if (btnClear){
    btnClear.style.display = isEmpty ? "none" : "";
  }
}

function renderCart(){
  const cart = getCart();

  const list = document.getElementById("cartList");
  const totals = calcTotals(cart);

  // Empty UX
  setEmptyState(cart.length === 0);

  // Render items if any
  if (cart.length && list){
    list.innerHTML = cart.map(item => {
      const img = item.image || "default.jpg";
      const bg = `/static/assets/products/${img}`;
      return `
        <div class="cart-item" data-id="${item.product_id}">
          <div class="cart-thumb" style="background-image:url('${bg}')"></div>

          <div class="cart-info">
            <p class="cart-name">${item.product_name}</p>
            <div class="cart-meta">${item.category || ""}</div>
          </div>

          <div class="cart-price">$ ${money(item.price)}</div>

          <div class="cart-actions">
            <div class="qty-box">
              <button class="qty-btn btnMinus" type="button">−</button>
              <div class="qty-val">${item.qty}</div>
              <button class="qty-btn btnPlus" type="button">+</button>
            </div>

            <button class="remove-btn btnRemove" type="button" title="Remove">×</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Summary numbers
  const elSubtotal = document.getElementById("subtotal");
  const elShipping = document.getElementById("shipping");
  const elTotal = document.getElementById("total");
  const elCount = document.getElementById("summaryCount");

  if (elSubtotal) elSubtotal.innerText = money(totals.subtotal);
  if (elShipping) elShipping.innerText = money(totals.shipping);
  if (elTotal) elTotal.innerText = money(totals.total);
  if (elCount) elCount.innerText = totals.count;

  attachCartEvents();
  updateCartBadge();
}

function attachCartEvents(){
  const list = document.getElementById("cartList");
  if (!list) return;

  list.querySelectorAll(".cart-item").forEach(row => {
    const id = Number(row.dataset.id);

    row.querySelector(".btnPlus")?.addEventListener("click", () => {
      const cart = getCart();
      const item = cart.find(x => Number(x.product_id) === id);
      if (!item) return;
      item.qty = Number(item.qty || 1) + 1;
      setCart(cart);
      renderCart();
    });

    row.querySelector(".btnMinus")?.addEventListener("click", () => {
      const cart = getCart();
      const item = cart.find(x => Number(x.product_id) === id);
      if (!item) return;
      item.qty = Math.max(1, Number(item.qty || 1) - 1);
      setCart(cart);
      renderCart();
    });

    row.querySelector(".btnRemove")?.addEventListener("click", () => {
      const cart = getCart();
      const next = cart.filter(x => Number(x.product_id) !== id);
      setCart(next);
      renderCart();
    });
  });

  document.getElementById("btnClear")?.addEventListener("click", () => {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    renderCart();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});

// keep badge updated if cart changes in another tab/page
window.addEventListener("storage", () => {
  renderCart();
});
