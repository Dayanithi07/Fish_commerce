# 🐠 Fishcommerce

> **A modern, full-stack pet fish e-commerce platform built with React, Vite, Supabase, and Resend.**  
> Featuring cinematic underwater hero visuals, swimming interactive fish canvas, real-time inventory management, Gmail OAuth authentication, and automated order notification dispatch.

---

## ✨ Features

### 🌊 Cinematic Underwater Experience
- **Fluid Underwater Hero**: Looping ambient underwater video background with rising bubble particles.
- **Swimming Betta Fish**: Beautiful SVG animated companion that swims across the viewport.
- **Glassmorphic Navigation**: Floating pill navbar that transforms into a sticky frosted glass header as you scroll.
- **Custom Brand Identity**: Handcrafted Betta fish SVG logo with neon violet-to-cyan glow.

### 🐟 Species Catalog & Care Guides
- **Live Search & Multi-Filters**: Instant filtering by water chemistry (*Freshwater*, *Saltwater*) and care difficulty (*Beginner*, *Intermediate*, *Expert*).
- **Species Dossiers**: Deep care guidance including minimum tank volume, dietary needs, temperament, and species compatibility.
- **Dynamic Stock Control**: Prevents overselling with real-time inventory decrementing and out-of-stock badges.

### 🛒 Frictionless Cart & Checkout
- **Slide-Over Glass Drawer**: Persistent drawer with inline quantity steppers, subtotal tallies, and climate-controlled shipping calculations.
- **Online-Only Checkout**: Razorpay checkout with server-side signature and capture verification; cash on delivery is unavailable.
- **Guest & Member Checkout**: Supports guest ordering via unique references (`FC-YYYYMMDD-XXXX`) alongside authenticated customer accounts.

### 🔐 Authentication & Role-Based Access Control
- **Supabase Auth**: Secure email/password and **Google OAuth ("Gmail Auth")**.
- **Admin Elevation**: Whitelisted administrative roles for store owners (`starboy1s2s3s3@gmail.com`).
- **Row-Level Security (RLS)**: Fine-grained PostgreSQL access control protecting personal order records and customer profiles.

### 📧 Automated Dual Notifications (Resend Relay)
- **Customer Order Confirmation**: Instant HTML invoice detailing purchased species, quantities, shipping address, and climate-controlled packaging assurances.
- **Admin Alert Email**: Direct dispatch to store administrators (`starboy1s2s3s3@gmail.com`) with complete customer details and line items upon order placement.

### ⚙️ Store Management Portal
- **Inventory Control**: Live stock manager with bulk actions (hide, restock, delete, add new species).
- **Live Order Feed**: Real-time incoming order toasts and forward-only status advancement (`Pending` → `Confirmed` → `Shipped` → `Delivered`).
- **Admin Settings**: Configure administrator contact information, operational hours, and notification dispatch routes.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6 |
| **Styling** | Native CSS Modules, Custom Design Tokens, Glassmorphism, Plus Jakarta Sans |
| **Backend & DB** | Supabase (PostgreSQL 17, RPC Stored Procedures, Realtime Channels) |
| **Payments** | Razorpay Checkout (server-side Express API; key secret stays off the client) |
| **Authentication** | Supabase Auth (Email + Google OAuth) |
| **Transactional Email** | Resend API Relay |
| **State Management** | Context API (`AuthContext`, `ProductContext`, `CartContext`, `OrderContext`) |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ or v20+
- **npm** or **pnpm** / **yarn**

### 2. Clone the Repository
```bash
git clone https://github.com/Dayanithi07/Fish_commerce.git
cd Fish_commerce
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your project credentials:
```env
# Supabase Project Credentials (from your Supabase Dashboard -> Project Settings -> API)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key

# Transactional Email Relay (Resend API Key)
VITE_RESEND_API_KEY=re_your_api_key_here
VITE_ADMIN_EMAIL=starboy1s2s3s3@gmail.com
```

### 5. Initialize the Database
1. Open your Supabase project dashboard.
2. Navigate to **SQL Editor** → **New Query**.
3. Execute the SQL migrations in `supabase/migrations/` in filename order, including [`20261105000000_require_online_payment.sql`](supabase/migrations/20261105000000_require_online_payment.sql), which disables direct unpaid order creation.

### 6. Run the Development Server

Start the backend in one terminal (PowerShell example):
```powershell
$env:RAZORPAY_KEY_ID = "rzp_test_your_key_id"
$env:RAZORPAY_KEY_SECRET = "your_razorpay_key_secret"
npm run server
```

Then start the storefront in another terminal:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

Use Razorpay test keys for development. The Express backend must have `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` set in its environment for checkout; never expose the secret as a `VITE_` variable or commit real credentials. The bundled JSON-file API is for development only; live payments require durable order storage, payment reconciliation/webhooks and HTTPS.

---

## 📂 Project Structure

```text
Fish_commerce/
├── public/
│   ├── images/
│   │   ├── logo.svg          # Official brand SVG logo & favicon
│   │   ├── placeholder.svg   # Species placeholder artwork
│   │   └── hero-bg.jpg       # Cinematic underwater backdrop
│   └── video/
│       └── hero-fish.mp4     # Ambient underwater video loop
├── src/
│   ├── components/           # Reusable UI components (Navbar, CartDrawer, ProductCard, Toast, etc.)
│   ├── context/              # Global state providers (Auth, Products, Cart, Orders)
│   ├── data/                 # Seed catalog and mock fixtures
│   ├── lib/                  # Third-party clients (Supabase client instance)
│   ├── pages/                # App views (Home, Catalog, Detail, Checkout, Success, Auth, Care)
│   │   ├── admin/            # Store admin dashboard (Products, Orders, History, Settings)
│   │   └── customer/         # Customer account views (Order tracking)
│   ├── services/             # Notification service (Resend API relay)
│   └── utils/                # Monetary calculations, storage helpers, ID generators, validators
├── supabase/
│   └── migrations/           # PostgreSQL DDL migrations & stored procedures
├── .env.example              # Template environment variables
├── package.json
└── vite.config.js
```

---

## 🔒 Security & Best Practices

- **Zero Secret Exposure**: Public keys only in client-side bundles; secret keys (`service_role`) are strictly kept in protected environments.
- **Strict Row-Level Security**: Unauthenticated and customer users can only read and mutate authorized records.
- **Anti-Overselling Guardrails**: Stock decrement happens through PostgreSQL `FOR UPDATE` row locking inside stored procedures.
- **Fail-Safe Fallbacks**: Built-in graceful degradation ensuring local preview testing continues smoothly even before live credentials are bound.

---

## 👤 Author & Support

- **GitHub**: [@Dayanithi07](https://github.com/Dayanithi07)

---
*Built with care for aquatic life and clean code.* 🐠🌊
