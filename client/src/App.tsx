import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation, Link } from 'react-router-dom';
import { CartProvider } from './store/cart';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { Spinner } from './components/ui';

import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Account } from './pages/Account';
import { VerifyEmail } from './pages/VerifyEmail';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { FAQ } from './pages/FAQ';
import { PrivacyPolicy, Terms, ShippingPolicy, ReturnsPolicy } from './pages/Legal';

// The admin dashboard is a separate concern from the storefront and is only
// used by staff, so it is code-split out of the main customer bundle.
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);

/** Restores scroll position to the top on navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="shell py-32 text-center lg:py-44">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Page not found</h1>
      <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-muted">
        The page you are looking for does not exist, or may have moved.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Back to home
        </Link>
        <Link to="/shop" className="btn-secondary">
          Shop skincare
        </Link>
      </div>
    </div>
  );
}

/** Public storefront layout: header, cart drawer and footer. */
function Storefront({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

const STOREFRONT_ROUTES: [string, React.ReactNode][] = [
  ['/', <Home />],
  ['/shop', <Shop />],
  ['/shop/:slug', <ProductDetail />],
  ['/cart', <CartPage />],
  ['/checkout', <Checkout />],
  ['/order/:orderNumber', <OrderConfirmation />],
  ['/account', <Account />],
  ['/verify-email', <VerifyEmail />],
  ['/about', <About />],
  ['/contact', <Contact />],
  ['/faq', <FAQ />],
  ['/privacy-policy', <PrivacyPolicy />],
  ['/terms', <Terms />],
  ['/shipping-policy', <ShippingPolicy />],
  ['/returns-policy', <ReturnsPolicy />],
  ['*', <NotFound />],
];

export default function App() {
  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-2 focus:text-sand-50"
      >
        Skip to content
      </a>

      <ScrollToTop />

      <Routes>
        {/* Admin is deliberately outside the storefront layout. */}
        <Route
          path="/admin/*"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-sand-100">
                  <Spinner className="h-6 w-6 text-ink-muted" />
                </div>
              }
            >
              <AdminDashboard />
            </Suspense>
          }
        />

        {STOREFRONT_ROUTES.map(([path, element]) => (
          <Route key={path} path={path} element={<Storefront>{element}</Storefront>} />
        ))}
      </Routes>
    </CartProvider>
  );
}
