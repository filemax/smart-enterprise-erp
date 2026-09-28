-- Smart Enterprise ERP Supabase Database Starter Schema
create table if not exists shops(id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());
create table if not exists products(id uuid primary key default gen_random_uuid(), name text not null, category text, price numeric default 0, stock numeric default 0, created_at timestamptz default now());
create table if not exists customers(id uuid primary key default gen_random_uuid(), name text not null, phone text, balance numeric default 0);
create table if not exists suppliers(id uuid primary key default gen_random_uuid(), name text not null, phone text);
create table if not exists sales(id uuid primary key default gen_random_uuid(), invoice_no text, customer_id uuid, total numeric default 0, created_at timestamptz default now());
create table if not exists sale_items(id uuid primary key default gen_random_uuid(), sale_id uuid references sales(id) on delete cascade, product_id uuid, qty numeric, price numeric);
create table if not exists expenses(id uuid primary key default gen_random_uuid(), title text, amount numeric, created_at timestamptz default now());

create table if not exists stock_transactions(id uuid primary key default gen_random_uuid(), transaction_type text, reference_id uuid, data jsonb, created_at timestamptz default now());


-- Phase 5 Accounting Sync
create table if not exists customer_payments(
 id uuid primary key default gen_random_uuid(),
 customer_id uuid,
 amount numeric default 0,
 payment_method text,
 note text,
 created_at timestamptz default now()
);

create table if not exists supplier_payments(
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid,
 amount numeric default 0,
 payment_method text,
 note text,
 created_at timestamptz default now()
);

create table if not exists ledger_entries(
 id uuid primary key default gen_random_uuid(),
 account_type text,
 account_id uuid,
 debit numeric default 0,
 credit numeric default 0,
 reference_type text,
 reference_id uuid,
 created_at timestamptz default now()
);


-- Phase 6 Purchase Sync
create table if not exists purchases(
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid,
 invoice_no text,
 total numeric default 0,
 payment_type text default 'cash',
 created_at timestamptz default now()
);

create table if not exists purchase_items(
 id uuid primary key default gen_random_uuid(),
 purchase_id uuid references purchases(id) on delete cascade,
 product_id uuid,
 qty numeric default 0,
 price numeric default 0
);


-- Phase 7 Accounting Core
create table if not exists accounts(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 account_type text,
 balance numeric default 0,
 created_at timestamptz default now()
);

create table if not exists journal_entries(
 id uuid primary key default gen_random_uuid(),
 description text,
 reference text,
 entry_date timestamptz default now()
);

create table if not exists journal_items(
 id uuid primary key default gen_random_uuid(),
 journal_id uuid references journal_entries(id) on delete cascade,
 account_id uuid references accounts(id),
 debit numeric default 0,
 credit numeric default 0
);

create table if not exists cash_transactions(
 id uuid primary key default gen_random_uuid(),
 description text,
 amount numeric default 0,
 transaction_type text,
 created_at timestamptz default now()
);

create table if not exists bank_transactions(
 id uuid primary key default gen_random_uuid(),
 description text,
 amount numeric default 0,
 transaction_type text,
 created_at timestamptz default now()
);


-- Phase 9 Advanced ERP
create table if not exists user_shops(
 id uuid primary key default gen_random_uuid(),
 user_id uuid,
 shop_id uuid,
 created_at timestamptz default now()
);

create table if not exists audit_logs(
 id uuid primary key default gen_random_uuid(),
 action text,
 module text,
 details text,
 created_at timestamptz default now()
);

alter table if exists products add column if not exists barcode text;
