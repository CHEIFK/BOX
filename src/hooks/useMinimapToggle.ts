/** useMinimapToggle — simple toggle for minimap visibility */
import { useState, useCallback } from 'react';

export function useMinimapToggle(defaultEnabled = true) {
  const [minimapEnabled, setMinimapEnabled] = useState(defaultEnabled);
  const toggleMinimap = useCallback(() => setMinimapEnabled((v) => !v), []);
  return { minimapEnabled, toggleMinimap };
}
