requireAuth();

const user = getCurrentUser();
if (user) {
  const welcomeUser = document.getElementById("welcomeUser");
  if (welcomeUser) {
    welcomeUser.innerHTML = `
      <div class="role-badge">
        👑 <span>${user.full_name}</span>
        <small>(${user.role})</small>
      </div>
    `;
  }
}

const API_URL = `${API_BASE_URL}/products`;

const productForm = document.getElementById("productForm");
const productTable = document.getElementById("productsTable");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");

let editingId = null;
let productsCache = [];

async function loadProducts() {
  try {
    const res = await fetch(API_URL, {
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load products");
    }

    productsCache = data;
    renderProducts(data);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function getStatus(product) {
  const stock = Number(product.stock_sacks || 0);
  const reorder = Number(product.reorder_level_sacks || 0);

  if (stock <= 0) {
    return { label: "Out of Stock", className: "danger" };
  }

  if (stock <= reorder) {
    return { label: "Low Stock", className: "warning" };
  }

  return { label: "Available", className: "success" };
}

function renderProducts(products) {
  if (!products.length) {
    productTable.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">No products found.</td>
      </tr>
    `;
    return;
  }

  productTable.innerHTML = products.map(product => {
    const status = getStatus(product);

    return `
      <tr>
        <td>${escapeHtml(product.product_name || "-")}</td>
        <td>${escapeHtml(product.category || "-")}</td>
        <td>${peso(product.cost_per_sack || 0)}</td>
        <td>${peso(product.selling_price_per_kilo || 0)}</td>
        <td>${Number(product.kilos_per_sack || 0).toFixed(2)} kg</td>
        <td>${Number(product.stock_sacks || 0).toFixed(2)}</td>
        <td>${Number(product.stock_kilos || 0).toFixed(2)} kg</td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td>
          <div class="action-buttons">
            <button type="button" class="btn-action btn-edit" data-id="${product.id}">Edit</button>
            <button type="button" class="btn-action btn-delete" data-id="${product.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function editProductById(id) {
  const product = productsCache.find(item => Number(item.id) === Number(id));
  if (!product) {
    alert("Product not found");
    return;
  }

  editingId = product.id;

  document.getElementById("product_name").value = product.product_name || "";
  document.getElementById("category").value = product.category || "Regular";
  document.getElementById("cost_per_sack").value = product.cost_per_sack || 0;
  document.getElementById("selling_price_per_kilo").value = product.selling_price_per_kilo || 0;
  document.getElementById("kilos_per_sack").value = product.kilos_per_sack || 50;
  document.getElementById("stock_sacks").value = product.stock_sacks || 0;
  document.getElementById("reorder_level_sacks").value = product.reorder_level_sacks || 5;
  document.getElementById("description").value = product.description || "";

  formTitle.textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
  cancelEditBtn.style.display = "inline-flex";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteProductById(id) {
  const product = productsCache.find(item => Number(item.id) === Number(id));

  const confirmDelete = confirm(
    `Delete product${product ? `: ${product.product_name}` : ""}?`
  );

  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers: authHeaders()
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete product");
    }

    alert(data.message || "Product deleted successfully");

    if (editingId === Number(id)) {
      resetForm();
    }

    await loadProducts();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function resetForm() {
  editingId = null;
  productForm.reset();
  document.getElementById("kilos_per_sack").value = 50;
  document.getElementById("reorder_level_sacks").value = 5;

  formTitle.textContent = "Add Product";
  saveBtn.textContent = "Save Product";
  cancelEditBtn.style.display = "none";
}

productTable.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".btn-edit");
  const deleteBtn = e.target.closest(".btn-delete");

  if (editBtn) {
    const id = editBtn.dataset.id;
    editProductById(id);
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    deleteProductById(id);
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    product_name: document.getElementById("product_name").value.trim(),
    category: document.getElementById("category").value,
    cost_per_sack: document.getElementById("cost_per_sack").value,
    selling_price_per_kilo: document.getElementById("selling_price_per_kilo").value,
    kilos_per_sack: document.getElementById("kilos_per_sack").value,
    stock_sacks: document.getElementById("stock_sacks").value,
    reorder_level_sacks: document.getElementById("reorder_level_sacks").value,
    description: document.getElementById("description").value.trim()
  };

  try {
    let res;

    if (editingId) {
      res = await fetch(`${API_URL}/${editingId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(API_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save product");
    }

    alert(data.message || "Product saved successfully");
    resetForm();
    await loadProducts();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadProducts();