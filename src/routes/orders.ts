import { Router } from 'express';
import { query } from '../db.js';

export const ordersRouter = Router();

// GET all orders with nested items and shop details
ordersRouter.get('/', async (req, res) => {
  try {
    const ordersRes = await query(`
      SELECT o.*, s.name as shop_name, s.phone as shop_phone, s.area_route as shop_area, s.address as shop_address
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      ORDER BY o.created_at DESC
    `);

    const itemsRes = await query(`SELECT * FROM order_items`);

    const itemsByOrder: Record<string, any[]> = {};
    itemsRes.rows.forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const ordersWithItems = ordersRes.rows.map((ord) => ({
      ...ord,
      total_ordered_qty: parseFloat(ord.total_ordered_qty) || 0,
      total_delivered_qty: ord.total_delivered_qty ? parseFloat(ord.total_delivered_qty) : undefined,
      estimated_amount: parseFloat(ord.estimated_amount) || 0,
      final_amount: ord.final_amount ? parseFloat(ord.final_amount) : undefined,
      items: (itemsByOrder[ord.id] || []).map((it) => ({
        ...it,
        ordered_qty: parseFloat(it.ordered_qty) || 0,
        delivered_qty: it.delivered_qty !== null ? parseFloat(it.delivered_qty) : undefined,
        unit_rate: parseFloat(it.unit_rate) || 0,
        total_amount: parseFloat(it.total_amount) || 0,
      })),
    }));

    return res.json(ordersWithItems);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST place new order
ordersRouter.post('/', async (req, res) => {
  try {
    const { shop_id, delivery_date, delivery_slot, notes, items } = req.body;

    if (!shop_id || !delivery_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Shop ID, delivery date and items are required.' });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `CKL-${todayDate.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    let totalOrderedWeight = 0;
    let estimatedTotal = 0;

    // Insert order
    await query(
      `INSERT INTO orders (id, order_number, shop_id, order_date, delivery_date, delivery_slot, status, notes, total_ordered_qty, estimated_amount)
       VALUES ($1, $2, $3, $4, $5, $6, 'Placed', $7, $8, $9)`,
      [orderId, orderNumber, shop_id, todayDate, delivery_date, delivery_slot || 'Morning', notes || null, 0, 0]
    );

    // Insert line items
    for (const item of items) {
      const itemId = `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const lineTotal = item.ordered_qty * item.unit_rate;

      totalOrderedWeight += item.ordered_qty;
      estimatedTotal += lineTotal;

      await query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, unit, ordered_qty, unit_rate, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [itemId, orderId, item.product_id, item.product_name, item.unit || 'kg', item.ordered_qty, item.unit_rate, lineTotal]
      );
    }

    // Update totals on order
    const finalOrderRes = await query(
      `UPDATE orders
       SET total_ordered_qty = $1, estimated_amount = $2
       WHERE id = $3
       RETURNING *`,
      [totalOrderedWeight, estimatedTotal, orderId]
    );

    return res.status(201).json(finalOrderRes.rows[0]);
  } catch (err: any) {
    console.error('Error placing order:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH update delivered weights per item
ordersRouter.patch('/:id/delivered-weights', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivered_items } = req.body; // array of { itemId, deliveredQty }

    if (!delivered_items || !Array.isArray(delivered_items)) {
      return res.status(400).json({ error: 'delivered_items array is required' });
    }

    let totalDeliveredWeight = 0;
    let finalAmount = 0;

    for (const d of delivered_items) {
      const delQty = parseFloat(d.deliveredQty) || 0;
      const itemRow = await query(`SELECT unit_rate FROM order_items WHERE id = $1`, [d.itemId]);
      if (itemRow.rows.length > 0) {
        const rate = parseFloat(itemRow.rows[0].unit_rate) || 0;
        const lineTotal = delQty * rate;
        totalDeliveredWeight += delQty;
        finalAmount += lineTotal;

        await query(
          `UPDATE order_items SET delivered_qty = $1, total_amount = $2 WHERE id = $3`,
          [delQty, lineTotal, d.itemId]
        );
      }
    }

    const updatedOrder = await query(
      `UPDATE orders
       SET total_delivered_qty = $1, final_amount = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [totalDeliveredWeight, finalAmount, id]
    );

    return res.json(updatedOrder.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH update order status
ordersRouter.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, final_amount, total_delivered_qty } = req.body;

    const orderRow = await query(`SELECT * FROM orders WHERE id = $1`, [id]);
    if (orderRow.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderRow.rows[0];

    const todayDate = new Date().toISOString().split('T')[0];
    let invoiceNumber = order.invoice_number;
    let invoiceDate = order.invoice_date;

    // If transitioned to Delivered, create invoice and debit ledger
    if (status === 'Delivered' && order.status !== 'Delivered') {
      invoiceNumber = `INV-CKL-${order.order_number.replace('CKL-', '')}`;
      invoiceDate = todayDate;
      const billedTotal = final_amount ? parseFloat(final_amount) : (order.final_amount || order.estimated_amount);

      // Debit ledger entry
      const shopRes = await query(`SELECT outstanding_balance FROM shops WHERE id = $1`, [order.shop_id]);
      const currentBal = shopRes.rows.length > 0 ? parseFloat(shopRes.rows[0].outstanding_balance) : 0;
      const newBal = currentBal + billedTotal;

      await query(
        `INSERT INTO ledger_entries (id, shop_id, entry_date, entry_type, reference_id, reference_no, description, debit, credit, balance_after)
         VALUES ($1, $2, $3, 'INVOICE', $4, $5, $6, $7, 0, $8)`,
        [
          `led-${Date.now()}`,
          order.shop_id,
          todayDate,
          order.id,
          invoiceNumber,
          `Delivery Bill #${invoiceNumber}`,
          billedTotal,
          newBal,
        ]
      );

      // Update shop outstanding
      await query(`UPDATE shops SET outstanding_balance = $1 WHERE id = $2`, [newBal, order.shop_id]);
    }

    const updated = await query(
      `UPDATE orders
       SET status = $1,
           invoice_number = COALESCE($2, invoice_number),
           invoice_date = COALESCE($3, invoice_date),
           final_amount = COALESCE($4, final_amount),
           total_delivered_qty = COALESCE($5, total_delivered_qty),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [status, invoiceNumber, invoiceDate, final_amount, total_delivered_qty, id]
    );

    return res.json(updated.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
