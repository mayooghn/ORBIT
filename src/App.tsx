import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { RiskPage } from './pages/RiskPage';
import { NetworkPage } from './pages/NetworkPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { ImpactPage } from './pages/ImpactPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { ReservesPage } from './pages/ReservesPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { AssistantPage } from './pages/AssistantPage';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoadingState } from './components/common/LoadingState';

function MainRouter() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Sync browser back / forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route: Landing Page (/)
  if (currentPath === '/' || currentPath === '') {
    return (
      <LandingPage
        isAuthenticated={Boolean(user)}
        onNavigateToAuth={() => navigate('/login')}
        onNavigateToApp={() => navigate('/app/dashboard')}
      />
    );
  }

  // Route: Auth / Login (/login or /auth)
  if (currentPath === '/login' || currentPath === '/auth') {
    if (user) {
      return <RedirectToCommandCenter onRedirect={() => navigate('/app/dashboard')} />;
    }
    return (
      <AuthPage
        onBackToLanding={() => navigate('/')}
        onSuccessRedirect={() => navigate('/app/dashboard')}
      />
    );
  }

  // Protected App Shell Routes
  return (
    <ProtectedRoute onRedirectToLogin={() => navigate('/login')}>
      <AppShell currentPath={currentPath} onNavigate={navigate}>
        {(() => {
          switch (currentPath) {
            case '/app/dashboard':
              return <DashboardPage onNavigate={navigate} />;
            case '/app/risk':
              return <RiskPage />;
            case '/app/network':
              return <NetworkPage />;
            case '/app/scenarios':
              return <ScenariosPage />;
            case '/app/impact':
              return <ImpactPage />;
            case '/app/procurement':
              return <ProcurementPage />;
            case '/app/reserves':
              return <ReservesPage />;
            case '/app/recommendations':
              return <RecommendationsPage />;
            case '/app/assistant':
              return <AssistantPage onNavigate={navigate} />;
            default:
              return <DashboardPage onNavigate={navigate} />;
          }
        })()}
      </AppShell>
    </ProtectedRoute>
  );
}

const RedirectToCommandCenter: React.FC<{ onRedirect: () => void }> = ({ onRedirect }) => {
  useEffect(() => {
    onRedirect();
  }, [onRedirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <LoadingState message="Opening Command Center..." subtext="Your secure session is active" />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
