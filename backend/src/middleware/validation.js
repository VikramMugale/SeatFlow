const Joi = require('joi');

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: details,
      });
    }

    req[property] = value;
    next();
  };
}

// Common schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    phone: Joi.string().pattern(/^[+]?[\d\s-]{8,20}$/).optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  createEvent: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().allow('').optional(),
    eventType: Joi.string().valid('MOVIE', 'CONCERT', 'SPORTS', 'THEATRE', 'CONFERENCE', 'OTHER').required(),
    language: Joi.string().max(50).optional(),
    genre: Joi.string().max(100).optional(),
    durationMinutes: Joi.number().integer().min(1).optional(),
    posterUrl: Joi.string().uri().optional(),
    artist: Joi.string().max(200).optional(),
    metadata: Joi.object().optional(),
    isPublished: Joi.boolean().optional(),
  }),

  createVenue: Joi.object({
    name: Joi.string().min(2).max(200).required(),
    city: Joi.string().min(2).max(100).required(),
    address: Joi.string().optional(),
    capacity: Joi.number().integer().min(1).optional(),
    metadata: Joi.object().optional(),
  }),

  createShow: Joi.object({
    eventId: Joi.string().uuid().required(),
    venueId: Joi.string().uuid().required(),
    screenId: Joi.string().uuid().optional(),
    showDate: Joi.string().isoDate().required(),
    showTime: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
    basePrice: Joi.number().positive().required(),
    pricing: Joi.object().pattern(Joi.string(), Joi.number().positive()).optional(),
  }),

  createReservation: Joi.object({
    showId: Joi.string().uuid().required(),
    seatIds: Joi.array().items(Joi.string().uuid()).min(1).max(10).required(),
  }),

  createPayment: Joi.object({
    reservationId: Joi.string().uuid().required(),
  }),
};

module.exports = { validate, schemas };
