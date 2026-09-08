import React from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <RealtimeProvider>
            <AppRoutes />
          </RealtimeProvider>
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
