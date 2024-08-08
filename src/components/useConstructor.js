import { useRef } from 'react';

/**
 * For objects which are persistent for the lifetime of the component, not
 * a member of state, and require a constructor to create. Wraps `useRef`.
 */
export function useConstructor(constructor) {
  const value = useRef(null);
  if (value.current === null) {
    value.current = constructor();
  }
  return value.current;
}
