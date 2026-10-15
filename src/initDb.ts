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

    // Check if shops table has data
    const shopCheck = await query('SELECT COUNT(*) FROM shops');
    const count = parseInt(shopCheck.rows[0].count, 10);

    if (count === 0) {
      console.log('[PostgreSQL] Seeding default consumers, products and orders...');

      // 1. Seed Shops / Consumers with User ID (username) & Password
      const seedShops = [
        [
          'shop-01',
          'star_chicken',
          'star123',
          'Star Chicken Center',
          'Rafiq Ahmed',
          '9845012345',
          'star@chicken.com',
          '12/4, 100ft Road, Indiranagar, Bangalore - 560038',
          'North Route',
          60000.0,
          14500.0,
        ],
        [
          'shop-02',
          'al_madina',
          'madina123',
          'Al-Madina Meat Mart',
          'Mohammed Irfan',
          '9845023456',
          'madina@chicken.com',
          '78, Mosque Road, Frazer Town, Bangalore - 560005',
          'North Route',
          80000.0,
          22400.0,
        ],
        [
          'shop-03',
          'venkateshwara',
          'venkat123',
          'Sri Venkateshwara Poultry',
          'Manjunath Gowda',
          '9845034567',
          'venkat@chicken.com',
          '45, 9th Main, 4th Block, Jayanagar, Bangalore - 560011',
          'South Market',
          75000.0,
          8900.0,
        ],
        [
          'shop-04',
          'royal_fresh',
          'royal123',
          'Royal Fresh Chicken',
          'Suresh Kumar',
          '9845045678',
          'royal@chicken.com',
          '89, 16th Main, BTM Layout 2nd Stage, Bangalore - 560076',
          'South Market',
          50000.0,
          31200.0,
        ],
        [
          'shop-05',
          'new_taj',
          'taj123',
          'New Taj Broiler Center',
          'Bilal Hussain',
          '9845056789',
          'taj@chicken.com',
          '23, Shivaji Road, Shivajinagar, Bangalore - 560051',
          'Central Area',
          100000.0,
          48500.0,
        ],
        [
          'shop-06',
          'cauvery_meat',
          'cauvery123',
          'Cauvery Meat & Fish Stall',
          'Ramesh Reddy',
          '9845067890',
          'cauvery@chicken.com',
          '15, 8th Cross, Sampige Road, Malleshwaram, Bangalore - 560003',
          'Central Area',
          50000.0,
          6200.0,
        ],
      ];

      for (const s of seedShops) {
        await query(
          `INSERT INTO shops (id, username, password, name, owner_name, phone, email, address, area_route, credit_limit, outstanding_balance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          s
        );
      }

      // 2. Seed Products
      const seedProducts = [
        ['prod-01', 'BW-01', 'Broiler Whole Bird (Skin-on)', 'ಬ್ರಾಯ್ಲರ್ ಇಡೀ ಕೋಳಿ (ಚರ್ಮ ಸಮೇತ)', 'ब्रायलर साबुत मुर्गा (त्वचा सहित)', 'బ్రాయిలర్ హోల్ చికెన్ (చర్మంతో)', 'kg', 145.0, 142.0, 'Fresh whole broiler bird with skin, cleaned and ready for processing.', 5.0, 1.0],
        ['prod-02', 'BS-02', 'Broiler Whole Bird (Skinless)', 'ಬ್ರಾಯ್ಲರ್ ಚರ್ಮರಹಿತ ಇಡೀ ಕೋಳಿ', 'ब्रायलर साबुत मुर्गा (बिना त्वचा)', 'బ్రాయిలర్ స్కిన్‌లెస్ హోల్ చికెన్', 'kg', 165.0, 160.0, 'Cleaned skinless dressed whole bird, tender meat.', 5.0, 1.0],
        ['prod-03', 'CC-03', 'Curry Cut (With Bone)', 'ಕರಿ ಕಟ್ ಕೋಳಿ ಮಾಂಸ (ಮೂಳೆ ಸಮೇತ)', 'करी कट चिकन (हड्डी सहित)', 'కర్రీ కట్ చికెన్ (ఎముకలతో)', 'kg', 180.0, 175.0, 'Uniform medium-sized curry pieces with bone.', 5.0, 0.5],
        ['prod-04', 'BL-04', 'Boneless Chicken Breast', 'ಬೋನ್ಲೆಸ್ ಚಿಕನ್ ಬ್ರೆಸ್ಟ್', 'बोनलेस चिकन ब्रेस्ट', 'బోన్‌లెస్ చికెన్ బ్రెస్ట్', 'kg', 260.0, 255.0, 'Chilled boneless breast fillets, trimmed fat.', 2.0, 0.5],
        ['prod-05', 'LG-05', 'Chicken Drumsticks (Legs)', 'ಚಿಕನ್ ಲೆಗ್ ಪೀಸ್ (ಡ್ರಮ್ಸ್ಟಿಕ್)', 'चिकन लेग पीस (ड्रमस्टिक)', 'చికెన్ లెగ్ పీస్ (డ్రమ్‌స్టిక్)', 'kg', 240.0, 235.0, 'Fresh juicy chicken drumsticks.', 3.0, 0.5],
        ['prod-06', 'WG-06', 'Chicken Wings', 'ಚಿಕನ್ ರೆಕ್ಕೆಗಳು (ವಿಂಗ್ಸ್)', 'चिकन विंग्स', 'చికెన్ వింగ్స్', 'kg', 170.0, 168.0, 'Crisp 2-joint whole wings.', 2.0, 0.5],
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

      // 3. Seed Sample Orders
      await query(`
        INSERT INTO orders (id, order_number, shop_id, order_date, delivery_date, delivery_slot, status, notes, total_ordered_qty, estimated_amount)
        VALUES ('ord-1001', 'CKL-20261014-001', 'shop-01', CURRENT_DATE, CURRENT_DATE + 1, 'Morning', 'Placed', 'Early delivery please', 65.0, 11275.0)
        ON CONFLICT (id) DO NOTHING;
      `);

      await query(`
        INSERT INTO order_items (id, order_id, product_id, product_name, unit, ordered_qty, unit_rate, total_amount)
        VALUES 
        ('item-101', 'ord-1001', 'prod-01', 'Broiler Whole Bird (Skin-on)', 'kg', 35, 145, 5075),
        ('item-102', 'ord-1001', 'prod-03', 'Curry Cut (With Bone)', 'kg', 20, 180, 3600),
        ('item-103', 'ord-1001', 'prod-04', 'Boneless Chicken Breast', 'kg', 10, 260, 2600)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 4. Seed Settings
      await query(`
        INSERT INTO settings (id, business_name, owner_name, phone, address, cutoff_time, upi_id)
        VALUES (1, 'Sri Lakshmi Broiler & Poultry Distributors', 'M. Venkatesh', '+91 98450 99881', 'No. 42, Wholesale Poultry Market, Bangalore', '21:00', 'lakshmipoultry@okhdfcbank')
        ON CONFLICT (id) DO NOTHING;
      `);

      console.log('[PostgreSQL] Seed data loaded successfully.');
    } else {
      console.log(`[PostgreSQL] Database already contains ${count} consumers. Ready.`);
    }
  } catch (err: any) {
    console.error('[PostgreSQL Init Error]:', err.message);
  }
};
