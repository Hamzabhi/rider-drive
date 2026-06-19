import { createContext, useContext, type ParentComponent, Show, For, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { cn } from '@/utils/helpers';

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
interface ToastContext { add: (msg: string, type?: 'success' | 'error' | 'info') => void; remove: (id: string) => void }

const ToastContext = createContext<ToastContext>();
export const useToast = () => { const ctx = useContext(ToastContext); if (!ctx) throw new Error('useToast must be used within ToastProvider'); return ctx; };

export const ToastProvider: ParentComponent = (props) => {
  let id = 0;
  const [toasts, setToasts] = createStore<Toast[]>([]);
  const add = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const tid = `toast-${++id}`;
    setToasts([...toasts, { id: tid, message, type }]);
    setTimeout(() => remove(tid), 5000);
  };
  const remove = (tid: string) => setToasts(toasts.filter(t => t.id !== tid));
  return (
    <ToastContext.Provider value={{ add, remove }}>
      {props.children}
      <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <For each={toasts}>{t => (
          <div class={cn('px-4 py-3 rounded-lg shadow-lg animate-slide-right max-w-xs',
            t.type === 'success' && 'bg-success text-text-inverse', t.type === 'error' && 'bg-danger text-text-inverse', t.type === 'info' && 'bg-primary text-text-inverse')}>
            {t.message}
          </div>
        )}</For>
      </div>
    </ToastContext.Provider>
  );
};
