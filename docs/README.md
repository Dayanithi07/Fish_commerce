# Fishcommerce

A modern, client-side pet fish store: a customer storefront and an admin portal, built with **React + Vite**. There is no backend. Everything is stored in the browser's `localStorage`, and checkout takes no payment.

> **Demo project.** The admin login is hard-coded and customer passwords are stored in plaintext in the browser. Do not deploy it publicly as a real store. See [Known limitations](#known-limitations).

## Features

**Storefront**
- Home page with an animated Betta tank hero
- Catalog with water-type and care-level filters, search, and shareable URLs (`?type=&care=&q=`)
- Product detail with care specs, stock status and quantity selector
- Cart drawer, guest or account checkout, order confirmation with a reference number
- Care Basics and About pages

**Admin portal** (`/admin`)
- Product management: add, edit, show/hide, delete
- Order management: Pending → Confirmed → Shipped → Delivered
- New-order notification (toast and bell count), including orders placed in another browser tab

## Quick start

```powershell
# 1. Put setup_project.ps1 in the project folder (next to these .md files) and run:
.\setup_project.ps1

# 2. Start the dev server
npm run dev
```

Open **http://localhost:5173**. Full instructions, manual setup, deployment and troubleshooting are in [RUNNING.md](RUNNING.md).

**Requirements:** Node.js 20.19+ or 22.12+ (LTS) and npm.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@fishcommerce.com` | `admin123` |
| Customer | Create one on the Sign Up tab, or choose **Continue as Guest** | any (min. 8 characters) |

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite + `@vitejs/plugin-react` |
| UI | React |
| Routing | React Router v7 (`react-router-dom`) |
| State | React Context + `useReducer` |
| Storage | `localStorage` |
| Styling | Vanilla CSS with design tokens; Plus Jakarta Sans |

Only three runtime dependencies: `react`, `react-dom`, `react-router-dom`.

## Project structure

```
src/
├── App.jsx · main.jsx · index.css · config.js
├── data/          seed products (fishData.js)
├── utils/         storage, money, id, validators
├── context/       Auth, Product, Cart, Order
├── components/    Navbar, Footer, CartDrawer, ProductCard, FilterBar, Modal, Toast
└── pages/         Home, Catalog, ProductDetail, Checkout, OrderSuccess, Auth, Care, About, NotFound
    └── admin/     AdminLayout, AdminProducts, AdminOrders
public/images/fish/   product images (stable paths)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Documentation

| File | Purpose |
|---|---|
| [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md) | Product goals, functional requirements (`FR-*`), business rules, validation, UX/UI spec, decisions log |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Structure, routing, context API contracts, flows, error handling, deployment |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | `localStorage` data model, seed data, invariants, future SQL schema |
| [implementation_plan.md](implementation_plan.md) | Concise file-by-file plan |
| [implementation_plan_full.md](implementation_plan_full.md) | Phases, task IDs, owners, 24 test cases, risks, release checklist |
| [AGENT_SPECIFICATIONS.md](AGENT_SPECIFICATIONS.md) | Nine module-scoped build agents with prompts, file ownership and gates |
| [RUNNING.md](RUNNING.md) | Setup, run, deploy, troubleshoot |
| `setup_project.ps1` | Scaffolds the project (Windows PowerShell 5.1+ or PowerShell 7) |

## Building it with multiple agents

The build is split into module-scoped agents so several can work in parallel:

1. **Wave 0:** `setup_project.ps1` (the scaffold agent).
2. **Wave 1:** Design System, Data and State, Assets and Content.
3. **Wave 2:** Storefront, Auth and Checkout, Admin Portal.
4. **Wave 3:** QA and Accessibility, then release.

Each agent has a starter prompt, an owned-file list and acceptance criteria in [AGENT_SPECIFICATIONS.md](AGENT_SPECIFICATIONS.md).

## Known limitations

- **Per-browser data.** Orders and products live in one browser's `localStorage`. Clearing site data resets the store to the seed catalog. The admin sees only orders placed in the same browser profile.
- **Not secure.** Admin credentials are in the source code and customer passwords are stored unhashed. A real store needs a backend with proper authentication.
- **No payment, email or SMS.** The team is expected to contact the customer after an order is placed.
- **Live animals.** Selling and shipping live fish may be subject to local regulations. The software does not check this.

## Roadmap

Backend API and database, real authentication, order notifications, cancellations and refunds, payment gateway, image uploads, automated tests. See [PROJECT_REQUIREMENTS.md §9](PROJECT_REQUIREMENTS.md) and [DATABASE_SCHEMA.md §12](DATABASE_SCHEMA.md).
