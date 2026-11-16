-- O que mora no Postgres: tudo que é TEXTO e CADASTRO.
-- O que NÃO mora aqui: saldos e lançamentos — esses são do TigerBeetle.

CREATE TABLE IF NOT EXISTS accounts (
    id           BIGINT PRIMARY KEY,           -- o mesmo número da conta no TigerBeetle
    name         TEXT     NOT NULL,
    type         SMALLINT NOT NULL,
    no_overdraft BOOLEAN  NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS products (
    id             BIGSERIAL PRIMARY KEY,
    sku            TEXT   NOT NULL UNIQUE,
    name           TEXT   NOT NULL,
    price_cents    BIGINT NOT NULL,
    avg_cost_cents BIGINT NOT NULL DEFAULT 0,
    stock          INT    NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS sales (
    id         BIGSERIAL PRIMARY KEY,
    customer   TEXT        NOT NULL,
    status     TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sale_items (
    sale_id          BIGINT NOT NULL REFERENCES sales (id),
    position         INT    NOT NULL,
    product_id       BIGINT NOT NULL REFERENCES products (id),
    name             TEXT   NOT NULL,
    qty              INT    NOT NULL,
    unit_price_cents BIGINT NOT NULL,
    unit_cost_cents  BIGINT NOT NULL,
    PRIMARY KEY (sale_id, position)
);

CREATE TABLE IF NOT EXISTS purchases (
    id         BIGSERIAL PRIMARY KEY,
    supplier   TEXT        NOT NULL,
    status     TEXT        NOT NULL,
    pending_id TEXT        NOT NULL DEFAULT '',  -- id da reserva no TigerBeetle
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
    purchase_id     BIGINT NOT NULL REFERENCES purchases (id),
    position        INT    NOT NULL,
    product_id      BIGINT NOT NULL REFERENCES products (id),
    name            TEXT   NOT NULL,
    qty             INT    NOT NULL,
    unit_cost_cents BIGINT NOT NULL,
    PRIMARY KEY (purchase_id, position)
);

-- O "histórico" de cada grupo de lançamentos. O id é o mesmo valor gravado em
-- user_data_128 das transferências no TigerBeetle: é a ponte entre os bancos.
CREATE TABLE IF NOT EXISTS postings (
    id         TEXT PRIMARY KEY,
    memo       TEXT        NOT NULL,
    doc_type   TEXT        NOT NULL DEFAULT '',
    doc_id     BIGINT      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL
);
