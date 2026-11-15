import { Component, Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

import { ToastProvider } from './components/Toast.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProductProvider } from './context/ProductContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { OrderProvider } from './context/OrderContext.jsx'

import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import BottomNav from './components/BottomNav.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import PageLoader from './components/PageLoader.jsx'
import TutorialTour from './components/TutorialTour.jsx'
import WhatsAppButton from './components/WhatsAppButton.jsx'

import Home from './pages/Home.jsx'
import Catalog from './pages/Catalog.jsx'
import NotFound from './pages/NotFound.jsx'

// Lazy-load everything except the landing page and catalog
const ProductDetail = lazy(() => import('./pages/ProductDetail.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'))
const Auth = lazy(() => import('./pages/Auth.jsx'))
const Care = lazy(() => import('./pages/Care.jsx'))
const About = lazy(() => import('./pages/About.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const RefundPolicy = lazy(() => import('./pages/RefundPolicy.jsx'))
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy.jsx'))
const MyOrders = lazy(() => import('./pages/customer/MyOrders.jsx'))

// Admin pages lazy-loaded
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-panel" role="alert">
          <div className="error-card-inner">
            <AlertCircle size={44} color="#dc2626" strokeWidth={1.75} style={{ margin: '0 auto 12px', display: 'block' }} />
            <h1>Something went wrong</h1>
            <p>An unexpected error occurred while rendering this section.</p>
            {this.state.error?.message && (
              <pre className="error-details-pre">
                {this.state.error.message}
              </pre>
            )}
            <div className="error-actions-group">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  this.handleReset()
                  window.history.back()
                }}
              >
                ← Go to Previous Page
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  this.handleReset()
                  window.location.href = '/'
                }}
              >
                Return to Storefront
              </button>
              <button
                type="button"
                className="btn-reload-outline"
                onClick={() => window.location.reload()}
              >
                ↻ Reload
              </button>
            </div>
          </div>
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
      <BottomNav />
      <CartDrawer />
      <TutorialTour />
      <WhatsAppButton />
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
                  <Suspense fallback={<PageLoader text="Loading page..." />}>
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
                        <Route path="contact" element={<Contact />} />
                        <Route path="terms" element={<Terms />} />
                        <Route path="privacy" element={<Privacy />} />
                        <Route path="refund-policy" element={<RefundPolicy />} />
                        <Route path="shipping-policy" element={<ShippingPolicy />} />
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
