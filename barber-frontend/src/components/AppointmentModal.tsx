import React from 'react';
import { Calendar, X } from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  formId: string;
  cancelLabel: string;
  submitLabel: string;
  children: React.ReactNode;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  formId,
  cancelLabel,
  submitLabel,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-treservi-card-dark w-full sm:w-[min(42rem,92vw)] rounded-t-[30px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col">
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-treservi-card-dark/95 backdrop-blur border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg flex items-center justify-center text-white flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-black leading-tight truncate">{title}</h3>
                {subtitle ? <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-black flex items-center justify-center flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
          {children}
        </div>

        <div className="sticky bottom-0 bg-white/95 dark:bg-treservi-card-dark/95 backdrop-blur border-t border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-2.5 xs:py-3 flex items-center justify-end gap-2 xs:gap-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] xs:pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 xs:px-5 py-2 xs:py-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold text-xs xs:text-sm sm:text-sm min-h-[40px] xs:min-h-[44px] sm:min-h-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form={formId}
            className="px-4 xs:px-6 py-2 xs:py-2.5 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-lg hover:scale-[1.02] active:scale-95 transition-transform text-xs xs:text-sm sm:text-sm min-h-[40px] xs:min-h-[44px] sm:min-h-auto"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;