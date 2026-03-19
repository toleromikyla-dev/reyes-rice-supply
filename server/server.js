const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { verifyToken, SECRET_KEY } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

/* LOGIN */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const sql = `
    SELECT id, full_name, username, role
    FROM users
    WHERE username = ? AND password = ?
  `;

  db.query(sql, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const token = jwt.sign(user, SECRET_KEY, { expiresIn: '8h' });

    res.json({ token, user });
  });
});

/* REGISTER STAFF */
app.post('/api/register', (req, res) => {
  const { full_name, username, password } = req.body;

  const sql = `
    INSERT INTO users (full_name, username, password, role)
    VALUES (?, ?, ?, 'staff')
  `;

  db.query(sql, [full_name, username, password], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Registration failed' });
    }

    res.json({ message: 'Account created successfully' });
  });
});

/* DASHBOARD SUMMARY */
app.get('/api/dashboard/summary', verifyToken, (req, res) => {
  const summary = {};

  const q1 = 'SELECT COUNT(*) AS totalProducts FROM products';
  const q2 = `
    SELECT IFNULL(SUM(stock_kilos * (cost_per_sack / kilos_per_sack)), 0) AS inventoryValue
    FROM products
  `;
  const q3 = 'SELECT IFNULL(SUM(total_amount), 0) AS totalSales FROM sales';
  const q4 = `
    SELECT COUNT(*) AS lowStockItems
    FROM products
    WHERE stock_sacks <= reorder_level_sacks
  `;
  const q5 = 'SELECT IFNULL(SUM(profit), 0) AS totalProfit FROM sales';

  db.query(q1, (e1, r1) => {
    if (e1) return res.status(500).json({ message: 'Error loading dashboard data' });
    summary.totalProducts = r1[0].totalProducts;

    db.query(q2, (e2, r2) => {
      if (e2) return res.status(500).json({ message: 'Error loading dashboard data' });
      summary.inventoryValue = Number(r2[0].inventoryValue || 0);

      db.query(q3, (e3, r3) => {
        if (e3) return res.status(500).json({ message: 'Error loading dashboard data' });
        summary.totalSales = Number(r3[0].totalSales || 0);

        db.query(q4, (e4, r4) => {
          if (e4) return res.status(500).json({ message: 'Error loading dashboard data' });
          summary.lowStockItems = r4[0].lowStockItems;

          db.query(q5, (e5, r5) => {
            if (e5) return res.status(500).json({ message: 'Error loading dashboard data' });
            summary.totalProfit = Number(r5[0].totalProfit || 0);

            return res.json(summary);
          });
        });
      });
    });
  });
});

/* PRODUCTS - GET ALL */
app.get('/api/products', verifyToken, (req, res) => {
  const sql = `
    SELECT *,
      ROUND(stock_kilos / kilos_per_sack, 2) AS computed_stock_sacks
    FROM products
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch products' });
    }

    res.json(results);
  });
});

/* PRODUCTS - ADD */
app.post('/api/products', verifyToken, (req, res) => {
  const {
    product_name,
    category,
    cost_per_sack,
    selling_price_per_kilo,
    kilos_per_sack,
    stock_sacks,
    reorder_level_sacks,
    description
  } = req.body;

  const kilosPerSack = Number(kilos_per_sack);
  const stockSacks = Number(stock_sacks);
  const stockKilos = stockSacks * kilosPerSack;

  const sql = `
    INSERT INTO products (
      product_name,
      category,
      cost_per_sack,
      selling_price_per_kilo,
      kilos_per_sack,
      stock_sacks,
      stock_kilos,
      reorder_level_sacks,
      description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      product_name,
      category,
      cost_per_sack,
      selling_price_per_kilo,
      kilosPerSack,
      stockSacks,
      stockKilos,
      reorder_level_sacks,
      description
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to add product' });
      }

      res.json({ message: 'Product added successfully', id: result.insertId });
    }
  );
});

/* PRODUCTS - UPDATE */
app.put('/api/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  const {
    product_name,
    category,
    cost_per_sack,
    selling_price_per_kilo,
    kilos_per_sack,
    stock_sacks,
    reorder_level_sacks,
    description
  } = req.body;

  const kilosPerSack = Number(kilos_per_sack);
  const stockSacks = Number(stock_sacks);
  const stockKilos = stockSacks * kilosPerSack;

  const sql = `
    UPDATE products
    SET
      product_name = ?,
      category = ?,
      cost_per_sack = ?,
      selling_price_per_kilo = ?,
      kilos_per_sack = ?,
      stock_sacks = ?,
      stock_kilos = ?,
      reorder_level_sacks = ?,
      description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      product_name,
      category,
      cost_per_sack,
      selling_price_per_kilo,
      kilosPerSack,
      stockSacks,
      stockKilos,
      reorder_level_sacks,
      description,
      id
    ],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to update product' });
      }

      res.json({ message: 'Product updated successfully' });
    }
  );
});

/* PRODUCTS - DELETE */
app.delete('/api/products/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  const checkSql = 'SELECT COUNT(*) AS total FROM sales WHERE product_id = ?';

  db.query(checkSql, [id], (checkErr, checkResult) => {
    if (checkErr) {
      return res.status(500).json({ message: 'Failed to validate product deletion' });
    }

    if (checkResult[0].total > 0) {
      return res.status(400).json({ message: 'Cannot delete product with existing sales records' });
    }

    const deleteSql = 'DELETE FROM products WHERE id = ?';

    db.query(deleteSql, [id], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete product' });
      }

      res.json({ message: 'Product deleted successfully' });
    });
  });
});

/* SALES - GET ALL */
app.get('/api/sales', verifyToken, (req, res) => {
  const sql = `
    SELECT
      s.*,
      p.product_name,
      p.kilos_per_sack,
      ROUND(s.kilos_sold / p.kilos_per_sack, 2) AS equivalent_sacks,
      u.full_name AS recorded_by
    FROM sales s
    INNER JOIN products p ON s.product_id = p.id
    INNER JOIN users u ON s.sold_by = u.id
    ORDER BY s.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch sales' });
    }

    res.json(results);
  });
});

/* SALES - ADD (PER KILO, INVENTORY PER SACK) */
app.post('/api/sales', verifyToken, (req, res) => {
  const { product_id, kilos_sold, customer_name } = req.body;

  const getProductSql = 'SELECT * FROM products WHERE id = ?';

  db.query(getProductSql, [product_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to process sale' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = result[0];
    const kilosSold = Number(kilos_sold);

    if (kilosSold <= 0) {
      return res.status(400).json({ message: 'Invalid kilos sold' });
    }

    if (kilosSold > Number(product.stock_kilos)) {
      return res.status(400).json({ message: 'Insufficient stock in kilos' });
    }

    const sellingPricePerKilo = Number(product.selling_price_per_kilo);
    const costPerKilo = Number(product.cost_per_sack) / Number(product.kilos_per_sack);

    const totalAmount = kilosSold * sellingPricePerKilo;
    const costAmount = kilosSold * costPerKilo;
    const profit = totalAmount - costAmount;

    const remainingKilos = Number(product.stock_kilos) - kilosSold;
    const remainingSacks = remainingKilos / Number(product.kilos_per_sack);

    const saleSql = `
      INSERT INTO sales (
        product_id,
        kilos_sold,
        selling_price_per_kilo,
        total_amount,
        cost_amount,
        profit,
        customer_name,
        sold_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      saleSql,
      [
        product_id,
        kilosSold,
        sellingPricePerKilo,
        totalAmount,
        costAmount,
        profit,
        customer_name || 'Walk-in Customer',
        req.user.id
      ],
      (saleErr) => {
        if (saleErr) {
          console.error(saleErr);
          return res.status(500).json({ message: 'Failed to record sale' });
        }

        const updateStockSql = `
          UPDATE products
          SET
            stock_kilos = ?,
            stock_sacks = ?
          WHERE id = ?
        `;

        db.query(updateStockSql, [remainingKilos, remainingSacks, product_id], (stockErr) => {
          if (stockErr) {
            console.error(stockErr);
            return res.status(500).json({ message: 'Sale saved but stock update failed' });
          }

          res.json({
            message: 'Sale recorded successfully',
            total_amount: totalAmount,
            cost_amount: costAmount,
            profit: profit,
            remaining_kilos: remainingKilos,
            remaining_sacks: remainingSacks
          });
        });
      }
    );
  });
});

/* REPORTS - INVENTORY */
app.get('/api/reports/inventory', verifyToken, (req, res) => {
  const sql = `
    SELECT
      id,
      product_name,
      category,
      cost_per_sack,
      selling_price_per_kilo,
      kilos_per_sack,
      stock_sacks,
      stock_kilos,
      reorder_level_sacks,
      ROUND(stock_kilos / kilos_per_sack, 2) AS computed_stock_sacks,
      ROUND(stock_kilos * (cost_per_sack / kilos_per_sack), 2) AS stock_value
    FROM products
    ORDER BY product_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to load inventory report' });
    }

    res.json(results);
  });
});

/* REPORTS - SALES */
app.get('/api/reports/sales', verifyToken, (req, res) => {
  const sql = `
    SELECT
      s.id,
      p.product_name,
      s.kilos_sold,
      s.selling_price_per_kilo,
      s.total_amount,
      s.cost_amount,
      s.profit,
      s.customer_name,
      s.sale_date,
      ROUND(s.kilos_sold / p.kilos_per_sack, 2) AS equivalent_sacks,
      u.full_name AS recorded_by
    FROM sales s
    INNER JOIN products p ON s.product_id = p.id
    INNER JOIN users u ON s.sold_by = u.id
    ORDER BY s.sale_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to load sales report' });
    }

    res.json(results);
  });
});

/* DEFAULT ROUTE */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});