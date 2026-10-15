import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const initializeDatabase = async () => {
  try {
    const possiblePaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(__dirname, '..', 'src', 'schema.sql'),
      path.join(process.cwd(), 'src', 'schema.sql'),
      path.join(process.cwd(), 'schema.sql'),
      path.join(process.cwd(), 'dist', 'schema.sql'),
    ];
    const schemaPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!schemaPath) {
      throw new Error(`schema.sql not found in any of: ${possiblePaths.join(', ')}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Run schema
    await pool.query(schemaSql);
    console.log('[PostgreSQL] Schema applied successfully.');

    // Check if products table has data
    const prodCheck = await query('SELECT COUNT(*) FROM products');
    const prodCount = parseInt(prodCheck.rows[0].count, 10);

    if (prodCount === 0) {
      console.log('[PostgreSQL] Seeding fresh poultry catalog products & settings...');

      // Seed Catalog Products
      const seedProducts = [
        ['prod-01', 'BW-01', 'Broiler Whole Bird (Skin-on)', 'ಬ್ರಾಯ್ಲರ್ ಇಡೀ ಕೋಳಿ (ಚರ್ಮ ಸಮೇತ)', 'ब्रायलर साबुत मुर्गा (त्वचा सहित)', 'బ్రాయిలర్ హోల్ చికెన్ (చర్మంతో)', 'kg', 145.0, 142.0, 'Fresh whole broiler bird with skin, cleaned and ready for processing.', 5.0, 1.0],
        ['prod-02', 'BS-02', 'Broiler Whole Bird (Skinless)', 'ಬ್ರಾಯ್ಲರ್ ಚರ್ಮರಹಿತ ಇಡೀ ಕೋಳಿ', 'ब्रायलर साबुत मुर्गा (बिना त्वचा)', 'బ్రాయిలర్ స్కిన్‌లెస్ హోల్ చికెన్', 'kg', 165.0, 160.0, 'Cleaned skinless dressed whole bird, tender meat.', 5.0, 1.0],
        ['prod-03', 'CC-03', 'Curry Cut (With Bone)', 'ಕರಿ ಕಟ್ ಕೋಳಿ ಮಾಂಸ (ಮೂಳೆ ಸಮೇತ)', 'करी कट चिकन (हड्डी सहित)', 'కర్రీ కట్ చికెన్ (ఎముకలతో)', 'kg', 180.0, 175.0, 'Uniform medium-sized curry pieces with bone.', 5.0, 0.5],
        ['prod-04', 'BL-04', 'Boneless Chicken Breast', 'ಬೋನ್ಲೆಸ್ ಚಿಕನ್ ಬ್ರೆಸ್ಟ್', 'बोनलेस चिकन ब्रेस्ट', 'బోన్‌లెస్ చికెన్ బ్రెస్ట్', 'kg', 260.0, 255.0, 'Chilled boneless breast fillets, trimmed fat.', 2.0, 0.5],
        ['prod-05', 'LG-05', 'Chicken Drumsticks (Legs)', 'ಚಿಕನ್ ಲೆಗ್ ಪೀಸ್ (ಡ್ರಮ್ಸ್ಟಿಕ್)', 'चिकन लेग पीस (ड्रमस्टिक)', 'చికెన్ లెగ్ పీస్ (డ్రమ్‌స్టిక్)', 'kg', 240.0, 235.0, 'Fresh juicy chicken drumsticks.', 3.0, 0.5],
        ['prod-06', 'WG-06', 'Chicken Wings', 'ಚಿಕನ್ ರೆಕ್ಕೆಗಳು (ವಿಂಗ್ಸ್)', 'ಚಿಕನ್ ವಿಂಗ್ಸ್', 'చికెన్ వింగ్స్', 'kg', 170.0, 168.0, 'Crisp 2-joint whole wings.', 2.0, 0.5],
        ['prod-07', 'LV-07', 'Chicken Liver & Gizzard', 'ಕೋಳಿ ಲಿವರ್ ಮತ್ತು ಗಿಜ್ಜಾರ್ಡ್', 'चिकन कलेजी और पोटा', 'చికెన్ లివర్ & గిజార్డ్', 'kg', 120.0, 120.0, 'Freshly washed liver and gizzard mix.', 2.0, 0.5],
        ['prod-08', 'EG-08', 'Farm Fresh White Eggs (Crate of 30)', 'ಫಾರ್ಮ್ ಫ್ರೆಶ್ ಮೊಟ್ಟೆಗಳು (30 ರ ಕ್ರೇಟ್)', 'फार्म फ्रेश सफेद अंडे (30 का क्रेट)', 'ఫార్మ్ ఫ్రెష్ వైట్ ఎగ్స్ (30 క్రేట్)', 'crate', 195.0, 190.0, 'Grade A farm fresh eggs in sturdy crate of 30.', 1.0, 1.0],
      ];

      for (const p of seedProducts) {
        await query(
          `INSERT INTO products (id, code, name, name_kn, name_hi, name_te, unit, current_rate, yesterday_rate, description, min_order_qty, step_qty)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          p
        );
      }

      // Seed Distributor Settings
      await query(`
        INSERT INTO settings (id, business_name, owner_name, phone, address, cutoff_time, upi_id)
        VALUES (1, 'Sri Lakshmi Broiler & Poultry Distributors', 'M. Venkatesh', '+91 98450 99881', 'No. 42, Wholesale Poultry Market, Bangalore', '21:00', 'lakshmipoultry@okhdfcbank')
        ON CONFLICT (id) DO NOTHING;
      `);

      console.log('[PostgreSQL] Catalog products and settings initialized. Ready for real user accounts & orders.');
    } else {
      console.log(`[PostgreSQL] Database ready with ${prodCount} catalog products.`);
    }
  } catch (err: any) {
    console.error('[PostgreSQL Init Error]:', err.message);
  }
};
