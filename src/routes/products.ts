import { Router } from 'express';
import { query } from '../db.js';

export const productsRouter = Router();

// GET all products
productsRouter.get('/', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM products ORDER BY code ASC`);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST add new product cut
productsRouter.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      name_kn,
      name_hi,
      name_te,
      unit,
      current_rate,
      description,
      min_order_qty,
      step_qty,
    } = req.body;

    const id = `prod-${Date.now()}`;
    const result = await query(
      `INSERT INTO products (id, code, name, name_kn, name_hi, name_te, unit, current_rate, yesterday_rate, description, min_order_qty, step_qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        code,
        name,
        name_kn || null,
        name_hi || null,
        name_te || null,
        unit || 'kg',
        parseFloat(current_rate) || 150.0,
        parseFloat(current_rate) || 150.0,
        description || '',
        parseFloat(min_order_qty) || 2.0,
        parseFloat(step_qty) || 0.5,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update product
productsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      name_kn,
      name_hi,
      name_te,
      unit,
      current_rate,
      description,
      is_active,
    } = req.body;

    const result = await query(
      `UPDATE products
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           name_kn = COALESCE($3, name_kn),
           name_hi = COALESCE($4, name_hi),
           name_te = COALESCE($5, name_te),
           unit = COALESCE($6, unit),
           current_rate = COALESCE($7, current_rate),
           description = COALESCE($8, description),
           is_active = COALESCE($9, is_active),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        code,
        name,
        name_kn,
        name_hi,
        name_te,
        unit,
        current_rate ? parseFloat(current_rate) : null,
        description,
        is_active,
        id,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST publish rates
productsRouter.post('/publish-rates', async (req, res) => {
  try {
    const { rates } = req.body; // map of product_id -> new_rate
    if (!rates) {
      return res.status(400).json({ error: 'Rates map is required' });
    }

    const todayDate = new Date().toISOString().split('T')[0];

    for (const [prodId, newRate] of Object.entries(rates)) {
      const parsedRate = Number(newRate);
      if (isNaN(parsedRate)) continue;

      // Update product current_rate and archive previous to yesterday_rate
      await query(
        `UPDATE products
         SET yesterday_rate = current_rate,
             current_rate = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [parsedRate, prodId]
      );

      // Record in daily_rates
      const rateId = `rate-${prodId}-${todayDate}`;
      await query(
        `INSERT INTO daily_rates (id, product_id, rate_date, rate_per_unit, published_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_id, rate_date)
         DO UPDATE SET rate_per_unit = EXCLUDED.rate_per_unit, published_at = NOW()`,
        [rateId, prodId, todayDate, parsedRate]
      );
    }

    const updated = await query(`SELECT * FROM products ORDER BY code ASC`);
    return res.json({ success: true, products: updated.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
