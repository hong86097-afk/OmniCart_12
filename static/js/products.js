let ALL_PRODUCTS = [];
let USER_ROLE = "staff";

async function getMeRole() {
  const res = await fetch("/api/me");
  const me = await res.json();
  USER_ROLE = me.role || "staff";
}

function safeStr(x) {
  return String(x ?? "").replaceAll("'", "\\'");
}

function renderProducts(list) {
  const tbody = document.getElementById("productsBody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No products</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => {
    const id = p.id ?? p.product_id;
    const name = p.product_name ?? "";
    const category = p.category ?? "";
    const price = Number(p.price ?? 0);
    const qty = Number(p.quantity ?? 0);

    const lowClass = qty <= 5 ? "table-warning" : "";
    const lowBadge = qty <= 5 ? `<span class="badge bg-danger ms-2">LOW</span>` : "";
    const updated = p.updated_at ?? p.last_updated ?? "";
    const canEdit = USER_ROLE === "staff";

    return `
      <tr class="${lowClass}">
        <td>${id ?? ""}</td>
        <td>${name}${lowBadge}</td>
        <td>${category}</td>
        <td class="text-end">$ ${price.toFixed(2)}</td>
        <td class="text-end fw-bold">${qty}</td>
        <td>${updated}</td>
        <td>
          ${canEdit ? `
            <button class="btn btn-sm btn-warning me-1"
              onclick="editProduct(${Number(id)}, '${safeStr(name)}', '${safeStr(category)}', ${price}, ${qty})">
              Edit
            </button>
            <button class="btn btn-sm btn-danger"
              onclick="deleteProduct(${Number(id)})">
              Delete
            </button>
          ` : `<span class="text-muted">View only</span>`}
        </td>
      </tr>
    `;
  }).join("");
}

async function loadProducts() {
  const res = await fetch("/api/products");
  ALL_PRODUCTS = await res.json();
  renderProducts(ALL_PRODUCTS);
}

document.getElementById("searchBox")?.addEventListener("input", (e) => {
  const q = (e.target.value || "").toLowerCase();

  const filtered = ALL_PRODUCTS.filter(p => {
    const name = String(p.product_name ?? "").toLowerCase();
    const cat = String(p.category ?? "").toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

  renderProducts(filtered);
});

const addForm = document.getElementById("addProductForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = addForm.querySelector('button[type="submit"]');
    window.ui?.setBtnLoading(submitBtn, true, "Adding...");

    const payload = Object.fromEntries(new FormData(addForm).entries());
    payload.price = Number(payload.price);
    payload.quantity = Number(payload.quantity);

    try {
      await window.ui.fetchJSON("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      window.ui?.toast("Product added ✅", "success");
      addForm.reset();
      loadProducts();
    } catch (err) {
      window.ui?.toast(err.message || "Add failed", "error");
    } finally {
      window.ui?.setBtnLoading(submitBtn, false);
    }
  });
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;

  try {
    await window.ui.fetchJSON(`/api/products/${id}`, { method: "DELETE" });
    window.ui?.toast("Deleted ✅", "success");
    loadProducts();
  } catch (err) {
    window.ui?.toast(err.message || "Delete failed", "error");
  }
}

async function editProduct(id, name, category, price, qty) {
  const newName = prompt("Product Name:", name);
  if (newName === null) return;

  const newCategory = prompt("Category:", category);
  if (newCategory === null) return;

  const newPrice = prompt("Price:", price);
  if (newPrice === null) return;

  const newQty = prompt("Quantity:", qty);
  if (newQty === null) return;

  const payload = {
    product_name: newName,
    category: newCategory,
    price: Number(newPrice),
    quantity: Number(newQty),
  };

  try {
    await window.ui.fetchJSON(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    window.ui?.toast("Updated ✅", "success");
    loadProducts();
  } catch (err) {
    window.ui?.toast(err.message || "Update failed", "error");
  }
}

(async () => {
  await getMeRole();
  await loadProducts();
})();
