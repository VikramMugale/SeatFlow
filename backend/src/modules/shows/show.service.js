const { query, getClient } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

async function listShows({ eventId, venueId, date, page = 1, limit = 20 }) {
  const conditions = ["s.status = 'SCHEDULED'"];
  const params = [];
  let idx = 1;

  if (eventId) {
    conditions.push(`s.event_id = $${idx++}`);
    params.push(eventId);
  }
  if (venueId) {
    conditions.push(`s.venue_id = $${idx++}`);
    params.push(venueId);
  }
  if (date) {
    conditions.push(`s.show_date = $${idx++}`);
    params.push(date);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, (page - 1) * limit);

  const result = await query(
    `SELECT s.*, e.title as event_title, e.event_type, e.poster_url,
            v.name as venue_name, v.city as venue_city
     FROM shows s
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     ${where}
     ORDER BY s.show_date, s.show_time
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );
  return result.rows;
}

async function getShow(id) {
  const result = await query(
    `SELECT s.*, e.title as event_title, e.event_type, e.duration_minutes, e.language, e.genre,
            v.name as venue_name, v.city as venue_city, v.address as venue_address,
            sc.name as screen_name
     FROM shows s
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     LEFT JOIN screens sc ON sc.id = s.screen_id
     WHERE s.id = $1`,
    [id]
  );
  if (result.rows.length === 0) throw new AppError('Show not found', 404, 'SHOW_NOT_FOUND');
  return result.rows[0];
}

async function createShow(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const showResult = await client.query(
      `INSERT INTO shows (event_id, venue_id, screen_id, show_date, show_time, base_price, pricing)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.eventId,
        data.venueId,
        data.screenId || null,
        data.showDate,
        data.showTime,
        data.basePrice,
        JSON.stringify(data.pricing || {}),
      ]
    );
    const show = showResult.rows[0];

    // Create show_seats from screen seats
    if (data.screenId) {
      const seats = await client.query(
        'SELECT id, category FROM seats WHERE screen_id = $1 AND is_active = true',
        [data.screenId]
      );
      const pricing = data.pricing || {};
      for (const seat of seats.rows) {
        const price = pricing[seat.category] || data.basePrice;
        await client.query(
          `INSERT INTO show_seats (show_id, seat_id, status, price)
           VALUES ($1, $2, 'AVAILABLE', $3)`,
          [show.id, seat.id, price]
        );
      }
    }

    await client.query('COMMIT');
    return show;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new AppError('Show already exists for this slot', 409, 'DUPLICATE_SHOW');
    }
    throw err;
  } finally {
    client.release();
  }
}

async function cancelShow(id) {
  const result = await query(
    `UPDATE shows SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) throw new AppError('Show not found', 404);
  return result.rows[0];
}

module.exports = { listShows, getShow, createShow, cancelShow };
