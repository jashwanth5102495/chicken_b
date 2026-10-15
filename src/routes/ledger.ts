import { Router } from 'express';
import { query } from '../db.js';

export const ledgerRouter = Router();

// GET all ledger entries or by shopId
ledgerRouter.get('/', async (req, res) => {
  try {
    const { shop_id } = req.query;
    let sql = `SELECT * FROM ledger_entries`;
    const params: any[] = [];

    if (shop_id) {
      sql += ` WHERE shop_id = $1`;
      params.push(shop_id);
    }

    sql += ` ORDER BY created_at DESC`;
    const result = await query(sql, params);

    return res.json(
      result.rows.map((r) => ({
        ...r,
        debit: parseFloat(r.debit) || 0,
        credit: parseFloat(r.credit) || 0,
        balance_after: parseFloat(r.balance_after) || 0,
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
