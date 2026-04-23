import { useEffect } from 'react';
import { useGameStore } from '../store';

/**
 * Hook to synchronize the URL hash with the debug mode state.
 * Enables debug mode when the URL ends with '#debug'.
 */
export function useDebugTrigger() {
  const setIsDebug = useGameStore(s => s.setIsDebug);

  useEffect(() => {
    const handleHashChange = () => {
      setIsDebug(window.location.hash === '#debug');
    };

    // Initial check on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setIsDebug]);
}
