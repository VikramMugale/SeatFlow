/**
 * Seed script — creates admin, sample venue, event, show, and seats
 * Run: node src/scripts/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://seatflow:seatflow_secret@localhost:5432/seatflow',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admin user
    const hash = await bcrypt.hash('Admin@12345', 12);
    const adminResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_email_verified)
       VALUES ('Admin', 'admin@seatflow.com', $1, 'ADMIN', true)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [hash]
    );
    const adminId = adminResult.rows[0].id;
    console.log('Admin:', adminId, 'admin@seatflow.com / Admin@12345');

    // Customer
    const custHash = await bcrypt.hash('Customer@123', 12);
    const custResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_email_verified)
       VALUES ('Vikram Customer', 'customer@seatflow.com', $1, 'CUSTOMER', true)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [custHash]
    );
    console.log('Customer:', custResult.rows[0].id, 'customer@seatflow.com / Customer@123');

    // Venue
    const venueResult = await client.query(
      `INSERT INTO venues (name, city, address, capacity)
       VALUES ('PVR Phoenix Mall', 'Pune', 'Viman Nagar, Pune', 200)
       RETURNING id`
    );
    const venueId = venueResult.rows[0].id;
    console.log('Venue:', venueId);

    // Screen
    const screenResult = await client.query(
      `INSERT INTO screens (venue_id, name, total_rows, seats_per_row)
       VALUES ($1, 'Screen 1', 8, 10) RETURNING id`,
      [venueId]
    );
    const screenId = screenResult.rows[0].id;

    // Seats
    const rows = 'ABCDEFGH'.split('');
    for (const row of rows) {
      for (let n = 1; n <= 10; n++) {
        let category = 'STANDARD';
        const ri = rows.indexOf(row);
        if (ri < 2) category = 'VIP';
        else if (ri < 4) category = 'PREMIUM';
        else if (ri < 6) category = 'GOLD';
        await client.query(
          `INSERT INTO seats (screen_id, seat_label, row_label, seat_number, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [screenId, `${row}${n}`, row, n, category]
        );
      }
    }
    console.log('Seats created: 80');

    // Event
    const eventResult = await client.query(
      `INSERT INTO events (title, description, event_type, language, genre, duration_minutes, is_published, created_by)
       VALUES (
         'Avengers: Secret Wars',
         'The epic conclusion to the Multiverse Saga.',
         'MOVIE',
         'English',
         'Action',
         165,
         true,
         $1
       ) RETURNING id`,
      [adminId]
    );
    const eventId = eventResult.rows[0].id;
    console.log('Event:', eventId);

    // Show — tomorrow 5 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const showDate = tomorrow.toISOString().slice(0, 10);

    const showResult = await client.query(
      `INSERT INTO shows (event_id, venue_id, screen_id, show_date, show_time, base_price, pricing)
       VALUES ($1, $2, $3, $4, '17:00:00', 250, $5)
       RETURNING id`,
      [
        eventId,
        venueId,
        screenId,
        showDate,
        JSON.stringify({ VIP: 500, PREMIUM: 350, GOLD: 250, STANDARD: 180 }),
      ]
    );
    const showId = showResult.rows[0].id;
    console.log('Show:', showId, showDate, '17:00');

    // Show seats
    const seats = await client.query('SELECT id, category FROM seats WHERE screen_id = $1', [screenId]);
    const pricing = { VIP: 500, PREMIUM: 350, GOLD: 250, STANDARD: 180 };
    for (const seat of seats.rows) {
      await client.query(
        `INSERT INTO show_seats (show_id, seat_id, status, price)
         VALUES ($1, $2, 'AVAILABLE', $3)`,
        [showId, seat.id, pricing[seat.category] || 180]
      );
    }
    console.log('Show seats created:', seats.rows.length);

    // Concert event
    const concertResult = await client.query(
      `INSERT INTO events (title, description, event_type, artist, language, duration_minutes, is_published, created_by)
       VALUES (
         'Coldplay Live in Pune',
         'Music of the Spheres World Tour',
         'CONCERT',
         'Coldplay',
         'English',
         150,
         true,
         $1
       ) RETURNING id`,
      [adminId]
    );
    console.log('Concert event:', concertResult.rows[0].id);

    await client.query('COMMIT');
    console.log('\n✅ Seed completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
