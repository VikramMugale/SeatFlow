/**
 * MongoDB models for flexible document data
 * Ownership boundary:
 *   PostgreSQL → transactional (bookings, payments, seats)
 *   MongoDB    → content / logs / notifications / search docs
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_FAILED', 'REMINDER', 'SYSTEM'],
      required: true,
    },
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false },
    channel: { type: String, enum: ['email', 'in_app', 'push'], default: 'in_app' },
  },
  { timestamps: true }
);

const auditLogSchema = new mongoose.Schema(
  {
    userId: String,
    action: { type: String, required: true },
    resourceType: String,
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  { timestamps: true }
);

const eventMetadataSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    tags: [String],
    cast: [String],
    trailers: [String],
    reviews: [
      {
        userId: String,
        rating: Number,
        comment: String,
        createdAt: Date,
      },
    ],
    searchText: String, // denormalized for text search
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const EventMetadata = mongoose.model('EventMetadata', eventMetadataSchema);

module.exports = { Notification, AuditLog, EventMetadata };
