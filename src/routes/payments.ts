import { Router } from 'express';
import { query } from '../db.js';

export const paymentsRouter = Router();

// GET all payments
paymentsRouter.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, s.name as shop_name
      FROM payments p
      JOIN shops s ON p.shop_id = s.id
      ORDER BY p.created_at DESC
    `);
    return res.json(
      result.rows.map((p) => ({
        ...p,
        amount: parseFloat(p.amount) || 0,
      }))
    );
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST record payment
paymentsRouter.post('/', async (req, res) => {
  try {
    const { shop_id, amount, payment_mode, reference_no, note } = req.body;
    if (!shop_id || !amount) {
      return res.status(400).json({ error: 'Shop ID and payment amount are required' });
    }

    const parsedAmount = parseFloat(amount);
    const todayDate = new Date().toISOString().split('T')[0];
    const receiptNo = `REC-${todayDate.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;
    const payId = `pay-${Date.now()}`;

    // Get current shop balance
    const shopRes = await query(`SELECT outstanding_balance FROM shops WHERE id = $1`, [shop_id]);
    if (shopRes.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const currentBal = parseFloat(shopRes.rows[0].outstanding_balance) || 0;
    const newBal = Math.max(0, currentBal - parsedAmount);

    // Insert payment
    const paymentRes = await query(
      `INSERT INTO payments (id, receipt_no, shop_id, amount, payment_mode, payment_date, reference_no, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [payId, receiptNo, shop_id, parsedAmount, payment_mode || 'Cash', todayDate, reference_no || null, note || null]
    );

    // Append Credit to Ledger
    await query(
      `INSERT INTO ledger_entries (id, shop_id, entry_date, entry_type, reference_id, reference_no, description, debit, credit, balance_after)
       VALUES ($1, $2, $3, 'PAYMENT', $4, $5, $6, 0, $7, $8)`,
      [
        `led-${Date.now()}`,
        shop_id,
        todayDate,
        payId,
        receiptNo,
        `${payment_mode || 'Cash'} Payment received ${reference_no ? `(Ref: ${reference_no})` : ''}`,
        parsedAmount,
        newBal,
      ]
    );

    // Update shop balance
    await query(`UPDATE shops SET outstanding_balance = $1 WHERE id = $2`, [newBal, shop_id]);

    return res.status(201).json({
      ...paymentRes.rows[0],
      amount: parsedAmount,
      new_balance: newBal,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
