import { Router } from 'express';
import { query } from '../db.js';

export const shopsRouter = Router();

// GET all shops / consumers
shopsRouter.get('/', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM shops ORDER BY name ASC`);
    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST create consumer profile (Admin Action)
shopsRouter.post('/', async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      owner_name,
      phone,
      email,
      address,
      area_route,
      credit_limit,
      custom_rates,
    } = req.body;

    if (!username || !password || !name || !phone) {
      return res.status(400).json({ error: 'User ID (username), password, shop name and phone are required.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    const id = `shop-${Date.now()}`;

    // Check duplicate username or phone
    const existing = await query(
      `SELECT id FROM shops WHERE LOWER(username) = $1 OR phone = $2 LIMIT 1`,
      [cleanUsername, phone]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A consumer with this User ID or Phone already exists.' });
    }

    const insertRes = await query(
      `INSERT INTO shops (id, username, password, name, owner_name, phone, email, address, area_route, credit_limit, outstanding_balance, custom_rates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        id,
        cleanUsername,
        password,
        name,
        owner_name || name,
        phone,
        email || null,
        address || 'Bangalore',
        area_route || 'North Route',
        parseFloat(credit_limit) || 50000.0,
        0.0,
        JSON.stringify(custom_rates || {}),
      ]
    );

    return res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    console.error('Error creating consumer:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT update consumer profile
shopsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      name,
      owner_name,
      phone,
      email,
      address,
      area_route,
      credit_limit,
      custom_rates,
    } = req.body;

    const updateRes = await query(
      `UPDATE shops
       SET username = COALESCE($1, username),
           name = COALESCE($2, name),
           owner_name = COALESCE($3, owner_name),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           address = COALESCE($6, address),
           area_route = COALESCE($7, area_route),
           credit_limit = COALESCE($8, credit_limit),
           custom_rates = COALESCE($9, custom_rates),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        username ? username.trim().toLowerCase() : null,
        name,
        owner_name,
        phone,
        email,
        address,
        area_route,
        credit_limit ? parseFloat(credit_limit) : null,
        custom_rates ? JSON.stringify(custom_rates) : null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    return res.json(updateRes.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH reset consumer password (Admin Action)
shopsRouter.patch('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const result = await query(
      `UPDATE shops SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, name`,
      [new_password, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    return res.json({ success: true, message: 'Password updated successfully', shop: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH toggle status (active/deactive)
shopsRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE shops SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
