/**
 * FILE: frontend/src/App.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Composes providers (QueryClientProvider, AuthProvider, Toaster, Router).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './features/auth/AuthProvider.js';
import AppRoutes from './routes/AppRoutes.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
