import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  showConfirmDialog: boolean;
  pendingNavigation: string | null;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
  attemptNavigation: (path: string) => boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Handle beforeunload event for page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // Reset dirty state when location changes (successful navigation)
  useEffect(() => {
    setIsDirty(false);
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  }, [location.pathname]);

  const attemptNavigation = useCallback((path: string): boolean => {
    if (isDirty && path !== location.pathname) {
      setPendingNavigation(path);
      setShowConfirmDialog(true);
      return false; // Block navigation
    }
    return true; // Allow navigation
  }, [isDirty, location.pathname]);

  const confirmNavigation = useCallback(() => {
    const path = pendingNavigation;
    setIsDirty(false);
    setShowConfirmDialog(false);
    setPendingNavigation(null);
    if (path) {
      navigate(path);
    }
  }, [navigate, pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingNavigation(null);
  }, []);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isDirty,
        setIsDirty,
        showConfirmDialog,
        pendingNavigation,
        confirmNavigation,
        cancelNavigation,
        attemptNavigation,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within UnsavedChangesProvider');
  }
  return context;
}
