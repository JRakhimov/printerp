import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUserResponse } from '@printerp/shared';
import { apiClient, setAuthToken } from '../lib/api-client';

interface AuthContextType {
  user: AuthUserResponse | null;
  isLoading: boolean;
  isAccessDenied: boolean;
  errorMessage: string | null;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAccessDenied: false,
  errorMessage: null,
  retryAuth: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAccessDenied, setIsAccessDenied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initAuth = async () => {
    setIsLoading(true);
    setIsAccessDenied(false);
    setErrorMessage(null);

    try {
      // 1. Tell Telegram WebApp we are ready and expand
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        if (typeof window.Telegram.WebApp.disableVerticalSwipes === 'function') {
          window.Telegram.WebApp.disableVerticalSwipes();
        }
        if (typeof window.Telegram.WebApp.setHeaderColor === 'function') {
          window.Telegram.WebApp.setHeaderColor('#0f172a');
        }
        if (typeof window.Telegram.WebApp.setBackgroundColor === 'function') {
          window.Telegram.WebApp.setBackgroundColor('#020617');
        }
      }

      const telegramInitData = window.Telegram?.WebApp?.initData || '';

      // Development fallback if running outside Telegram
      const initDataPayload = telegramInitData || 'dev_user_123456789';

      // 2. Request backend authentication
      const response = await apiClient.post('/auth/telegram', {
        initData: initDataPayload,
      });

      const { accessToken, user: authUser } = response.data;

      setAuthToken(accessToken);
      setUser(authUser);
    } catch (err: any) {
      console.error('Authentication error:', err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        setIsAccessDenied(true);
        const serverMsg = err.response?.data?.error?.message || err.response?.data?.message;
        setErrorMessage(
          serverMsg && !serverMsg.toLowerCase().includes('initdata')
            ? serverMsg
            : 'Пожалуйста, откройте приложение внутри Telegram Mini App.'
        );
      } else {
        setErrorMessage(err.response?.data?.error?.message || 'Failed to authenticate with backend server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAccessDenied,
        errorMessage,
        retryAuth: initAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
