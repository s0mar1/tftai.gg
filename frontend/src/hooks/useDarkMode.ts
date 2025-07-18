// Re-export the improved useDarkMode hook from DarkModeContext
// This provides backward compatibility while using the new Context-based approach
export { useDarkMode } from '../context/DarkModeContext';

// Legacy hook for read-only dark mode detection (deprecated)
// Use the new useDarkMode from DarkModeContext instead
import { useState, useEffect } from 'react';

export function useDarkModeReadOnly(): boolean {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    return () => observer.disconnect();
  }, []);

  return isDarkMode;
}
