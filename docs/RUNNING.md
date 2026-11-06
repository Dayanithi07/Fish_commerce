# Running Fishcommerce

How to set up, run, test, deploy and troubleshoot the project. Written for Windows (PowerShell) first, with macOS/Linux notes.

## 1. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | **20.19+ or 22.12+** (LTS recommended) | `node --version` |
| npm | Bundled with Node | `npm --version` |
| A modern browser | Chrome, Edge, Firefox or Safari (latest two versions) | — |
| Git (optional) | Any | `git --version` |

Install Node from https://nodejs.org (LTS). Odd-numbered Node releases such as 21 and 23 are not supported by current Vite.

## 2. First-time setup

### Option A: the setup script (recommended)

1. Put `setup_project.ps1` in your project folder, next to the `.md` documents (for example `D:\Project\Other projects\Ganesh\Fish_commerce`).
2. Open PowerShell **in that folder** (File Explorer → address bar → type `powershell` → Enter).
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # this window only; skip if scripts already run
.\setup_project.ps1
```

If Windows says the script is blocked because it was downloaded, run `Unblock-File .\setup_project.ps1` first.

The script checks Node, creates the folder structure and placeholder files, installs `react`, `react-dom`, `react-router-dom`, `vite` and `@vitejs/plugin-react`, then runs one build as a smoke test. It never overwrites existing files unless you pass `-Force`.

| Option | Effect |
|---|---|
| `-TargetDir <path>` | Scaffold somewhere other than the script's folder (docs are copied across) |
| `-SkipInstall` | Create files only; no `npm install` or build check |
| `-InitGit` | Run `git init` if the folder is not a repository |
| `-Force` | Overwrite existing generated files **including code already written in them** (asks you to type `YES`) |

It runs in Windows PowerShell 5.1 and PowerShell 7. On macOS/Linux install PowerShell (`pwsh`) and run `pwsh ./setup_project.ps1`, or use Option B.

### Option B: manual setup

```bash
mkdir Fish_commerce && cd Fish_commerce      # or use your existing folder
npm init -y
npm pkg set type=module scripts.dev=vite scripts.build="vite build" scripts.preview="vite preview"
npm install react react-dom react-router-dom
npm install --save-dev vite @vitejs/plugin-react
```

Then create `vite.config.js`, `index.html` and the `src/` structure from `SYSTEM_ARCHITECTURE.md` §4. Option A does all of this for you, so use B only if you cannot run PowerShell.

## 3. Everyday commands

For checkout, run the Express API in one PowerShell terminal with Razorpay test credentials:

```powershell
$env:RAZORPAY_KEY_ID = "rzp_test_your_key_id"
$env:RAZORPAY_KEY_SECRET = "your_razorpay_key_secret"
npm run server
```

Set these from the Razorpay Dashboard's test keys. Keep `RAZORPAY_KEY_SECRET` only in the backend environment; do not add a `VITE_` prefix or commit real credentials. In a second terminal, start the storefront:

```powershell
npm run dev        # http://localhost:5173 with hot reload
npm run build      # production build into dist/
npm run preview    # serve dist/ locally (http://localhost:4173)
```

Checkout is unavailable until the API and Razorpay credentials are configured. The bundled JSON-file API is for development only; before taking live payments, replace it with a durable database and payment reconciliation/webhooks, and deploy over HTTPS.

To test on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the "Network" URL it prints. Some features that need a secure context (for example copy-to-clipboard) may fall back to a simpler behaviour on plain-HTTP network URLs.

## 4. Using the app

| Role | How |
|---|---|
| Customer | Browse `/products`, add fish, check out (guest or account) |
| Admin | Go to `/auth`, sign in with `admin@fishcommerce.com` / `admin123`, then open `/admin` |

**Trying the live order notification:** open the site in two tabs. In tab 1 log in as admin and open **Pending Orders**. In tab 2 place an order as a guest. Tab 1 shows a toast and the bell count increases. This works because both tabs share the same browser storage.

## 5. Resetting data

All data lives in your browser's `localStorage` (keys starting `fc_`).

- **Quick reset:** open DevTools (F12) → Console → run `localStorage.clear(); sessionStorage.clear(); location.reload()`.
- **Selective:** DevTools → Application → Local Storage → delete only `fc_cart`, `fc_orders`, etc.
- The admin screen has a **Reset demo data** button once that optional feature (FR-DATA-05) is built.

After a reset the catalog returns to the 14 seed products, and carts, orders and accounts are empty.

## 6. Smoke test (5 minutes)

1. `/` loads, with the hero and swimming Betta.
2. `/products` shows 14 fish. Filter Freshwater + Beginner, then search "bet".
3. Open Crown Tail Betta → **Add to Cart**, then add Neon Tetra × 3. The cart badge shows 4.
4. Open the cart → **Checkout** → choose **Continue as guest** → fill the form → **Pay Online**. Complete a successful Razorpay test payment; the order should be created only after the server verifies payment. The total should be **₹42.95**.
5. Log in as admin → `/admin/orders` → the order appears → **Mark as Confirmed → Shipped → Delivered**. It then moves to **Order History**.
6. `/admin/products` → add a fish → it shows in `/products`.

The full list of 24 test cases is in `implementation_plan_full.md` §5.

## 7. Deploying

`npm run build` produces static files in `dist/`. Any static host works. Because the app uses client-side routing, the host must **serve `index.html` for unknown paths**, or deep links like `/products/neon-tetra` will 404 on refresh.

| Host | Setup |
|---|---|
| **Netlify** | Publish directory `dist`. The `public/_redirects` file created by the script handles routing |
| **Vercel** | Add `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| **GitHub Pages** | Set `base: '/<repo-name>/'` in `vite.config.js`, build, copy `dist/index.html` to `dist/404.html`, publish `dist/` |

> **Reminder:** the admin credentials are in the client code. Deploy only as a demo or portfolio piece.

## 8. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `running scripts is disabled on this system` | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in the same window, then retry |
| `The script is blocked` / security warning | `Unblock-File .\setup_project.ps1` |
| Script says Node is unsupported | Install Node 20.19+ or 22.12+ (LTS). Restart the terminal after installing |
| `npm : File ...npm.ps1 cannot be loaded` | Use `npm.cmd` (the script already does), or set the execution policy as above |
| `npm install` fails with network errors | Check your connection or proxy (`npm config get proxy`). Retry with `npm install` |
| `Port 5173 is already in use` | Stop the other dev server, or run `npm run dev -- --port 5174` |
| Blank white page | Open DevTools → Console for the error. A stale or corrupt `fc_*` key can cause it, so run the Quick reset from §5 |
| Changes to `index.html` or `vite.config.js` not applied | Stop and restart `npm run dev` |
| Fonts look wrong | Google Fonts is blocked or offline. The system-font fallback is used; functionality is unaffected |
| 404 on refresh in production | The host lacks the SPA fallback. See §7 |
| Product images missing | Files must be in `public/images/fish/` and named after the product `id` (e.g. `neon-tetra.png`). Missing images show the placeholder |
| Admin sees no orders | Orders are per browser profile. Use the same browser (not Incognito, which has separate storage) |
| Data disappeared | Site data was cleared, or you used a private window. This is expected for `localStorage` |
| `-Force` overwrote my work | `-Force` replaces generated files. Restore from git (`git checkout -- .`) if you committed first, which is why committing before re-running is recommended |

## 9. Working with the build agents

1. Run the script (Wave 0 done).
2. Commit: `git init` (or run the script with `-InitGit`), `git add -A`, `git commit -m "Scaffold"`.
3. Start Wave 1 agents (A2, A3, A7), each in its own session or branch, using the prompts in `AGENT_SPECIFICATIONS.md` §6.
4. Merge and check Gate G2 (§9 of that document), then start Wave 2 (A4, A5, A6), and so on.

Each stub file begins with a comment naming its owning agent, so it is always clear who edits what.
