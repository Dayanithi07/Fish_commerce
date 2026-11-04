# Fishcommerce — Implementation Plan

A modern, client-side pet fish e-commerce application with a customer storefront and an admin portal.

This is the **concise plan**: what gets built, file by file. It refines the original draft with the decisions in `PROJECT_REQUIREMENTS.md` §2 (items marked ➕ are additions, ✎ are changes). For phases, task IDs, owners, test cases and risks see `implementation_plan_full.md`; for who builds what see `AGENT_SPECIFICATIONS.md`.

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Vite + React** | Fast dev server, modern bundler |
| Routing | **React Router v7** (`react-router-dom`) | Standard SPA routing with nested routes |
| Styling | **Vanilla CSS** with CSS variables | Per design-system spec, maximum control |
| State | **React Context** + `useReducer` | No external deps; Auth, Products, Cart, Orders, Toast |
| Persistence | **localStorage** (+ two `sessionStorage` flags) | Survives refresh; no backend needed |
| Fonts | **Plus Jakarta Sans** via Google Fonts | Brand typography |
| Animation | **CSS animations** | Betta tank animation, micro-interactions |

---

## Architecture

```
src/
├── main.jsx                  # App entry
├── App.jsx                   # Providers + BrowserRouter + routes
├── index.css                 # Design tokens, reset, global/utility classes
├── config.js                 # ➕ Currency, shipping, demo admin, storage prefix
├── data/
│   └── fishData.js           # Seed product array (14 fish)
├── utils/                    # ➕
│   ├── storage.js            #   Safe localStorage + cross-tab subscribe + migrations
│   ├── money.js              #   Cents-safe maths + formatPrice
│   ├── id.js                 #   newId, newOrderReference
│   └── validators.js         #   Form and entity validation
├── context/
│   ├── AuthContext.jsx       # Login, signup, guest, session
│   ├── CartContext.jsx       # Cart lines, quantities, drawer open state
│   ├── OrderContext.jsx      # Orders, status transitions, cross-tab notifications
│   └── ProductContext.jsx    # Products CRUD, backed by localStorage
├── components/
│   ├── Navbar.jsx/.css
│   ├── Footer.jsx/.css
│   ├── CartDrawer.jsx/.css   # ➕ slide-over cart
│   ├── ProductCard.jsx/.css
│   ├── FilterBar.jsx/.css
│   ├── Modal.jsx/.css
│   └── Toast.jsx/.css        # ✎ also exports ToastProvider + useToast
├── pages/
│   ├── Home / Catalog / ProductDetail / Checkout / OrderSuccess / Auth   (.jsx + .css each)
│   ├── Care / About / NotFound                                           # ➕
│   └── admin/
│       ├── AdminLayout.jsx/.css
│       ├── AdminProducts.jsx/.css
│       └── AdminOrders.jsx/.css
└── assets/                   # Logo and brand SVGs
public/
└── images/fish/              # ✎ product images, stable paths (not hashed by Vite)
```

---

## Proposed Changes

### Design System and Global Styles

#### [NEW] `src/index.css`
- `:root` tokens for colours, radii, shadows (full list: `PROJECT_REQUIREMENTS.md` §7.1).
- Plus Jakarta Sans (the `<link>` lives in `index.html`).
- Reset, body defaults, `.container`, `.visually-hidden`, `.skip-link`, global `:focus-visible`.
- Buttons `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-danger-outline`; `.badge` and status variants; `.card`.
- `prefers-reduced-motion` rule.

---

### Data Layer

#### [NEW] `src/config.js`  ➕
`STORAGE_PREFIX`, `SCHEMA_VERSION`, `CURRENCY`, `LOCALE`, `SHIPPING_FLAT` (5.99), `DEMO_ADMIN`.

#### [NEW] `src/data/fishData.js`
- 14 fish objects with `id`, `name`, `price`, `image`, `waterType` ✎, `careLevel`, `temperament`, `minTankSize`, `diet`, `description`, `stock`, `isAvailable`, `badges[]`. Full table: `DATABASE_SCHEMA.md` §7.
- Initial seed only: `ProductContext` copies it to `localStorage` on first load.

#### [NEW] `src/context/AuthContext.jsx`
- `user` (null = guest), `isAuthenticated`, `isAdmin`.
- `login(email, password)`, `signup(name, email, password)`, `logout()`, all returning result objects.
- Hard-coded admin `admin@fishcommerce.com` checked first; others are customers.
- Persists `fc_users` and `fc_session`.

#### [NEW] `src/context/CartContext.jsx`
- `items[]` of `{ productId, quantity }`; derived `lines`, `itemCount`, `subtotal`.
- `addToCart`, `removeFromCart`, `updateQuantity`, `clearCart`; `isOpen` / `openCart` / `closeCart` ➕.
- Quantities clamped to stock; reconciled against current products on load ➕.

#### [NEW] `src/context/OrderContext.jsx`
- `orders[]` of `{ id, reference, items(snapshot), customer, address, notes, subtotal, shipping, total, status, statusHistory, createdAt, updatedAt }`.
- `placeOrder(data)`: validates stock, snapshots lines, decrements stock, generates `id` and `reference` ✎.
- `updateOrderStatus(orderId, next)`: forward-only `Pending → Confirmed → Shipped → Delivered` ✎.
- `pendingCount` (status `Pending`), `activeOrders`, `deliveredOrders`, `latestIncoming` (cross-tab notification) ➕.

#### [NEW] `src/context/ProductContext.jsx`
- Initialises from `localStorage`, falls back to the `fishData.js` seed.
- `addProduct`, `updateProduct`, `deleteProduct`, `toggleAvailability`, `getProductById`, `availableProducts`, `resetToSeed`.
- Persists every mutation.

#### [NEW] `src/utils/*`  ➕
Storage safety, money maths, ID/reference generation, validators.

---

### Shared Components

#### [NEW] `Navbar.jsx`
- Left: "Fishcommerce" text logo in `--text-primary` bold.
- Centre: Home, Catalog, Care Basics, About Us.
- Right: cart icon with count badge (opens CartDrawer ✎), Login or user name + dropdown (Admin Dashboard if admin, Logout).
- Sticky, white with a subtle bottom border; hamburger menu below 768px.

#### [NEW] `Footer.jsx`
3-column layout (brand, quick links, contact) with a lavender gradient top accent.

#### [NEW] `CartDrawer.jsx`  ➕
Slide-over from the right: line items with thumbnail, quantity stepper, remove, subtotal, **Checkout** button, empty state; focus-trapped and `Esc` closes.

#### [NEW] `ProductCard.jsx`
White rounded card with hover lift; image, name, accent-coloured price, badge pills, **View Details** link to `/products/:id`; sold-out state.

#### [NEW] `FilterBar.jsx`
Pill toggles for water type and care level, search input with icon; state held in URL query params ✎.

#### [NEW] `Modal.jsx`
Reusable overlay: backdrop blur, close button, animated entrance, focus trap, `Esc`.

#### [NEW] `Toast.jsx`
Slide-in notifications; 4-second auto-dismiss; `aria-live`; exports `ToastProvider` and `useToast` ✎.

---

### Customer Pages

#### [NEW] `Home.jsx`
Radial gradient hero (`#E4D5F9 → #F9F6FE`), headline, subtitle, two CTAs, animated Betta tank card (CSS keyframes), trust strip with grayscale marks.

#### [NEW] `Catalog.jsx`
Header with title and search, `FilterBar`, responsive grid (`auto-fill`, min 280px), empty state with Clear filters.

#### [NEW] `ProductDetail.jsx`
Two-column layout (image left, info right): title, price, stock badge, care specs box (lavender surface), quantity selector, **Adopt / Order Now** (adds to cart, goes to checkout) and **Add to Cart** ➕; unknown-id state.

#### [NEW] `Checkout.jsx`
- Auth gate modal if not logged in and not guest: sign in, create account, or continue as guest.
- Customer details + delivery address + special notes, with validation.
- Order summary: items, subtotal, flat shipping, total.
- **Confirm & Place Order** → `placeOrder` → clear cart → `/order-success`.

#### [NEW] `OrderSuccess.jsx`
Centred card with animated checkmark, `Order #FC-YYYYMMDD-XXXX` with copy button, items and total, contact details, status banner, **Continue Shopping**.

#### [NEW] `Auth.jsx`
Tabbed Sign In / Create Account; password visibility toggle; **Continue as Guest**; returns to the previous page (`from`) on success.

#### [NEW] `Care.jsx`, `About.jsx`, `NotFound.jsx`  ➕
Static content and a 404 page.

---

### Admin Portal

#### [NEW] `AdminLayout.jsx`
- Route guard: non-admins are redirected to `/auth`.
- Deep-violet top bar: "Fishcommerce Admin", notification bell with pending count, avatar.
- Tabs: Product Management | Pending Orders | Order History.
- Shows a "New order received!" toast when an order arrives from another tab ✎.

#### [NEW] `AdminProducts.jsx`
Table: Image, Name, Price, Stock, Care Level, Status, Actions (Edit modal, availability switch, Delete with confirm). **+ Add New Fish** opens the form modal (all fields); **Publish Product** saves through `ProductContext`.

#### [NEW] `AdminOrders.jsx`
- `view="pending"` → Pending, Confirmed, Shipped. `view="history"` → Delivered ✎.
- Columns: Order ID, Customer Name, Phone & Email, Fish Ordered, Delivery Address, Date, Status, Actions.
- Contextual forward button: Mark as Confirmed → Shipped → Delivered; toast on change.

---

### App Shell and Routing

#### [NEW] `App.jsx`
Wraps providers (Toast → Auth → Product → Cart → Order) around `BrowserRouter`:

| Route | Component |
|---|---|
| `/` | Home |
| `/products` | Catalog |
| `/products/:id` | ProductDetail |
| `/checkout` | Checkout |
| `/order-success` | OrderSuccess |
| `/auth` | Auth |
| `/care`, `/about` ➕ | Care, About |
| `/admin` (guarded) | AdminLayout → redirects to `/admin/products` |
| `/admin/products` | AdminProducts |
| `/admin/orders` ✎ | AdminOrders (`view="pending"`) |
| `/admin/orders/history` ✎ | AdminOrders (`view="history"`) |
| `*` ➕ | NotFound |

#### [NEW] `main.jsx`
Mounts `<App />` into `#root`.

---

## User Review Required

> [!IMPORTANT]
> **No payment gateway.** Checkout bypasses payment and places the order directly, as specified.

> [!IMPORTANT]
> **Admin access.** Hard-coded admin login: `admin@fishcommerce.com` / `admin123`. Any other credentials create or log in a regular customer. This is demo-only and must not be used as real security.

> [!IMPORTANT]
> **No real backend.** All data lives in `localStorage`: per browser, and lost if storage is cleared. Seed data loads on first visit. The admin sees orders only from the same browser profile (including other tabs).

> [!WARNING]
> **Fish images.** Generate or source the product photos and use `public/images/fish/placeholder.svg` for any that are missing. Record image sources and licences in `public/images/CREDITS.md`. Live-animal images should look like the real fish being sold.

> [!NOTE]
> **Decisions needing your confirmation** (defaults chosen; change if you disagree): currency USD (Q1), out-of-stock products stay visible with a badge (Q2), Betta temperament shown as "Semi-Aggressive" (D-10).

---

## Verification Plan

**Automated tests:** none in v1 (keeps dependencies minimal). Utils are pure functions, so Vitest can be added later without refactoring.

**Browser flow testing** (full steps and expected results are `TC-01…TC-24` in `implementation_plan_full.md` §5):

1. Homepage renders: hero, CTAs, animated tank.
2. Catalog browsing: grid, filter pills, search.
3. Product detail: image, specs box, price, CTA.
4. Cart flow: badge updates, drawer works.
5. Auth gate at checkout: guest and login paths.
6. Order placement: form, redirect to success with reference.
7. Admin login.
8. Admin product CRUD, reflected in the customer catalog.
9. Admin order management: new order appears, status moves forward, Delivered goes to History.

**Manual verification (you):** visual match to the colour and type spec; mobile viewport (~375px); all navigation links.

---

## Changes From the Initial Draft

1. `category` and `waterType` merged into `waterType` (D-01).
2. Added `Pending` status and defined the forward-only flow (D-02).
3. Admin orders split into active and history routes (D-03).
4. Guest checkout defined (D-04).
5. Added `CartDrawer` since there was no way to view or edit the cart (D-05).
6. Added `Care`, `About` and `NotFound` pages, which the navbar already linked to (D-06).
7. Product images moved to `public/` for stable paths (D-07).
8. Stock is validated and decremented at order time (D-08).
9. Added `config.js` and `utils/` for money safety, storage safety and IDs (D-14).
10. `Toast.jsx` now owns its provider (D-11); the order has a display `reference` (D-12).
