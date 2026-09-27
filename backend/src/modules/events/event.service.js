const { query } = require('../../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../../config/redis');
const { AppError } = require('../../middleware/errorHandler');

async function listEvents({ type, city, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const conditions = ['e.is_published = true'];
  const params = [];
  let idx = 1;

  if (type) {
    conditions.push(`e.event_type = $${idx++}`);
    params.push(type);
  }
  if (search) {
    conditions.push(`(e.title ILIKE $${idx} OR e.artist ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (city) {
    conditions.push(`EXISTS (
      SELECT 1 FROM shows s JOIN venues v ON v.id = s.venue_id
      WHERE s.event_id = e.id AND v.city ILIKE $${idx}
    )`);
    params.push(`%${city}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await query(
    `SELECT e.*, 
      (SELECT MIN(s.show_date) FROM shows s WHERE s.event_id = e.id AND s.status = 'SCHEDULED') as next_show_date
     FROM events e
     ${where}
     ORDER BY e.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM events e ${where}`,
    params.slice(0, -2)
  );

  return {
    events: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count, 10),
    },
  };
}

async function getEvent(id) {
  const cacheKey = `event:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT e.*, u.name as created_by_name
     FROM events e
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  const shows = await query(
    `SELECT s.*, v.name as venue_name, v.city as venue_city, sc.name as screen_name
     FROM shows s
     JOIN venues v ON v.id = s.venue_id
     LEFT JOIN screens sc ON sc.id = s.screen_id
     WHERE s.event_id = $1 AND s.status = 'SCHEDULED'
     ORDER BY s.show_date, s.show_time`,
    [id]
  );

  const event = { ...result.rows[0], shows: shows.rows };
  await cacheSet(cacheKey, event, 120);
  return event;
}

async function listManageEvents() {
  const result = await query(
    `SELECT e.*, (SELECT MIN(s.show_date) FROM shows s
      WHERE s.event_id = e.id AND s.status = 'SCHEDULED') AS next_show_date
     FROM events e
     ORDER BY e.created_at DESC`
  );
  return result.rows;
}

async function createEvent(data, userId) {
  const result = await query(
    `INSERT INTO events (title, description, event_type, language, genre, duration_minutes, poster_url, artist, metadata, is_published, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.title,
      data.description || null,
      data.eventType,
      data.language || null,
      data.genre || null,
      data.durationMinutes || null,
      data.posterUrl || null,
      data.artist || null,
      JSON.stringify(data.metadata || {}),
      data.isPublished || false,
      userId,
    ]
  );
  return result.rows[0];
}

async function updateEvent(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const map = {
    title: 'title',
    description: 'description',
    eventType: 'event_type',
    language: 'language',
    genre: 'genre',
    durationMinutes: 'duration_minutes',
    posterUrl: 'poster_url',
    artist: 'artist',
    isPublished: 'is_published',
  };

  for (const [key, col] of Object.entries(map)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      values.push(data[key]);
    }
  }
  if (data.metadata !== undefined) {
    fields.push(`metadata = $${idx++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (fields.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  values.push(id);
  const result = await query(
    `UPDATE events SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values
  );
  if (result.rows.length === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }
  await cacheDel(`event:${id}`);
  return result.rows[0];
}

async function deleteEvent(id) {
  const result = await query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }
  await cacheDel(`event:${id}`);
  return { success: true };
}

module.exports = { listEvents, listManageEvents, getEvent, createEvent, updateEvent, deleteEvent };
