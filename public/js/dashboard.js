requireAuth();

const user = getCurrentUser();
let salesChartInstance = null;

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

async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      headers: authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load dashboard");
    }

    document.getElementById("totalProducts").textContent = data.totalProducts ?? 0;
    document.getElementById("inventoryValue").textContent = peso(data.inventoryValue || 0);
    document.getElementById("totalSales").textContent = peso(data.totalSales || 0);
    document.getElementById("totalProfit").textContent = peso(data.totalProfit || 0);
    document.getElementById("lowStockItems").textContent = data.lowStockItems ?? 0;
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function loadRecentSales() {
  try {
    const response = await fetch(`${API_BASE_URL}/sales`, {
      headers: authHeaders()
    });

    const sales = await response.json();

    if (!response.ok) {
      throw new Error(sales.message || "Failed to load recent sales");
    }

    const table = document.getElementById("recentSalesTable");
    const recentSalesCount = document.getElementById("recentSalesCount");

    recentSalesCount.textContent = sales.length;

    if (!sales.length) {
      table.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">No recent sales yet.</td>
        </tr>
      `;
      return;
    }

    table.innerHTML = sales.slice(0, 6).map(sale => `
      <tr>
        <td>${formatDate(sale.sale_date)}</td>
        <td>${escapeHtml(sale.product_name)}</td>
        <td>${escapeHtml(sale.customer_name || "Walk-in Customer")}</td>
        <td>${Number(sale.kilos_sold || 0).toFixed(2)} kg</td>
        <td><strong>${peso(sale.total_amount || 0)}</strong></td>
      </tr>
    `).join("");
  } catch (error) {
    console.error(error);
  }
}

async function loadSalesChart() {
  try {
    const response = await fetch(`${API_BASE_URL}/sales`, {
      headers: authHeaders()
    });

    const sales = await response.json();

    if (!response.ok) {
      throw new Error(sales.message || "Failed to load chart data");
    }

    const totals = {};

    sales.forEach((sale) => {
      const date = new Date(sale.sale_date).toLocaleDateString();
      if (!totals[date]) totals[date] = 0;
      totals[date] += Number(sale.total_amount || 0);
    });

    const labels = Object.keys(totals).reverse();
    const values = Object.values(totals).reverse();

    if (salesChartInstance) {
      salesChartInstance.destroy();
    }

    salesChartInstance = new Chart(document.getElementById("salesChart"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Sales",
          data: values,
          borderColor: "#5b8def",
          backgroundColor: "rgba(91, 141, 239, 0.10)",
          fill: true,
          tension: 0,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: "#5b8def",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1f2937",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            padding: 10,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Sales: ${peso(context.raw)}`;
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: "index"
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: "#7b8794",
              font: { size: 11 }
            },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#7b8794",
              font: { size: 11 },
              callback: (value) => "₱" + value
            },
            grid: {
              color: "rgba(148, 163, 184, 0.15)",
              drawBorder: false
            },
            border: { display: false }
          }
        }
      }
    });
  } catch (error) {
    console.error(error);
  }
}

async function loadLowStockList() {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      headers: authHeaders()
    });

    const products = await response.json();

    if (!response.ok) {
      throw new Error(products.message || "Failed to load low stock data");
    }

    const lowStock = products.filter(
      item => Number(item.stock_sacks || 0) <= Number(item.reorder_level_sacks || 0)
    );

    const list = document.getElementById("lowStockList");

    if (!lowStock.length) {
      list.innerHTML = `<li class="stock-ok">All products are sufficiently stocked.</li>`;
      return;
    }

    list.innerHTML = lowStock.map(item => `
      <li>
        <div class="stock-name">${escapeHtml(item.product_name)}</div>
        <div class="stock-meta">
          ${Number(item.stock_sacks || 0).toFixed(2)} sacks
          <span>•</span>
          ${Number(item.stock_kilos || 0).toFixed(2)} kg
        </div>
      </li>
    `).join("");
  } catch (error) {
    console.error(error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadDashboard();
loadRecentSales();
loadSalesChart();
loadLowStockList();