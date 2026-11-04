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
import MyOrders from './pages/customer/MyOrders.jsx'
import NotFound from './pages/NotFound.jsx'

// Admin pages lazy-loaded
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

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
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
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
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProductProvider>
            <CartProvider>
              <OrderProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                        <Route path="orders" element={<MyOrders />} />
                        <Route path="care" element={<Care />} />
                        <Route path="about" element={<About />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>

                      {/* Admin route hierarchy */}
                      <Route path="admin" element={<AdminLayout />}>
                        <Route index element={<Navigate to="products" replace />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="orders" element={<AdminOrders view="pending" />} />
                        <Route path="orders/history" element={<AdminOrders view="history" />} />
                        <Route path="settings" element={<AdminSettings />} />
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
