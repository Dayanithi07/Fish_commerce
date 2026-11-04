-- Fishcommerce Relational Database Schema (PostgreSQL / SQLite compatible)
-- Reference: docs/DATABASE_SCHEMA.md Section 12

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          TEXT         NOT NULL DEFAULT 'customer',
  created_at    TEXT         NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL UNIQUE,
  price_cents   INTEGER      NOT NULL CHECK (price_cents > 0),
  image_url     TEXT         NOT NULL,
  water_type    TEXT         NOT NULL,
  care_level    TEXT         NOT NULL,
  temperament   TEXT         NOT NULL,
  min_tank_gal  INTEGER      NOT NULL CHECK (min_tank_gal BETWEEN 1 AND 1000),
  diet          VARCHAR(60)  NOT NULL,
  description   TEXT         NOT NULL,
  stock         INTEGER      NOT NULL CHECK (stock >= 0),
  is_available  BOOLEAN      NOT NULL DEFAULT 1,
  badges        TEXT         NOT NULL DEFAULT '[]', -- JSON array
  created_at    TEXT         NOT NULL,
  updated_at    TEXT         NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  reference       VARCHAR(20)  NOT NULL UNIQUE,
  user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name   VARCHAR(60)  NOT NULL,
  customer_phone  VARCHAR(20)  NOT NULL,
  customer_email  VARCHAR(120) NOT NULL,
  street          VARCHAR(120) NOT NULL,
  city            VARCHAR(60)  NOT NULL,
  postal_code     VARCHAR(10)  NOT NULL,
  notes           TEXT         NOT NULL DEFAULT '',
  subtotal_cents  INTEGER      NOT NULL,
  shipping_cents  INTEGER      NOT NULL,
  total_cents     INTEGER      NOT NULL,
  status          TEXT         NOT NULL DEFAULT 'Pending',
  created_at      TEXT         NOT NULL,
  updated_at      TEXT         NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  TEXT,
  name        VARCHAR(60) NOT NULL,
  price_cents INTEGER NOT NULL,
  image_url   TEXT    NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS order_status_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  TEXT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status    TEXT         NOT NULL,
  at        TEXT         NOT NULL
);
