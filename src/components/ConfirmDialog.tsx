import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isLoading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-900/50',
      button: 'bg-rose-600 hover:bg-rose-700'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/50',
      button: 'bg-amber-600 hover:bg-amber-700'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/50',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/50',
      button: 'bg-emerald-600 hover:bg-emerald-700'
    }
  };

  const activeColor = colors[type];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>

          <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto border shadow-sm", activeColor.bg, activeColor.text, activeColor.border)}>
            <AlertCircle size={40} />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-10 leading-relaxed">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button 
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 py-4 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50",
                activeColor.button
              )}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
