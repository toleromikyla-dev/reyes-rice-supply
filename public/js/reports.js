requireAuth();

let salesCache = [];

async function loadInventoryReport() {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/inventory`, {
      headers: authHeaders()
    });

    const inventory = await response.json();

    if (!response.ok) {
      throw new Error(inventory.message || "Failed to load inventory report");
    }

    const table = document.getElementById("inventoryReportTable");

    table.innerHTML = inventory.map(item => {
      let status = "Available";

      if (Number(item.stock_sacks) <= 0) {
        status = "Out of Stock";
      } else if (Number(item.stock_sacks) <= Number(item.reorder_level_sacks)) {
        status = "Low Stock";
      }

      return `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.category || "-"}</td>
          <td>${peso(item.cost_per_sack)}</td>
          <td>${peso(item.selling_price_per_kilo)}</td>
          <td>${Number(item.stock_sacks).toFixed(2)} sack(s)</td>
          <td>${Number(item.stock_kilos).toFixed(2)} kg</td>
          <td>${peso(item.stock_value)}</td>
          <td>${status}</td>
        </tr>
      `;
    }).join("");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function loadSalesReport() {
  try {
    const response = await fetch(`${API_BASE_URL}/reports/sales`, {
      headers: authHeaders()
    });

    const sales = await response.json();

    if (!response.ok) {
      throw new Error(sales.message || "Failed to load sales report");
    }

    salesCache = sales;
    renderSalesTable(salesCache);
    updateSummary(salesCache);
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function renderSalesTable(sales) {
  const table = document.getElementById("salesReportTable");

  table.innerHTML = sales.map(sale => `
    <tr>
      <td>${formatDate(sale.sale_date)}</td>
      <td>${sale.product_name}</td>
      <td>${Number(sale.kilos_sold).toFixed(2)} kg</td>
      <td>${Number(sale.equivalent_sacks).toFixed(2)} sack(s)</td>
      <td>${peso(sale.selling_price_per_kilo)}</td>
      <td>${peso(sale.total_amount)}</td>
      <td>${peso(sale.profit)}</td>
      <td>${sale.customer_name}</td>
      <td>${sale.recorded_by}</td>
    </tr>
  `).join("");
}

function updateSummary(sales) {
  const totalSales = sales.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const totalProfit = sales.reduce((sum, item) => sum + Number(item.profit || 0), 0);
  const totalKilos = sales.reduce((sum, item) => sum + Number(item.kilos_sold || 0), 0);

  document.getElementById("summarySales").textContent = peso(totalSales);
  document.getElementById("summaryProfit").textContent = peso(totalProfit);
  document.getElementById("summaryTransactions").textContent = sales.length;
  document.getElementById("summaryKilos").textContent = `${totalKilos.toFixed(2)} kg`;
}

function applyDateFilter() {
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  if (!start || !end) {
    alert("Please select both dates");
    return;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  const filtered = salesCache.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= startDate && saleDate <= endDate;
  });

  renderSalesTable(filtered);
  updateSummary(filtered);
}

function resetFilter() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  renderSalesTable(salesCache);
  updateSummary(salesCache);
}

loadInventoryReport();
loadSalesReport();