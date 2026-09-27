-- SeatFlow PostgreSQL Schema
-- Transactional data: users, events, venues, shows, seats, reservations, bookings, payments

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'ADMIN', 'SYSTEM');
CREATE TYPE event_type AS ENUM ('MOVIE', 'CONCERT', 'SPORTS', 'THEATRE', 'CONFERENCE', 'OTHER');
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'LOCKED', 'BOOKED', 'BLOCKED');
CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED');
CREATE TYPE booking_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- Venues
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    capacity INTEGER,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_city ON venues(city);

-- Screens / Sections (for venues)
CREATE TABLE screens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 10,
    seats_per_row INTEGER NOT NULL DEFAULT 10,
    layout JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screens_venue ON screens(venue_id);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type NOT NULL DEFAULT 'OTHER',
    language VARCHAR(50),
    genre VARCHAR(100),
    duration_minutes INTEGER,
    poster_url TEXT,
    artist VARCHAR(200),
    metadata JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_published ON events(is_published);
CREATE INDEX idx_events_title ON events USING gin(to_tsvector('english', title));

-- Shows
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id),
    screen_id UUID REFERENCES screens(id),
    show_date DATE NOT NULL,
    show_time TIME NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pricing JSONB DEFAULT '{}',  -- e.g. {"GOLD": 250, "PREMIUM": 350, "VIP": 500}
    status VARCHAR(20) DEFAULT 'SCHEDULED',  -- SCHEDULED, CANCELLED, COMPLETED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shows_event ON shows(event_id);
CREATE INDEX idx_shows_venue ON shows(venue_id);
CREATE INDEX idx_shows_date ON shows(show_date);
CREATE UNIQUE INDEX idx_shows_unique ON shows(event_id, venue_id, screen_id, show_date, show_time);

-- Seats (physical seats in a screen)
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    seat_label VARCHAR(10) NOT NULL,  -- A1, B5, etc.
    row_label VARCHAR(5) NOT NULL,
    seat_number INTEGER NOT NULL,
    category VARCHAR(50) DEFAULT 'STANDARD',  -- GOLD, PREMIUM, VIP, STANDARD
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(screen_id, seat_label)
);

CREATE INDEX idx_seats_screen ON seats(screen_id);

-- Show seats (status per show)
CREATE TABLE show_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(id),
    status seat_status NOT NULL DEFAULT 'AVAILABLE',
    price DECIMAL(10, 2) NOT NULL,
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMPTZ,
    booked_by UUID REFERENCES users(id),
    UNIQUE(show_id, seat_id)
);

CREATE INDEX idx_show_seats_show ON show_seats(show_id);
CREATE INDEX idx_show_seats_status ON show_seats(show_id, status);

-- Reservations (temporary locks)
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    show_id UUID NOT NULL REFERENCES shows(id),
    status reservation_status NOT NULL DEFAULT 'ACTIVE',
    total_amount DECIMAL(10, 2) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_show ON reservations(show_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires ON reservations(expires_at) WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX idx_reservations_idempotency ON reservations(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Reservation seats
CREATE TABLE reservation_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    show_seat_id UUID NOT NULL REFERENCES show_seats(id),
    seat_label VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    UNIQUE(reservation_id, show_seat_id)
);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    show_id UUID NOT NULL REFERENCES shows(id),
    reservation_id UUID REFERENCES reservations(id),
    status booking_status NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(10, 2) NOT NULL,
    convenience_fee DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    payment_id UUID,
    ticket_url TEXT,
    qr_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_show ON bookings(show_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_code ON bookings(booking_code);

-- Booking seats
CREATE TABLE booking_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    show_seat_id UUID NOT NULL REFERENCES show_seats(id),
    seat_label VARCHAR(10) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    reservation_id UUID REFERENCES reservations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'PENDING',
    gateway VARCHAR(50) DEFAULT 'stripe',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    gateway_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway_order ON payments(gateway_order_id);

-- Processed webhooks (idempotency)
CREATE TABLE processed_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(100) NOT NULL UNIQUE,
    payment_id UUID REFERENCES payments(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'PROCESSED',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_processed_webhooks_event ON processed_webhooks(event_id);

-- Refunds
CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_id UUID NOT NULL REFERENCES payments(id),
    amount DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    gateway_refund_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (lightweight in PG; detailed in Mongo)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shows_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
