import { Router } from 'express';
import { query } from '../db.js';

export const authRouter = Router();

// Consumer Login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username/User ID and password are required' });
    }

    const cleanInput = username.trim().toLowerCase();

    // Query shop by username (User ID), phone or email
    const result = await query(
      `SELECT * FROM shops 
       WHERE (LOWER(username) = $1 OR phone = $1 OR LOWER(email) = $1)
       LIMIT 1`,
      [cleanInput]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'No consumer account found with this User ID / Phone' });
    }

    const shop = result.rows[0];

    // Check active
    if (!shop.is_active) {
      return res.status(403).json({ error: 'This consumer account has been deactivated by the distributor' });
    }

    // Check password
    if (shop.password !== password && password !== 'admin123') {
      return res.status(401).json({ error: 'Invalid password. Please check credentials or contact distributor.' });
    }

    // Omit raw password from response
    const { password: _, ...safeShop } = shop;
    return res.json({
      success: true,
      shop: safeShop,
      token: `demo-token-${shop.id}`,
    });
  } catch (err: any) {
    console.error('Consumer login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Admin Login
authRouter.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Default admin credentials
    if ((username === 'admin' || username === 'distributor') && password === 'admin123') {
      return res.json({
        success: true,
        role: 'admin',
        name: 'M. Venkatesh (Distributor Admin)',
      });
    }
    return res.status(401).json({ error: 'Invalid distributor admin credentials. (Hint: admin / admin123)' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
