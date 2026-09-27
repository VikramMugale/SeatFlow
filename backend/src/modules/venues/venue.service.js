const { query, getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

async function listVenues({ city, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE is_active = true';
  if (city) {
    params.push(`%${city}%`);
    where += ` AND city ILIKE $1`;
  }
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const result = await query(
    `SELECT * FROM venues ${where} ORDER BY name LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return result.rows;
}

async function getVenue(id) {
  const result = await query('SELECT * FROM venues WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');

  const screens = await query('SELECT * FROM screens WHERE venue_id = $1 ORDER BY name', [id]);
  return { ...result.rows[0], screens: screens.rows };
}

async function createVenue(data) {
  const result = await query(
    `INSERT INTO venues (name, city, address, capacity, metadata)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.name, data.city, data.address || null, data.capacity || null, JSON.stringify(data.metadata || {})]
  );
  return result.rows[0];
}

async function createScreen(venueId, { name, totalRows = 10, seatsPerRow = 10, categories }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const screenResult = await client.query(
      `INSERT INTO screens (venue_id, name, total_rows, seats_per_row, layout)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [venueId, name, totalRows, seatsPerRow, JSON.stringify({ categories: categories || {} })]
    );
    const screen = screenResult.rows[0];

    // Generate seats A1, A2, ... based on rows
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, totalRows);
    const seatInserts = [];
    for (const row of rowLabels) {
      for (let n = 1; n <= seatsPerRow; n++) {
        const label = `${row}${n}`;
        let category = 'STANDARD';
        // Simple category assignment: first 2 rows VIP, next 2 PREMIUM, rest STANDARD
        const rowIdx = rowLabels.indexOf(row);
        if (rowIdx < 2) category = 'VIP';
        else if (rowIdx < 4) category = 'PREMIUM';
        else if (rowIdx < 6) category = 'GOLD';

        seatInserts.push(
          client.query(
            `INSERT INTO seats (screen_id, seat_label, row_label, seat_number, category)
             VALUES ($1, $2, $3, $4, $5)`,
            [screen.id, label, row, n, category]
          )
        );
      }
    }
    await Promise.all(seatInserts);
    await client.query('COMMIT');
    return screen;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateVenue(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of ['name', 'city', 'address', 'capacity']) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) throw new AppError('No fields to update', 400);
  values.push(id);
  const result = await query(
    `UPDATE venues SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  if (result.rows.length === 0) throw new AppError('Venue not found', 404);
  return result.rows[0];
}

module.exports = { listVenues, getVenue, createVenue, createScreen, updateVenue };
