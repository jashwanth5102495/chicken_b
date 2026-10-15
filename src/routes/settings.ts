import { Router } from 'express';
import { query } from '../db.js';

export const settingsRouter = Router();

// GET settings
settingsRouter.get('/', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM settings WHERE id = 1 LIMIT 1`);
    if (result.rows.length === 0) {
      return res.json({});
    }
    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update settings
settingsRouter.put('/', async (req, res) => {
  try {
    const {
      business_name,
      owner_name,
      phone,
      address,
      gstin,
      fssai,
      cutoff_time,
      invoice_prefix,
      invoice_footer,
      upi_id,
      bank_details,
    } = req.body;

    const result = await query(
      `UPDATE settings
       SET business_name = COALESCE($1, business_name),
           owner_name = COALESCE($2, owner_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           gstin = COALESCE($5, gstin),
           fssai = COALESCE($6, fssai),
           cutoff_time = COALESCE($7, cutoff_time),
           invoice_prefix = COALESCE($8, invoice_prefix),
           invoice_footer = COALESCE($9, invoice_footer),
           upi_id = COALESCE($10, upi_id),
           bank_details = COALESCE($11, bank_details),
           updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [
        business_name,
        owner_name,
        phone,
        address,
        gstin,
        fssai,
        cutoff_time,
        invoice_prefix,
        invoice_footer,
        upi_id,
        bank_details ? JSON.stringify(bank_details) : null,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
