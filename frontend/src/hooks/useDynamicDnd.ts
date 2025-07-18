import { useState, useEffect } from 'react';

interface DndHooks {
  useDrag: any;
  useDrop: any;
  loading: boolean;
  error: Error | null;
}

export const useDynamicDnd = (): DndHooks => {
  const [dndHooks, setDndHooks] = useState<DndHooks>({
    useDrag: null,
    useDrop: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const loadDndHooks = async () => {
      try {
        const dndModule = await import('react-dnd');
        setDndHooks({
          useDrag: dndModule.useDrag,
          useDrop: dndModule.useDrop,
          loading: false,
          error: null
        });
      } catch (err) {
        setDndHooks({
          useDrag: null,
          useDrop: null,
          loading: false,
          error: err as Error
        });
      }
    };

    loadDndHooks();
  }, []);

  return dndHooks;
};