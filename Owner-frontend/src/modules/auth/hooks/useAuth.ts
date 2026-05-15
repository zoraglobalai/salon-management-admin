import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/auth.api';
import type { LoginCredentials, User } from '../types/auth.types';
import {
  clearOwnerSession,
  getOwnerTabId,
  getStoredOwnerToken,
  getStoredOwnerUser,
  OWNER_AUTH_CHANGED_EVENT,
  OWNER_AUTH_EVENT_KEY,
  parseOwnerBroadcastEvent,
  storeOwnerSession,
  updateStoredOwnerUser,
} from '../services/sessionSync';

const ALLOWED_OWNER_PORTAL_ROLES: User['role'][] = ['OWNER', 'INDEPENDENT_OWNER', 'SUPER_ADMIN', 'MANAGER'];

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => getStoredOwnerUser());
  const [token, setToken] = useState<string | null>(() => getStoredOwnerToken());
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDefaultPasswordModal, setShowDefaultPasswordModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    getOwnerTabId();

    const syncFromSession = () => {
      setUser(getStoredOwnerUser());
      setToken(getStoredOwnerToken());
    };

    const handleSessionChanged = () => {
      syncFromSession();
    };

    const handleCrossTabChange = (event: StorageEvent) => {
      if (event.key !== OWNER_AUTH_EVENT_KEY) {
        return;
      }

      const nextEvent = parseOwnerBroadcastEvent(event.newValue);
      if (!nextEvent || nextEvent.sourceTabId === getOwnerTabId()) {
        return;
      }

      const currentUser = getStoredOwnerUser();
      if (!currentUser || !nextEvent.userId || currentUser.id !== nextEvent.userId) {
        return;
      }

      clearOwnerSession({ redirectToLogin: true });
      syncFromSession();
    };

    window.addEventListener(OWNER_AUTH_CHANGED_EVENT, handleSessionChanged as EventListener);
    window.addEventListener("storage", handleCrossTabChange);

    return () => {
      window.removeEventListener(OWNER_AUTH_CHANGED_EVENT, handleSessionChanged as EventListener);
      window.removeEventListener("storage", handleCrossTabChange);
    };
  }, []);

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
      storeOwnerSession(userData, jwt);

      if (
        (userData.role === 'OWNER' || userData.role === 'INDEPENDENT_OWNER') &&
        userData.passwordResetRequired
      ) {
        navigate('/create-new-password');
      } else if (isDefaultPassword) {
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
    clearOwnerSession({ broadcast: true });
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
      updateStoredOwnerUser(newUser);
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
