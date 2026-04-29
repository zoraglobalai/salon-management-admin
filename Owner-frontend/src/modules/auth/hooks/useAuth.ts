import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/auth.api';
import type { LoginCredentials, User } from '../types/auth.types';

const ALLOWED_OWNER_PORTAL_ROLES: User['role'][] = ['OWNER', 'INDEPENDENT_OWNER', 'SUPER_ADMIN', 'MANAGER'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('owner_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('owner_token'));
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDefaultPasswordModal, setShowDefaultPasswordModal] = useState(false);

  const navigate = useNavigate();

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      
      if (!response.data) throw new Error('Invalid response from server');
      
      const { user: userData, token: jwt, isDefaultPassword } = response.data;

      if (!ALLOWED_OWNER_PORTAL_ROLES.includes(userData.role)) {
        throw new Error(`Access denied. This portal supports owner accounts only. Current role: ${userData.role}.`);
      }

      setUser(userData);
      setToken(jwt);
      sessionStorage.setItem('owner_user', JSON.stringify(userData));
      sessionStorage.setItem('owner_token', jwt);

      if (isDefaultPassword) {
        setShowDefaultPasswordModal(true);
      } else {
        navigate('/dashboard');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('owner_token');
    navigate('/login');
  };

  const closeDefaultPasswordModal = () => {
    setShowDefaultPasswordModal(false);
    navigate('/dashboard');
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      const newUser = { ...prevUser, ...updatedUser };
      sessionStorage.setItem('owner_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return {
    user,
    token,
    isLoading,
    error,
    showDefaultPasswordModal,
    login,
    logout,
    closeDefaultPasswordModal,
    updateUser,
  };
};
