/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoreProvider } from './store/responseStore';
import { AuthProvider, useAuth } from './store/authStore';
import DashboardLayout from './components/DashboardLayout';
import AuthPage from './components/AuthPage';

function AppContent() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <DashboardLayout key={user.id} /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
