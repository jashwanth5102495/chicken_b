import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import { initializeDatabase } from './initDb.js';
import { authRouter } from './routes/auth.js';
import { shopsRouter } from './routes/shops.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { paymentsRouter } from './routes/payments.js';
import { ledgerRouter } from './routes/ledger.js';
import { settingsRouter } from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/shops', shopsRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'PostgreSQL',
    platform: 'ChickenLink / RestoPilot',
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  const isConnected = await testConnection();
  if (isConnected) {
    await initializeDatabase();
  } else {
    console.warn('[PostgreSQL Warning] Could not connect immediately. Ensure PostgreSQL is running on port 5432.');
  }

  app.listen(PORT, () => {
    console.log(`[ChickenLink Server] PostgreSQL API running on http://localhost:${PORT}`);
  });
};

startServer();
