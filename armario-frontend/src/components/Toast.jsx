import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`animate-slide-up flex items-center gap-3 min-w-[280px] max-w-sm px-4 py-3.5 rounded-2xl shadow-rose border text-sm font-medium
              ${toast.type === 'success'
                ? 'bg-white border-rose-soft text-plum'
                : toast.type === 'error'
                ? 'bg-white border-red-100 text-red-700'
                : 'bg-white border-lavender-soft text-plum'}`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-burgundy shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-lavender shrink-0" />}
            <span className="flex-1 text-plum/80">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-plum/20 hover:text-plum/50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
