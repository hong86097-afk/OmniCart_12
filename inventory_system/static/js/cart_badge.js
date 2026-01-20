// cart_badge.js
window.CART_KEY = "omnicart_cart";


function updateCartCount(){
  const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  const count = cart.reduce((s,i)=> s + Number(i.qty||0), 0);
  const el = document.getElementById("cartCount");
  if (el) el.textContent = count;
}

document.addEventListener("DOMContentLoaded", updateCartCount);
window.addEventListener("storage", updateCartCount);
