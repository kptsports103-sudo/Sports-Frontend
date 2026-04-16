import { useEffect, useState } from 'react';
import AppRoutes from './routes/AppRoutes';
import AuthProvider from './context/AuthContext';
import { ClerkProvider } from '@clerk/clerk-react';
import NotificationHost from './components/NotificationHost';
import SecretKeyProvider from './components/SecretKeyProvider';
import { Toaster } from 'react-hot-toast';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

function LazyAnalytics() {
  const [AnalyticsComponent, setAnalyticsComponent] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = () => {
      import('@vercel/analytics/react')
        .then((mod) => {
          if (!cancelled) {
            setAnalyticsComponent(() => mod.Analytics);
          }
        })
        .catch(() => {});
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(loadAnalytics, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const timeoutId = window.setTimeout(loadAnalytics, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!AnalyticsComponent) return null;
  return <AnalyticsComponent />;
}

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <AuthProvider>
        <SecretKeyProvider>
          <NotificationHost />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { fontSize: '13px', borderRadius: '10px' },
            }}
          />
          <AppRoutes />
          <LazyAnalytics />
        </SecretKeyProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}

export default App;
