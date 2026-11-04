<#
.SYNOPSIS
    Scaffolds the Fishcommerce project (Vite + React + React Router).

.DESCRIPTION
    Agent A1 (Scaffold and Routing) as a script. It:
      1. Checks Node.js / npm.
      2. Creates the folder structure from SYSTEM_ARCHITECTURE.md section 4.
      3. Writes config files (package.json, vite.config.js, index.html, .gitignore, _redirects).
      4. Writes working shared modules: config.js, utils/storage.js, utils/money.js, utils/id.js,
         plus App.jsx (providers + routes) and a base index.css with the design tokens.
      5. Writes stub files for every page, component and context, each tagged with its owning agent.
      6. Installs dependencies: react, react-dom, react-router-dom (runtime); vite and
         @vitejs/plugin-react (dev). Versions are resolved by npm at install time.
      7. Runs `npm run build` once as a smoke test (Gate G1).

    Existing files are never overwritten unless -Force is given.

.PARAMETER TargetDir
    Folder to scaffold into. Defaults to the folder that contains this script, so put the script
    next to the *.md documents and run it there.

.PARAMETER SkipInstall
    Create files only; do not run npm install or the build check.

.PARAMETER Force
    Overwrite existing generated files (asks for confirmation). This also overwrites any code
    that agents have already written into those files.

.PARAMETER InitGit
    Run `git init` if the folder is not already a git repository.

.EXAMPLE
    .\setup_project.ps1

.EXAMPLE
    .\setup_project.ps1 -TargetDir D:\Project\Fish_commerce -InitGit

.NOTES
    If scripts are blocked on your machine, run once in the same window:
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
    Requires Node.js 20.19+ or 22.12+ (LTS) and npm.
    This file is intentionally ASCII-only so Windows PowerShell 5.1 reads it correctly.
#>
[CmdletBinding()]
param(
    [string]$TargetDir,
    [switch]$SkipInstall,
    [switch]$Force,
    [switch]$InitGit
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
function Write-Step([string]$Message) { Write-Host ''; Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message)   { Write-Host "    [ok]   $Message" -ForegroundColor Green }
function Write-Skip([string]$Message) { Write-Host "    [skip] $Message" -ForegroundColor DarkYellow }
function Write-Note([string]$Message) { Write-Host "    [warn] $Message" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# Resolve target folder
# ---------------------------------------------------------------------------
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
if ([string]::IsNullOrWhiteSpace($TargetDir)) { $TargetDir = $scriptDir }
if (-not (Test-Path -LiteralPath $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}
$Root = (Resolve-Path -LiteralPath $TargetDir).ProviderPath
$ScriptDirFull = (Resolve-Path -LiteralPath $scriptDir).ProviderPath

Write-Host ''
Write-Host 'Fishcommerce project setup' -ForegroundColor Magenta
Write-Host "Target folder: $Root"

if ($Force) {
    Write-Note 'Force is set: existing generated files (including code already written in them) will be overwritten.'
    $answer = Read-Host 'Type YES (capitals) to continue'
    if ($answer -cne 'YES') { Write-Host 'Cancelled. Nothing was changed.'; return }
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
Write-Step 'Checking prerequisites'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js was not found. Install the current LTS from https://nodejs.org and run this script again.'
}
$nodeRaw = (& node --version).Trim()
$nodeVer = [version]($nodeRaw.TrimStart('v'))
$nodeOk = (($nodeVer -ge [version]'20.19.0') -and ($nodeVer.Major -lt 21)) -or ($nodeVer -ge [version]'22.12.0')
if (-not $nodeOk) {
    throw "Node $nodeRaw is not supported by current Vite. Install Node 20.19+ or 22.12+ (LTS)."
}
Write-Ok "Node $nodeRaw"

# On Windows use npm.cmd so PowerShell execution policy does not block npm.ps1.
$npmName = if ($env:OS -eq 'Windows_NT') { 'npm.cmd' } else { 'npm' }
if (-not (Get-Command $npmName -ErrorAction SilentlyContinue)) {
    throw 'npm was not found on PATH. Reinstall Node.js (npm is bundled with it).'
}
Write-Ok ("npm " + (& $npmName --version).Trim())

# ---------------------------------------------------------------------------
# File-writing helpers (UTF-8 without BOM, LF line endings, never overwrite by default)
# ---------------------------------------------------------------------------
$script:Created = 0
$script:Skipped = 0
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-ProjectFile {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
    )
    $full = Join-Path $Root $RelativePath
    if ((Test-Path -LiteralPath $full) -and -not $Force) {
        $script:Skipped++
        Write-Skip "$RelativePath (already exists)"
        return
    }
    $dir = Split-Path -Parent $full
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $text = ($Content -replace "`r`n", "`n").Trim([char]10) + "`n"
    [System.IO.File]::WriteAllText($full, $text, $Utf8NoBom)
    $script:Created++
    Write-Ok $RelativePath
}

function Expand-Template {
    param([string]$Template, [hashtable]$Tokens)
    $out = $Template
    foreach ($key in $Tokens.Keys) {
        $out = $out.Replace("__${key}__", [string]$Tokens[$key])
    }
    return $out
}

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
$PackageJson = @'
{
  "name": "__NAME__",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
'@

$ViteConfig = @'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// If you deploy under a sub-path (e.g. GitHub Pages), set: base: '/your-repo-name/'
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
'@

$IndexHtml = @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Fishcommerce - healthy, hand-raised pet fish delivered with expert care support." />
    <meta name="theme-color" content="#3C1E5E" />
    <link rel="icon" href="data:," />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>Fishcommerce | Premium Pet Fish</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

$GitIgnore = @'
node_modules
dist
dist-ssr
*.local
.env
.env.*
npm-debug.log*
.DS_Store
Thumbs.db
.idea
.vscode/*
!.vscode/extensions.json
'@

$Redirects = @'
/*    /index.html   200
'@

$MainJsx = @'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initStorage } from './utils/storage.js'

// Must run before any context reads from localStorage.
initStorage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
'@

$AppJsx = @'
import { Component, Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'

import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProductProvider } from './context/ProductContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { OrderProvider } from './context/OrderContext.jsx'

import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'

import Home from './pages/Home.jsx'
import Catalog from './pages/Catalog.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderSuccess from './pages/OrderSuccess.jsx'
import Auth from './pages/Auth.jsx'
import Care from './pages/Care.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

// Admin code is lazy-loaded so customers never download it.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-panel" role="alert">
          <h1>Something went wrong</h1>
          <p>Please reload the page. Your cart and orders are safe in this browser.</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}

export default function App() {
  // Provider order matters: Toast < Auth < Product < Cart < Order (see SYSTEM_ARCHITECTURE.md section 6).
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProductProvider>
            <CartProvider>
              <OrderProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Suspense fallback={<p className="route-loading">Loading...</p>}>
                    <Routes>
                      <Route element={<SiteLayout />}>
                        <Route index element={<Home />} />
                        <Route path="products" element={<Catalog />} />
                        <Route path="products/:id" element={<ProductDetail />} />
                        <Route path="checkout" element={<Checkout />} />
                        <Route path="order-success" element={<OrderSuccess />} />
                        <Route path="auth" element={<Auth />} />
                        <Route path="care" element={<Care />} />
                        <Route path="about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>

                      {/* AdminLayout owns the route guard (agent A6). */}
                      <Route path="admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="products" replace />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders view="pending" />} />
                        <Route path="orders/history" element={<AdminOrders view="history" />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </OrderProvider>
            </CartProvider>
          </ProductProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}
'@

$IndexCss = @'
/*
  Fishcommerce global styles.
  Owner: A2 (Design System and Shared UI). Token names come from PROJECT_REQUIREMENTS.md section 7.1.
  A2 extends this file with .btn-*, .badge, .card and the rest; do not rename tokens.
*/
:root {
  --bg-page: #F9F6FE;
  --bg-surface: #FFFFFF;
  --bg-lavender: #E4D5F9;
  --text-primary: #3C1E5E;
  --text-muted: #6B6578;
  --accent: #6F3FF5;
  --accent-dark: #5B30D6;
  --border: #EFEAEF;

  --success: #1F9D6B;
  --success-bg: #E3F6EE;
  --warning: #B7791F;
  --warning-bg: #FEF3D7;
  --danger: #D14343;
  --danger-bg: #FDE8E8;
  --info: #2F6FDE;
  --info-bg: #E3EDFD;

  --admin-bar: #3C1E5E;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  --shadow-card: 0 4px 20px rgba(111, 63, 245, 0.08);
  --shadow-hover: 0 10px 30px rgba(111, 63, 245, 0.16);

  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-muted);
  background: var(--bg-page);
}

h1, h2, h3, h4 {
  margin: 0 0 0.5em;
  line-height: 1.2;
  color: var(--text-primary);
}

img {
  display: block;
  max-width: 100%;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: clamp(16px, 4vw, 32px);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  left: 8px;
  top: -48px;
  z-index: 1000;
  padding: 8px 16px;
  color: #FFFFFF;
  background: var(--accent);
  border-radius: var(--radius-sm);
}

.skip-link:focus {
  top: 8px;
}

:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

/* Placeholder styling for stub pages; removed naturally as agents replace the stubs. */
.stub {
  max-width: 720px;
  margin: 3rem auto;
  padding: 1.5rem;
  background: var(--bg-surface);
  border: 1px dashed var(--accent);
  border-radius: var(--radius-lg);
}

.error-panel {
  padding: 4rem 1rem;
  text-align: center;
}

.route-loading {
  padding: 2rem;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
'@

$ConfigJs = @'
// Central constants. Owner: A3 (Data and State).
export const STORAGE_PREFIX = 'fc_'
export const SCHEMA_VERSION = 1

export const CURRENCY = 'USD'
export const LOCALE = 'en-US'
export const SHIPPING_FLAT = 5.99

// DEMO ONLY. Client-side credentials are not real security (see SYSTEM_ARCHITECTURE.md section 12).
export const DEMO_ADMIN = {
  email: 'admin@fishcommerce.com',
  password: 'admin123',
  name: 'Admin',
}
'@

$StorageJs = @'
// Safe localStorage access. Owner: A3 (Data and State).
// Contexts and pages must use this module instead of touching localStorage directly.
import { STORAGE_PREFIX, SCHEMA_VERSION } from '../config.js'

const prefixed = (key) => `${STORAGE_PREFIX}${key}`

/**
 * Migrations keyed by the schema version they migrate TO.
 * Each function rewrites stored keys with readJSON / writeJSON.
 * Example: 2: () => { ... }
 */
export const migrations = {}

export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(prefixed(key))
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** Returns true on success, false if storage is unavailable or full. */
export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(prefixed(key), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(prefixed(key))
  } catch {
    /* storage unavailable: nothing to remove */
  }
}

/**
 * Calls callback(newValue) when ANOTHER tab changes this key (the browser does not
 * fire the event in the tab that made the change). Returns an unsubscribe function.
 */
export function subscribe(key, callback) {
  const handler = (event) => {
    if (event.key === prefixed(key) || event.key === null) {
      callback(readJSON(key, null))
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

/** Writes fc_meta on first run and runs migrations when the stored schema is older. */
export function initStorage() {
  const meta = readJSON('meta', null)

  if (meta === null || typeof meta !== 'object') {
    writeJSON('meta', { schemaVersion: SCHEMA_VERSION, seededAt: new Date().toISOString() })
    return { firstRun: true, newerThanApp: false }
  }

  if (meta.schemaVersion > SCHEMA_VERSION) {
    return { firstRun: false, newerThanApp: true }
  }

  if (meta.schemaVersion < SCHEMA_VERSION) {
    for (let version = meta.schemaVersion + 1; version <= SCHEMA_VERSION; version += 1) {
      if (typeof migrations[version] === 'function') migrations[version]()
    }
    writeJSON('meta', { ...meta, schemaVersion: SCHEMA_VERSION })
  }

  return { firstRun: false, newerThanApp: false }
}
'@

$MoneyJs = @'
// Cents-safe money helpers. Owner: A3 (Data and State).
// Never add or multiply prices with raw floating point (0.1 + 0.2 === 0.30000000000000004).
import { CURRENCY, LOCALE } from '../config.js'

const formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY })

export const toCents = (amount) => Math.round(Number(amount) * 100)
export const fromCents = (cents) => cents / 100
export const roundMoney = (amount) => fromCents(toCents(amount))
export const lineTotal = (price, quantity) => fromCents(toCents(price) * quantity)
export const sumMoney = (amounts) => fromCents(amounts.reduce((sum, amount) => sum + toCents(amount), 0))
export const formatPrice = (amount) => formatter.format(roundMoney(amount))
'@

$IdJs = @'
// ID helpers. Owner: A3 (Data and State).
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O, 1/I

/** UUID when available (secure contexts), otherwise a time + random fallback. */
export function newId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** Display reference such as FC-20261104-A7K3 (BR-08). Caller must check uniqueness. */
export function newOrderReference(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
  let suffix = ''
  for (let i = 0; i < 4; i += 1) {
    suffix += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)]
  }
  return `FC-${ymd}-${suffix}`
}
'@

$ValidatorsJs = @'
// Form and entity validation. Owner: A3 (Data and State).
// Rules: PROJECT_REQUIREMENTS.md section 6. Each validator returns { valid, errors } where errors maps field -> message.
//
// SAFE-FAIL STUBS: until A3 implements them, every validator reports invalid so nothing slips through unchecked.

const notImplemented = (name) => ({
  valid: false,
  errors: { _form: `${name} is not implemented yet (agent A3).` },
})

export const validateSignup = () => notImplemented('validateSignup')
export const validateLogin = () => notImplemented('validateLogin')
export const validateCheckout = () => notImplemented('validateCheckout')
export const validateProduct = () => notImplemented('validateProduct')
'@

$FishDataJs = @'
// Seed products. Owner: A3 (structure and numbers); A7 supplies descriptions and images.
// TODO (A3): add the 14 products listed in DATABASE_SCHEMA.md section 7.
// Each product needs: id, name, price, image, waterType, careLevel, temperament, minTankSize,
// diet, description, stock, isAvailable, badges, createdAt, updatedAt.
// Images must use stable paths such as '/images/fish/crown-tail-betta.png' (files live in public/images/fish/).
export const fishData = []
'@

$ContextTemplate = @'
import { createContext, useContext } from 'react'

const __BASE__Context = createContext(null)

// TODO (__OWNER__): implement per SYSTEM_ARCHITECTURE.md section 6 (contract) and DATABASE_SCHEMA.md.
export function __BASE__Provider({ children }) {
  const value = {}
  return <__BASE__Context.Provider value={value}>{children}</__BASE__Context.Provider>
}

export function __HOOK__() {
  const ctx = useContext(__BASE__Context)
  if (ctx === null) throw new Error('__HOOK__ must be used inside <__BASE__Provider>')
  return ctx
}
'@

$PageTemplate = @'
import './__NAME__.css'

// Placeholder. Owner: __OWNER__. See AGENT_SPECIFICATIONS.md.
export default function __NAME__(__PROPS__) {
  return (
    <section className="stub stub--__KEBAB__">
      <h1>__LABEL__</h1>
      <p>Placeholder. Owner: __OWNER__.</p>
    </section>
  )
}
'@

$HiddenTemplate = @'
import './__NAME__.css'

// Placeholder that renders nothing. Owner: __OWNER__. See AGENT_SPECIFICATIONS.md.
export default function __NAME__(__PROPS__) {
  return null
}
'@

$AdminLayoutTemplate = @'
import { Outlet } from 'react-router-dom'
import './AdminLayout.css'

// Placeholder. Owner: A6 (Admin Portal). TODO: route guard (<Navigate>), top bar, tabs, new-order toast.
export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <section className="stub stub--admin-layout">
        <h1>AdminLayout</h1>
        <p>Placeholder. Owner: A6 (Admin Portal). No route guard yet.</p>
      </section>
      <Outlet />
    </div>
  )
}
'@

# ---------------------------------------------------------------------------
# Stub helpers
# ---------------------------------------------------------------------------
function Add-ComponentStub {
    param(
        [string]$Dir,
        [string]$Name,
        [string]$Owner,
        [string]$Props = '',
        [string]$Label = '',
        [switch]$Hidden
    )
    $kebab = ($Name -creplace '([a-z])([A-Z])', '$1-$2').ToLower()
    if ([string]::IsNullOrEmpty($Label)) { $Label = $Name }
    $template = if ($Hidden) { $HiddenTemplate } else { $PageTemplate }
    $js = Expand-Template $template @{ NAME = $Name; KEBAB = $kebab; OWNER = $Owner; PROPS = $Props; LABEL = $Label }
    Write-ProjectFile "$Dir/$Name.jsx" $js
    Write-ProjectFile "$Dir/$Name.css" "/* $Name styles. Owner: $Owner. */"
}

function Add-ContextStub {
    param([string]$Path, [string]$Base, [string]$Hook, [string]$Owner)
    $js = Expand-Template $ContextTemplate @{ BASE = $Base; HOOK = $Hook; OWNER = $Owner }
    Write-ProjectFile $Path $js
}

# ---------------------------------------------------------------------------
# 1. Folders
# ---------------------------------------------------------------------------
Write-Step 'Creating folder structure'
$folders = @(
    'public/images/fish',
    'src/assets',
    'src/data',
    'src/utils',
    'src/context',
    'src/components',
    'src/pages/admin',
    'docs/qa'
)
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path (Join-Path $Root $folder) -Force | Out-Null
    Write-Ok "$folder/"
}

# ---------------------------------------------------------------------------
# 2. Project and config files
# ---------------------------------------------------------------------------
Write-Step 'Writing project files'

$pkgName = ((Split-Path -Leaf $Root).ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
if ([string]::IsNullOrEmpty($pkgName)) { $pkgName = 'fishcommerce' }

Write-ProjectFile 'package.json' (Expand-Template $PackageJson @{ NAME = $pkgName })
Write-ProjectFile 'vite.config.js' $ViteConfig
Write-ProjectFile 'index.html' $IndexHtml
Write-ProjectFile '.gitignore' $GitIgnore
Write-ProjectFile 'public/_redirects' $Redirects
Write-ProjectFile 'public/images/fish/.gitkeep' ''
Write-ProjectFile 'src/assets/.gitkeep' ''
Write-ProjectFile 'docs/qa/.gitkeep' ''

# ---------------------------------------------------------------------------
# 3. Source: shell, styles, shared modules
# ---------------------------------------------------------------------------
Write-Step 'Writing application shell and shared modules'
Write-ProjectFile 'src/main.jsx' $MainJsx
Write-ProjectFile 'src/App.jsx' $AppJsx
Write-ProjectFile 'src/index.css' $IndexCss
Write-ProjectFile 'src/config.js' $ConfigJs
Write-ProjectFile 'src/utils/storage.js' $StorageJs
Write-ProjectFile 'src/utils/money.js' $MoneyJs
Write-ProjectFile 'src/utils/id.js' $IdJs
Write-ProjectFile 'src/utils/validators.js' $ValidatorsJs
Write-ProjectFile 'src/data/fishData.js' $FishDataJs

# ---------------------------------------------------------------------------
# 4. Context stubs (contracts live in SYSTEM_ARCHITECTURE.md section 6)
# ---------------------------------------------------------------------------
Write-Step 'Writing context stubs'
Add-ContextStub 'src/context/AuthContext.jsx'    'Auth'    'useAuth'     'A3 (Data and State)'
Add-ContextStub 'src/context/ProductContext.jsx' 'Product' 'useProducts' 'A3 (Data and State)'
Add-ContextStub 'src/context/CartContext.jsx'    'Cart'    'useCart'     'A3 (Data and State)'
Add-ContextStub 'src/context/OrderContext.jsx'   'Order'   'useOrders'   'A3 (Data and State)'

# Toast lives with the components but exports a provider and hook (decision D-11).
Add-ContextStub 'src/components/Toast.jsx' 'Toast' 'useToast' 'A2 (Design System and Shared UI)'
Write-ProjectFile 'src/components/Toast.css' '/* Toast styles. Owner: A2 (Design System and Shared UI). */'

# ---------------------------------------------------------------------------
# 5. Component and page stubs
# ---------------------------------------------------------------------------
Write-Step 'Writing component stubs'
$a2 = 'A2 (Design System and Shared UI)'
$a4 = 'A4 (Storefront)'
$a5 = 'A5 (Auth and Checkout)'
$a6 = 'A6 (Admin Portal)'
$a7 = 'A7 (Assets and Content)'

Add-ComponentStub 'src/components' 'Navbar'      $a2
Add-ComponentStub 'src/components' 'Footer'      $a2
Add-ComponentStub 'src/components' 'CartDrawer'  $a2 -Hidden
Add-ComponentStub 'src/components' 'Modal'       $a2 -Props '{ isOpen, onClose, title, children }' -Hidden
Add-ComponentStub 'src/components' 'ProductCard' $a4 -Props '{ product }'
Add-ComponentStub 'src/components' 'FilterBar'   $a4

Write-Step 'Writing page stubs'
Add-ComponentStub 'src/pages' 'Home'          $a4
Add-ComponentStub 'src/pages' 'Catalog'       $a4
Add-ComponentStub 'src/pages' 'ProductDetail' $a4
Add-ComponentStub 'src/pages' 'NotFound'      $a4
Add-ComponentStub 'src/pages' 'Checkout'      $a5
Add-ComponentStub 'src/pages' 'OrderSuccess'  $a5
Add-ComponentStub 'src/pages' 'Auth'          $a5
Add-ComponentStub 'src/pages' 'Care'          $a7
Add-ComponentStub 'src/pages' 'About'         $a7

Write-ProjectFile 'src/pages/admin/AdminLayout.jsx' $AdminLayoutTemplate
Write-ProjectFile 'src/pages/admin/AdminLayout.css' '/* AdminLayout styles. Owner: A6 (Admin Portal). */'
Add-ComponentStub 'src/pages/admin' 'AdminProducts' $a6
Add-ComponentStub 'src/pages/admin' 'AdminOrders'   $a6 -Props "{ view = 'pending' }" -Label 'AdminOrders ({view})'

# ---------------------------------------------------------------------------
# 6. Copy documentation if the script lives somewhere else
# ---------------------------------------------------------------------------
if ($Root -ne $ScriptDirFull) {
    Write-Step 'Copying project documents next to the project'
    $docs = @(
        'AGENT_SPECIFICATIONS.md', 'DATABASE_SCHEMA.md', 'implementation_plan.md',
        'implementation_plan_full.md', 'PROJECT_REQUIREMENTS.md', 'README.md',
        'RUNNING.md', 'SYSTEM_ARCHITECTURE.md'
    )
    foreach ($doc in $docs) {
        $source = Join-Path $ScriptDirFull $doc
        $dest = Join-Path $Root $doc
        if ((Test-Path -LiteralPath $source) -and (-not (Test-Path -LiteralPath $dest) -or $Force)) {
            Copy-Item -LiteralPath $source -Destination $dest -Force
            Write-Ok $doc
        }
    }
}

# ---------------------------------------------------------------------------
# 7. Install dependencies and smoke-test the build (Gate G1)
# ---------------------------------------------------------------------------
if ($SkipInstall) {
    Write-Step 'Skipping npm install and build check (-SkipInstall)'
}
else {
    Push-Location $Root
    try {
        Write-Step 'Installing runtime dependencies: react, react-dom, react-router-dom'
        & $npmName install react react-dom react-router-dom
        if ($LASTEXITCODE -ne 0) { throw 'npm install (runtime dependencies) failed. See the output above.' }

        Write-Step 'Installing dev dependencies: vite, @vitejs/plugin-react'
        & $npmName install --save-dev vite '@vitejs/plugin-react'
        if ($LASTEXITCODE -ne 0) { throw 'npm install (dev dependencies) failed. See the output above.' }

        Write-Step 'Build check (npm run build)'
        & $npmName run build
        if ($LASTEXITCODE -ne 0) {
            Write-Note 'Build check failed. The files are in place; fix the error shown above and run: npm run build'
        }
        else {
            Write-Ok 'Build succeeded (Gate G1 smoke test)'
        }
    }
    finally {
        Pop-Location
    }
}

# ---------------------------------------------------------------------------
# 8. Optional git init
# ---------------------------------------------------------------------------
if ($InitGit) {
    Write-Step 'Initialising git'
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Note 'git was not found on PATH; skipping.'
    }
    elseif (Test-Path -LiteralPath (Join-Path $Root '.git')) {
        Write-Skip 'already a git repository'
    }
    else {
        Push-Location $Root
        try { & git init | Out-Null; Write-Ok 'git init' } finally { Pop-Location }
    }
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
Write-Host ''
Write-Host '----------------------------------------------------------------' -ForegroundColor Magenta
Write-Host "Done. Files created: $($script:Created), skipped (already existed): $($script:Skipped)" -ForegroundColor Green
Write-Host ''
Write-Host 'Next steps:'
Write-Host "  1. cd `"$Root`""
Write-Host '  2. npm run dev           (opens on http://localhost:5173 - every route shows a placeholder)'
Write-Host '  3. Open AGENT_SPECIFICATIONS.md and start Wave 1 (A2, A3, A7), then Wave 2 (A4, A5, A6).'
Write-Host ''
Write-Host 'Demo admin login (after the Auth work is built): admin@fishcommerce.com / admin123'
Write-Host '----------------------------------------------------------------' -ForegroundColor Magenta
