-- Star schema for the Online Retail warehouse (DuckDB).
-- Grain of fact_sales: one fulfilled invoice line. fact_returns: one credit-note line.
-- PRIMARY KEY and FOREIGN KEY constraints are enforced by DuckDB on insert, so a
-- broken surrogate-key mapping aborts the load instead of producing silent orphans.

CREATE TABLE dim_date (
    date_key     INTEGER PRIMARY KEY,      -- yyyymmdd
    date         DATE NOT NULL,
    year         SMALLINT NOT NULL,
    quarter      TINYINT NOT NULL,
    month        TINYINT NOT NULL,
    month_start  DATE NOT NULL,
    month_label  VARCHAR NOT NULL,         -- 'YYYY-MM'
    iso_week     TINYINT NOT NULL,
    day_of_week  TINYINT NOT NULL,         -- 1 = Monday
    day_name     VARCHAR NOT NULL,
    is_weekend   BOOLEAN NOT NULL
);

CREATE TABLE dim_product (
    product_key  INTEGER PRIMARY KEY,
    stock_code   VARCHAR NOT NULL UNIQUE,
    description  VARCHAR NOT NULL,
    category     VARCHAR NOT NULL
);

CREATE TABLE dim_customer (
    customer_key     INTEGER PRIMARY KEY,  -- 0 = guest / unknown
    customer_id      VARCHAR NOT NULL UNIQUE,
    country          VARCHAR,
    first_order_date DATE,
    cohort_month     DATE,
    is_guest         BOOLEAN NOT NULL
);

CREATE TABLE fact_sales (
    invoice_no   VARCHAR NOT NULL,
    line_no      INTEGER NOT NULL,
    date_key     INTEGER NOT NULL REFERENCES dim_date (date_key),
    invoice_ts   TIMESTAMP NOT NULL,
    customer_key INTEGER NOT NULL REFERENCES dim_customer (customer_key),
    product_key  INTEGER NOT NULL REFERENCES dim_product (product_key),
    country      VARCHAR NOT NULL,
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   DOUBLE NOT NULL CHECK (unit_price > 0),
    revenue      DOUBLE NOT NULL,
    source_row   BIGINT NOT NULL,          -- lineage back to the raw file
    PRIMARY KEY (invoice_no, line_no)
);

CREATE TABLE fact_returns (
    invoice_no   VARCHAR NOT NULL,         -- credit note number ('C…')
    line_no      INTEGER NOT NULL,
    date_key     INTEGER NOT NULL REFERENCES dim_date (date_key),
    invoice_ts   TIMESTAMP NOT NULL,
    customer_key INTEGER NOT NULL REFERENCES dim_customer (customer_key),
    product_key  INTEGER NOT NULL REFERENCES dim_product (product_key),
    country      VARCHAR NOT NULL,
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   DOUBLE NOT NULL CHECK (unit_price > 0),
    revenue      DOUBLE NOT NULL,          -- value credited (positive)
    source_row   BIGINT NOT NULL,
    PRIMARY KEY (invoice_no, line_no)
);
