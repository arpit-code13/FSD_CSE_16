import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'user' | 'admin';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isSimulating: boolean;
  setIsSimulating: (simulating: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('user'); // Default to user; sync with auth on login
  const [selectedCity, setSelectedCity] = useState<string>('Bengaluru');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        selectedCity,
        setSelectedCity,
        isSimulating,
        setIsSimulating,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
