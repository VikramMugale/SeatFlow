const { query } = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const { isSeatLocked } = require('../../config/redis');

async function getShowSeats(showId) {
  const showCheck = await query('SELECT id FROM shows WHERE id = $1', [showId]);
  if (showCheck.rows.length === 0) {
    throw new AppError('Show not found', 404, 'SHOW_NOT_FOUND');
  }

  const result = await query(
    `SELECT ss.id, ss.status, ss.price, ss.locked_by, se.seat_label, se.row_label, se.seat_number, se.category
     FROM show_seats ss
     JOIN seats se ON se.id = ss.seat_id
     WHERE ss.show_id = $1
     ORDER BY se.row_label, se.seat_number`,
    [showId]
  );

  // Enrich with live Redis lock state (source of truth for temporary locks)
  const seats = await Promise.all(
    result.rows.map(async (row) => {
      let status = row.status;
      // If DB says AVAILABLE but Redis has a lock, treat as LOCKED
      if (status === 'AVAILABLE') {
        const locked = await isSeatLocked(showId, row.id);
        if (locked) status = 'LOCKED';
      }
      return {
        id: row.id,
        label: row.seat_label,
        row: row.row_label,
        number: row.seat_number,
        category: row.category,
        status,
        price: parseFloat(row.price),
      };
    })
  );

  return { showId, seats };
}

module.exports = { getShowSeats };
