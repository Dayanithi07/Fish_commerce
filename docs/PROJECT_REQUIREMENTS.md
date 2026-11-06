# Fishcommerce — Project Requirements

**Version:** 1.0 · **Status:** Ready for build · **Last updated:** November 2026

This single document combines the product requirements (PRD), functional requirements (FRD) and UX/UI specification. Requirement IDs (`FR-…`) are referenced by `AGENT_SPECIFICATIONS.md` and `implementation_plan_full.md`.

---

## 1. Product Overview

**Fishcommerce** is an e-commerce web app for selling pet fish. It has a customer storefront (browse → detail → cart → checkout → confirmation), an Express API for online checkout, and an admin portal (product CRUD and order status management). Checkout requires a successful Razorpay online payment; cash on delivery is not offered.

### 1.1 Goals

| # | Goal |
|---|---|
| G1 | Let a visitor find a fish, understand its care needs, and place an order in under two minutes. |
| G2 | Let an admin manage the catalog and move orders through fulfilment without touching code. |
| G3 | Look premium and consistent (lavender/violet design system, Plus Jakarta Sans) on desktop, tablet and mobile. |
| G4 | Be buildable by several parallel agents with minimal merge conflicts (see `AGENT_SPECIFICATIONS.md`). |

### 1.2 Non-goals (v1)

Refund workflows, real authentication/security, email/SMS delivery, a production database, multi-vendor support, reviews/ratings, inventory restock workflows, internationalisation.

### 1.3 Personas

| Persona | Description | Key needs |
|---|---|---|
| **Guest shopper** | First-time visitor, may be a beginner hobbyist | Clear care info, fast checkout without an account |
| **Registered customer** | Returning buyer with a local account | Prefilled checkout details |
| **Admin (store owner)** | One person running the store | Add or edit fish, see new orders immediately, move orders to delivered |

### 1.4 Success criteria

1. A new visitor can complete the full purchase flow (catalog → order success) with no console errors.
2. An admin adds a product and it appears in the customer catalog immediately.
3. An order placed in one tab shows up in an open admin tab within about 1 second, with a toast and an updated bell count.
4. All 9 verification flows in `implementation_plan_full.md` §5 pass.
5. WCAG 2.1 AA contrast and keyboard operability on every page.

---

## 2. Decisions Log

The three source documents (implementation plan, task list, mockup prompts) disagreed or were silent in several places. These decisions resolve them and **override the earlier drafts**.

| ID | Topic | Gap or conflict in the drafts | Decision |
|---|---|---|---|
| D-01 | Water type field | Plan lists both `category` and `waterType` for a product | One field, `waterType` (`Freshwater` / `Saltwater`). The catalog "Category" filter maps to it. |
| D-02 | Order statuses | Plan says Confirmed/Shipped/Delivered; mockup also shows Pending | Four statuses: `Pending → Confirmed → Shipped → Delivered`. New orders start as `Pending`. |
| D-03 | Admin order tabs | Plan has one `/admin/orders` route with a sub-filter; mockup shows Pending Orders containing Confirmed/Shipped rows | `/admin/orders` = **active** orders (Pending, Confirmed, Shipped). `/admin/orders/history` = **Delivered**. Both render `AdminOrders` with a `view` prop. |
| D-04 | Guest checkout | "Guest" is mentioned but not defined | Guest = `user === null`. Customer details come from the checkout form. The choice is remembered in `sessionStorage` (`fc_guest_checkout`). |
| D-05 | Cart UI | Navbar has a cart icon but no cart page exists | Add a **CartDrawer** slide-over (qty stepper, remove, subtotal, Checkout button). No `/cart` route. |
| D-06 | Navbar links | "Care Basics" and "About Us" have no pages | Add static pages `/care` and `/about`, plus a `NotFound` page for unknown routes. |
| D-07 | Product images | Plan puts images in `src/assets`, but Vite hashes those paths and stored URLs would go stale after a rebuild | Seed images live in `public/images/fish/` and use stable paths like `/images/fish/betta.png`. |
| D-08 | Stock handling | Not specified | Stock is validated at checkout and **decremented when an order is placed**. Restock on cancellation is out of scope. |
| D-09 | Currency | Mockups use `$` but sample phone is `+91…` | Currency is a config constant (`USD`, `en-US`). Phone validation is format-agnostic (7–15 digits). |
| D-10 | Betta temperament | Mockup says "Peaceful"; bettas are territorial | Seed data uses `Semi-Aggressive` for accuracy. Change it if you prefer mockup parity. |
| D-11 | Toast state | `Toast.jsx` is listed with no provider | `Toast.jsx` exports `ToastProvider` and `useToast`. It is the outermost provider. |
| D-12 | Order identifiers | Plan says UUID, mockups show `FC-20261102-A7K3` and `FC-2026-A7K3` | Each order has an internal `id` (UUID) and a display `reference` of the form `FC-YYYYMMDD-XXXX`. |
| D-13 | Filter state | Not specified | Catalog filters and search are kept in URL query params (`?type=&care=&q=`). |
| D-14 | Money | Plain floating-point maths can drift (`0.1 + 0.2 = 0.30000000000000004`), which is unacceptable for totals | Prices are stored as numbers in major units. All arithmetic goes through the cents-safe helpers in `utils/money.js`. |
| D-15 | Pending badge | "Pending count" is ambiguous | Bell badge = number of orders with status exactly `Pending` (needs admin action). |

---

## 3. Functional Requirements

**Priority:** **M** = Must (v1 is incomplete without it) · **S** = Should (build unless time-boxed out) · **C** = Could (nice to have)

### 3.1 Global shell — `GEN`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-GEN-01 | Sticky navbar: logo (left), Home / Catalog / Care Basics / About Us (center), cart icon with count badge and auth control (right) | M | Navbar stays visible on scroll; badge hidden when count is 0; active link is visually marked |
| FR-GEN-02 | Below 768px the links collapse into a hamburger menu | M | Menu opens and closes by tap and `Esc`; closes on navigation; `aria-expanded` is correct |
| FR-GEN-03 | Footer with three columns (brand, quick links, contact) and a lavender gradient top accent | M | Appears on all storefront pages, not on admin pages |
| FR-GEN-04 | Toast notifications that auto-dismiss after 4 s and can be dismissed manually | M | Container uses `aria-live="polite"`; several toasts stack; hover pauses dismissal (S) |
| FR-GEN-05 | Unknown URL shows a NotFound page with a link home | S | `/nope` renders NotFound, not a blank page |
| FR-GEN-06 | Scroll to top on route change | S | Navigating from the bottom of Catalog to a product opens at the top |
| FR-GEN-07 | "Skip to main content" link as the first focusable element | S | Visible on focus, jumps to `#main-content` |

### 3.2 Home — `HOME`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-HOME-01 | Hero with headline, subtitle and two CTAs: **Explore Catalog** → `/products`, **Learn Care Basics** → `/care` | M | Copy matches the mockup; buttons use `.btn-primary` / `.btn-secondary` |
| FR-HOME-02 | Animated Betta tank preview card (CSS keyframes) | M | Fish swims continuously; animation is disabled under `prefers-reduced-motion` |
| FR-HOME-03 | Trust strip with five grayscale partner marks | S | Decorative (`aria-hidden`) or labelled; scrolls horizontally on mobile |
| FR-HOME-04 | Radial gradient background `#E4D5F9 → #F9F6FE` | M | Matches mockup |

### 3.3 Catalog — `CAT`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-CAT-01 | Responsive grid of **available** products (`isAvailable === true`) | M | `repeat(auto-fill, minmax(280px, 1fr))` on desktop; 2 columns at 390px |
| FR-CAT-02 | Filter by water type (All / Freshwater / Saltwater) and care level (All / Beginner / Intermediate / Expert), combined with AND | M | Selecting Freshwater and Beginner shows only products matching both |
| FR-CAT-03 | Search by name or description, case-insensitive, substring | M | "bet" finds Betta; clearing restores the list |
| FR-CAT-04 | Empty state with a "Clear filters" button | M | Shown when nothing matches; button resets all filters |
| FR-CAT-05 | Filters and search are stored in URL query params (D-13) | S | Reload and the back button preserve the view |
| FR-CAT-06 | Product card: image, name, price (accent colour), badges (care level, temperament, water type), View Details | M | Whole card links to `/products/:id`; sold-out products show an "Out of stock" badge |
| FR-CAT-07 | Announce result count to screen readers | C | "8 fish found" in an `aria-live` region |

### 3.4 Product detail — `PDP`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-PDP-01 | Two-column layout (image 55% / info 45%) that stacks below 900px | M | Matches mockup 3 |
| FR-PDP-02 | Care specs box: water type, temperament, care level, min tank size, diet | M | All five specs shown with label and value on a lavender surface |
| FR-PDP-03 | Stock badge: **In Stock**, **Only N left** (stock ≤ 5), **Out of Stock** | M | Badge colours follow the status tokens |
| FR-PDP-04 | Quantity selector from 1 to the available stock | M | Cannot exceed stock; defaults to 1 |
| FR-PDP-05 | **Adopt / Order Now** adds the selected quantity to the cart and navigates to `/checkout` | M | Disabled with a clear label when out of stock |
| FR-PDP-06 | Secondary **Add to Cart** button adds and opens the CartDrawer without leaving the page | S | Toast "Added to cart"; badge count updates |
| FR-PDP-07 | Optional `gallery[]` thumbnails (shown only if more than one image) | C | First thumbnail highlighted; click swaps the main image |
| FR-PDP-08 | Unknown or unavailable product ID shows a friendly "no longer available" state | M | Link back to Catalog; no crash |

### 3.5 Cart — `CART`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-CART-01 | CartDrawer opens from the navbar cart icon and lists lines: thumbnail, name, qty stepper, line total, remove | M | Drawer slides in from the right; backdrop click closes it |
| FR-CART-02 | Quantity is clamped to 1..stock; reducing to 0 removes the line | M | Cannot exceed stock; remove works |
| FR-CART-03 | Subtotal shown; **Checkout** button disabled when the cart is empty; empty state message | M | Checkout navigates to `/checkout` and closes the drawer |
| FR-CART-04 | Cart persists across reloads | M | Reload keeps all lines |
| FR-CART-05 | On load, reconcile the cart with current products: drop deleted or unavailable lines, clamp quantities to stock, toast what changed | S | Admin deletes a product → customer's cart no longer contains it |
| FR-CART-06 | Drawer is accessible: focus moves in on open and returns on close, focus is trapped, `Esc` closes, `role="dialog"` with `aria-modal` | M | Keyboard-only flow works |

### 3.6 Authentication — `AUTH`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-AUTH-01 | Sign up with name, email, password (min 8 chars). Email must be unique, case-insensitive | M | Duplicate email shows an inline error; success logs the user in |
| FR-AUTH-02 | Log in with email and password. Failure shows a generic "Invalid email or password" | M | Does not reveal whether the email exists |
| FR-AUTH-03 | `admin@fishcommerce.com` / `admin123` logs in with role `admin`; any other valid account is role `customer` | M | Admin sees the Admin Dashboard link in the user menu |
| FR-AUTH-04 | **Continue as Guest** proceeds without an account (D-04) | M | Guest can complete checkout |
| FR-AUTH-05 | Session persists across reloads; Logout clears it. Navbar shows the user's name with a dropdown (Admin Dashboard if admin, Logout) | M | Reload keeps the user logged in |
| FR-AUTH-06 | After auth, return to the page the user came from (`location.state.from`). Admins with no `from` go to `/admin` | S | Checkout → login → back at checkout with the cart intact |
| FR-AUTH-07 | Password visibility toggle | S | Eye icon toggles input type; has an `aria-label` |
| FR-AUTH-08 | Inline validation with `aria-describedby` error text | M | Errors are announced and associated with their field |

### 3.7 Checkout — `CHK`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-CHK-01 | Empty cart at `/checkout` redirects to `/products` with a toast | M | No blank form is shown |
| FR-CHK-02 | Auth gate: if not logged in and not guest, show a modal with Sign in / Create account / Continue as guest | M | Dismissing without choosing keeps the form disabled |
| FR-CHK-03 | Form: Full name, Phone, Email, Street, City, Postal code, Tank setup / delivery notes (optional). Prefill name and email for logged-in users | M | Rules in §6 enforced; first invalid field is focused on submit |
| FR-CHK-04 | Order summary: lines with thumbnails, subtotal, flat shipping, total | M | Totals use `utils/money.js`; matches mockup 4 ($24.99 + 3 × $3.99 + $5.99 = $42.95) |
| FR-CHK-05 | **Pay Online** re-validates stock, opens Razorpay checkout, and only after server-side payment verification creates the order, decrements stock, clears the cart and navigates to `/order-success` | M | Failed or cancelled payments do not create an order |
| FR-CHK-06 | Clearly state that online payment via Razorpay is required and cash on delivery is unavailable | S | Payment policy is visible before checkout |
| FR-CHK-07 | Prevent double submit | M | Button disabled while submitting; one click creates exactly one order |

### 3.8 Order confirmation — `ORD`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-ORD-01 | Show animated checkmark, "Order Confirmed!", reference number, items, total, contact details, status banner, Continue Shopping link | M | Matches mockup 5 |
| FR-ORD-02 | Copy-reference button with toast (with a non-clipboard fallback) | S | Works over `http://localhost` and degrades gracefully elsewhere |
| FR-ORD-03 | Visiting `/order-success` with no recent order redirects to `/products` | M | Reload right after ordering still works (uses sessionStorage fallback) |

### 3.9 Admin shell — `ADM`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-ADM-01 | `/admin/*` is guarded: non-admins are redirected to `/auth` with `from` set | M | Customer and guest cannot see admin UI |
| FR-ADM-02 | Top bar: "Fishcommerce Admin", notification bell with pending count, avatar. Tabs: Product Management, Pending Orders, Order History | M | Active tab marked; `/admin` redirects to `/admin/products` |
| FR-ADM-03 | When a new order appears (including one placed in another tab), show a toast "New order received!" and update the bell | M | Verified with two browser tabs |
| FR-ADM-04 | Links to view the storefront and to log out | S | Present in the top bar |

### 3.10 Admin products — `AP`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-AP-01 | Table: Image, Name, Price, Stock, Care Level, Status, Actions | M | Care badges: Beginner green, Intermediate amber, Expert red |
| FR-AP-02 | **+ Add New Fish** opens a modal form (name, price, image URL, water type, temperament, care level, min tank size, diet, stock, description); **Publish Product** saves | M | Validation per §6; new product appears in the table and the Catalog |
| FR-AP-03 | **Edit** opens the same modal prefilled; changes persist | M | Edits reflect on the storefront immediately |
| FR-AP-04 | Availability toggle (`role="switch"`) | M | Unavailable products disappear from the Catalog |
| FR-AP-05 | **Delete** asks for confirmation, then removes the product. Existing orders are unaffected because they hold snapshots | M | Confirm dialog names the product |
| FR-AP-06 | Image URL field validates `http(s)://` or `/path`; shows a preview; broken images fall back to a placeholder | S | Placeholder renders on 404 |
| FR-AP-07 | Table search and sort by name, price or stock | C | |

### 3.11 Admin orders — `AO`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-AO-01 | Pending Orders tab lists orders with status Pending, Confirmed or Shipped, newest first (D-03) | M | Count shown in the header |
| FR-AO-02 | Order History tab lists Delivered orders | M | |
| FR-AO-03 | Columns: Order ID (reference), Customer Name, Phone & Email, Fish Ordered, Delivery Address, Date, Status, Actions | M | Matches mockup 8 |
| FR-AO-04 | One contextual action per row moving the order forward: Mark as Confirmed → Shipped → Delivered. Each change appends a timestamp to `statusHistory` and shows a toast | M | Status pill colours: Pending amber, Confirmed blue, Shipped purple, Delivered green |
| FR-AO-05 | Transitions are forward-only; cancellation and reversal are out of scope for v1 | M | No backwards control is rendered |
| FR-AO-06 | Row expansion or modal shows customer notes and the full status history | S | Notes are readable |
| FR-AO-07 | Filter active orders by status | C | |

### 3.12 Data layer — `DATA`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-DATA-01 | Seed 12–15 products on first load (see `DATABASE_SCHEMA.md` §7) | M | Fresh profile shows the full catalog |
| FR-DATA-02 | Every mutation persists to `localStorage` | M | State survives reload |
| FR-DATA-03 | Corrupt JSON or unavailable storage falls back to defaults (in-memory) and shows a one-time warning banner | S | App never white-screens |
| FR-DATA-04 | Schema version key with a migration hook | S | Version bump runs migrations |
| FR-DATA-05 | Admin "Reset demo data" action | C | Restores seed products, clears orders |

### 3.13 Static content — `CNT`

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| FR-CNT-01 | `/care`: care basics (water types, cycling, acclimation, feeding, tank sizing) | S | Linked from the hero and navbar |
| FR-CNT-02 | `/about`: store story and contact details | S | Linked from navbar and footer |

---

## 4. Business Rules

| ID | Rule |
|---|---|
| BR-01 | Shipping is a flat **$5.99** per order (config constant). |
| BR-02 | Order total = subtotal + shipping. |
| BR-03 | A product is purchasable only if `isAvailable === true` and `stock > 0`. |
| BR-04 | Placing an order fails if any line exceeds current stock; nothing is written in that case. |
| BR-05 | An order stores a **snapshot** of each line (name, price, image), so later product edits or deletions do not change past orders. |
| BR-06 | Status order is `Pending → Confirmed → Shipped → Delivered`, forward only. |
| BR-07 | Admin credentials are hard-coded for this demo. Anyone else who signs up is a `customer`. |
| BR-08 | Order reference format: `FC-YYYYMMDD-XXXX`. `XXXX` uses the alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no look-alike characters). |

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Browsers** | Latest two versions of Chrome, Edge, Firefox, Safari (desktop and mobile) |
| **Responsive** | Breakpoints: mobile ≤ 599px, tablet 600–1023px, desktop ≥ 1024px. No horizontal scroll at 375px, except the filter pills and trust strip, which scroll intentionally |
| **Performance** | Lighthouse performance ≥ 90 on desktop. Initial JS ≤ 250 KB gzipped (admin is lazy-loaded). Product images use `loading="lazy"` plus explicit `width`/`height`, and are ≤ 150 KB each |
| **Accessibility** | WCAG 2.1 AA: text contrast ≥ 4.5:1, visible focus rings, full keyboard operation, semantic landmarks, labelled form controls, `prefers-reduced-motion` honoured |
| **Reliability** | No uncaught exceptions on corrupt storage or an unknown route. All storage access goes through `utils/storage.js` with try/catch |
| **Maintainability** | One CSS file per component, tokens only via CSS variables, no inline colour literals. Contexts expose only the contract in `SYSTEM_ARCHITECTURE.md` §6 |
| **Security (demo scope)** | Admin credentials and plaintext passwords exist client-side only because there is no backend. **Do not deploy publicly as a real store.** See `SYSTEM_ARCHITECTURE.md` §12 |
| **Privacy** | Data never leaves the browser. No analytics or third-party scripts except Google Fonts |
| **Dependencies** | Runtime: `react`, `react-dom`, `react-router-dom`. Dev: `vite`, `@vitejs/plugin-react`. Adding any other package needs Orchestrator approval |

---

## 6. Validation Rules

| Field | Rule | Error message |
|---|---|---|
| Name (person) | 2–60 chars, trimmed | "Please enter your full name." |
| Email | Pattern `^[^\s@]+@[^\s@]+\.[^\s@]+$`, ≤ 120 chars, lower-cased on save | "Enter a valid email address." |
| Password | ≥ 8 chars | "Use at least 8 characters." |
| Phone | After removing spaces, dashes, parentheses and a leading `+`: 7–15 digits | "Enter a valid phone number." |
| Street | 5–120 chars | "Enter your street address." |
| City | 2–60 chars | "Enter your city." |
| Postal code | 3–10 alphanumeric chars (spaces and dashes allowed) | "Enter a valid postal code." |
| Notes | Optional, ≤ 500 chars | "Notes must be 500 characters or fewer." |
| Product name | 2–60 chars, unique case-insensitive | "Name is required / already exists." |
| Price | Number > 0 and ≤ 99,999, up to 2 decimals | "Enter a valid price." |
| Stock | Integer 0–9,999 | "Stock must be a whole number." |
| Min tank size | Integer 1–1,000 (gallons) | "Enter tank size in gallons." |
| Image URL | `http(s)://…` or a path starting with `/` | "Enter a valid image URL." |
| Description | 10–600 chars | "Add a short description." |

---

## 7. UX / UI Specification

Pixel-level mockup prompts for each screen were supplied in the original `ui_mockup_prompts` file. This section is the implementation-facing summary.

### 7.1 Design tokens (`src/index.css` → `:root`)

| Token | Value | Use |
|---|---|---|
| `--bg-page` | `#F9F6FE` | Page background |
| `--bg-surface` | `#FFFFFF` | Cards, navbar, tables |
| `--bg-lavender` | `#E4D5F9` | Hero gradient, spec boxes, banners, badge backgrounds |
| `--text-primary` | `#3C1E5E` | Headings, logo, names (deep violet) |
| `--text-muted` | `#6B6578` | Body and secondary text |
| `--accent` | `#6F3FF5` | Primary buttons, prices, links, focus ring |
| `--accent-dark` | `#5B30D6` | Text on lavender backgrounds (badges); about 5.3:1 on `#E4D5F9` |
| `--border` | `#EFEAEF` | Card and input borders |
| `--success` / `--success-bg` | `#1F9D6B` / `#E3F6EE` | In stock, Delivered, Beginner |
| `--warning` / `--warning-bg` | `#B7791F` / `#FEF3D7` | Pending, Intermediate |
| `--danger` / `--danger-bg` | `#D14343` / `#FDE8E8` | Delete, Expert, errors |
| `--info` / `--info-bg` | `#2F6FDE` / `#E3EDFD` | Confirmed |
| `--admin-bar` | `#3C1E5E` | Admin top bar |
| `--radius-sm / md / lg / xl` | `8px / 12px / 16px / 20px` | Inputs / buttons / cards / hero cards |
| `--shadow-card` | `0 4px 20px rgba(111, 63, 245, 0.08)` | Soft purple-tinted shadow |
| `--shadow-hover` | `0 10px 30px rgba(111, 63, 245, 0.16)` | Card hover |

Contrast notes: `--accent` on white ≈ 5.7:1 and `--text-muted` on `--bg-page` ≈ 5.2:1, both pass AA. The mockups put `--accent` text on `--bg-lavender` for badges (≈ 4.0:1, a fail), so badges use `--accent-dark` instead. The QA agent must verify every pairing with a contrast checker.

### 7.2 Typography

**Plus Jakarta Sans** (Google Fonts, weights 400/500/600/700/800) with a system-font fallback stack.

| Role | Size / weight |
|---|---|
| Hero H1 | 48px / 700 (28px on mobile) |
| Page title | 32px / 700 |
| Product title (detail) | 36px / 700 |
| Section header | 20px / 700 |
| Body | 16px / 400 |
| Hero subtitle | 18px / 400 (14px on mobile) |
| Small / badge | 12–14px / 600 |

### 7.3 Components

| Component | Spec |
|---|---|
| `.btn-primary` | Accent background, white text, radius 12px, subtle shadow, hover darkens |
| `.btn-secondary` | White background, `--border` border, `--text-primary` text |
| `.btn-outline` | Transparent, accent border and text |
| `.btn-danger-outline` | Transparent, danger border and text |
| Pill / badge | Radius 999px, 12px/600 text, lavender background with `--accent-dark` text (status variants use the status tokens) |
| Card | White, 1px `--border`, radius 16px, `--shadow-card`; product cards lift 2px on hover |
| Input | White, 1px `--border`, radius 12px, 44px minimum height; focus = accent border plus 3px accent ring at 20% opacity |
| Modal | Backdrop blur with 40% dark overlay, radius 16px, enters with fade and scale in 200ms, focus trapped |
| Switch | 40×22px track; green when on, gray when off; `role="switch"`, `aria-checked` |
| Table | Alternating subtle row backgrounds, sticky header, horizontal scroll container on small screens |
| Toast | Top-right, lavender card with 4px accent left border, slides in |

### 7.4 Page inventory

| Route | Page | Layout | Mockup |
|---|---|---|---|
| `/` | Home | Site | 1, 9 |
| `/products` | Catalog | Site | 2, 10 |
| `/products/:id` | Product Detail | Site | 3 |
| `/checkout` | Checkout | Site | 4 |
| `/order-success` | Order Success | Site | 5 |
| `/auth` | Login / Sign Up | Site | 6 |
| `/care`, `/about` | Static content | Site | — |
| `*` | Not Found | Site | — |
| `/admin/products` | Product Management | Admin | 7 |
| `/admin/orders` | Pending Orders | Admin | 8 |
| `/admin/orders/history` | Order History | Admin | 8 (same layout) |

### 7.5 Key layouts

- **Catalog grid:** 4 columns at ≥ 1200px, 3 at ≥ 900px, 2 at ≥ 600px and on mobile.
- **Detail:** 55/45 split, stacked below 900px. The CTA is full width.
- **Checkout:** 60/40 split (form / summary), stacked below 900px with the summary above the form.
- **Admin tables:** wrapped in `overflow-x: auto` containers. Below 768px the Fish Ordered and Delivery Address columns stay readable by wrapping text.
- **Mobile nav:** hamburger plus cart icon with badge. The filter bar scrolls horizontally with edge fade.

### 7.6 Interaction and motion

| Element | Behaviour |
|---|---|
| Product card hover | Translate −2px plus `--shadow-hover`, 200ms ease |
| Buttons | 150ms colour transition; pressed state scales to 0.98 |
| Betta tank | 8–12s looping CSS swim path; bubbles rise |
| Order success check | Stroke-draw animation, about 600ms |
| Toast | Slide in from the right, 250ms |
| Reduced motion | All of the above collapse to instant or static via `@media (prefers-reduced-motion: reduce)` |

---

## 8. Open Questions

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Currency and locale (USD vs INR)? | INR / `en-IN` (current configuration). |
| Q2 | Should out-of-stock products stay visible in the Catalog? | Yes, with a badge and a disabled CTA. |
| Q3 | Should the real store name or logo replace the text logo? | Text logo "Fishcommerce". |
| Q4 | Is order cancellation needed soon? | Deferred (roadmap). |

---

## 9. Roadmap (post-v1)

1. Production database and real authentication.
2. Email and WhatsApp order notifications.
3. Order cancellation, restock and refunds; customer order history page.
5. Reviews, wishlist, bundles ("starter tank kit").
6. Image upload (object storage) in the admin portal.
7. Automated tests (Vitest and Playwright).
