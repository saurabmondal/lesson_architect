import React, { createContext, useContext, useState } from 'react';

interface MockUser {
  uid: string;
  displayName: string;
}

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: { uid: 'local_user', displayName: 'Local User' },
  loading: false,
  signIn: async () => {},
  logOut: async () => {},
  authError: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user] = useState<MockUser | null>({ uid: 'local_user', displayName: 'Local User' });

  return (
    <AuthContext.Provider value={{ user, loading: false, signIn: async () => {}, logOut: async () => {}, authError: null }}>
      {children}
    </AuthContext.Provider>
  );
};
