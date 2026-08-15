import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { AccessDenied } from './components/AccessDenied';
import { HomePage } from './pages/HomePage';
import { OrdersPage } from './pages/OrdersPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { MorePage } from './pages/MorePage';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient();

const MainContent: React.FC = () => {
  const { isLoading, isAccessDenied, errorMessage, retryAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [moreResetSignal, setMoreResetSignal] = useState(0);

  const handleSelectTab = (tab: TabType) => {
    if (tab === 'more') {
      if (activeTab === 'more') {
        setMoreResetSignal((prev) => prev + 1);
      } else {
        setActiveTab('more');
      }
    } else {
      setActiveTab(tab);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Авторизация Telegram сессии...</p>
      </div>
    );
  }

  if (isAccessDenied) {
    return <AccessDenied message={errorMessage} onRetry={retryAuth} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] max-w-md mx-auto w-full">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'projects' && <ProjectsPage />}
        {activeTab === 'more' && <MorePage resetSignal={moreResetSignal} />}
      </main>
      <BottomNav activeTab={activeTab} onSelectTab={handleSelectTab} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MainContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
