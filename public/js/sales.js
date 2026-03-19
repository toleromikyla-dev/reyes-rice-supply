requireAuth();

const form = document.getElementById("saleForm");
const productSelect = document.getElementById("product_id");
const kilosInput = document.getElementById("kilos_sold");
const priceDisplay = document.getElementById("display_price_per_kilo");
const stockDisplay = document.getElementById("available_stock");
const estimatedTotal = document.getElementById("estimated_total");
const salesTable = document.getElementById("salesTable");

let productsCache = [];

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      headers: authHeaders()
    });

    const products = await response.json();

    if (!response.ok) {
      throw new Error(products.message || "Failed to load products");
    }

    productsCache = products;

    productSelect.innerHTML = products.map(p => `
      <option value="${p.id}">
        ${p.product_name} - ${Number(p.stock_sacks).toFixed(2)} sack(s) / ${Number(p.stock_kilos).toFixed(2)} kg
      </option>
    `).join("");

    updateSelectedProductInfo();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function getSelectedProduct() {
  const selectedId = Number(productSelect.value);
  return productsCache.find(p => Number(p.id) === selectedId);
}

function updateSelectedProductInfo() {
  const product = getSelectedProduct();

  if (!product) {
    priceDisplay.value = "";
    stockDisplay.value = "";
    estimatedTotal.value = "";
    return;
  }

  priceDisplay.value = Number(product.selling_price_per_kilo).toFixed(2);
  stockDisplay.value = `${Number(product.stock_sacks).toFixed(2)} sack(s) / ${Number(product.stock_kilos).toFixed(2)} kg`;
  updateEstimate();
}

function updateEstimate() {
  const product = getSelectedProduct();
  const kilos = Number(kilosInput.value || 0);

  if (!product || kilos <= 0) {
    estimatedTotal.value = peso(0);
    return;
  }

  const total = kilos * Number(product.selling_price_per_kilo);
  estimatedTotal.value = peso(total);
}

productSelect.addEventListener("change", updateSelectedProductInfo);
kilosInput.addEventListener("input", updateEstimate);

async function loadSales() {
  try {
    const response = await fetch(`${API_BASE_URL}/sales`, {
      headers: authHeaders()
    });

    const sales = await response.json();

    if (!response.ok) {
      throw new Error(sales.message || "Failed to load sales");
    }

    salesTable.innerHTML = sales.map(s => `
      <tr>
        <td>${formatDate(s.sale_date)}</td>
        <td>${s.product_name}</td>
        <td>${s.customer_name}</td>
        <td>${Number(s.kilos_sold).toFixed(2)} kg</td>
        <td>${Number(s.equivalent_sacks).toFixed(2)} sack(s)</td>
        <td>${peso(s.total_amount)}</td>
        <td>${peso(s.profit)}</td>
        <td>${s.recorded_by}</td>
      </tr>
    `).join("");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    product_id: productSelect.value,
    customer_name: document.getElementById("customer_name").value.trim() || "Walk-in Customer",
    kilos_sold: kilosInput.value
  };

  try {
    const response = await fetch(`${API_BASE_URL}/sales`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to record sale");
    }

    alert(
      `Sale recorded successfully\n` +
      `Total: ${peso(data.total_amount)}\n` +
      `Profit: ${peso(data.profit)}`
    );

    form.reset();
    document.getElementById("customer_name").value = "Walk-in Customer";
    estimatedTotal.value = peso(0);

    await loadProducts();
    await loadSales();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

loadProducts();
loadSales();