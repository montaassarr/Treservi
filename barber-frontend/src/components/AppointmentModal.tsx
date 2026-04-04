import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-treservi-card-dark w-full h-[94dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white dark:bg-treservi-card-dark border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 pt-5 sm:pt-5 pb-4 sm:pb-5">
          <div className="relative min-h-[44px]">
            <div className="flex items-center justify-center gap-3 pr-12">
              <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg flex items-center justify-center text-white flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 text-center">
                <h3 className="text-xl sm:text-2xl font-black leading-tight truncate">{title}</h3>
                {subtitle ? <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4">
          {children}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white dark:bg-treservi-card-dark border-t border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 flex items-center justify-end gap-2 xs:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 xs:px-5 py-2 xs:py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-bold text-xs xs:text-sm sm:text-sm min-h-[40px] xs:min-h-[44px] sm:min-h-auto transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form={formId}
            className="px-4 xs:px-6 py-2 xs:py-2.5 rounded-full text-white font-bold bg-gradient-to-br from-[#3ad061] to-[#1e9c46] shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs xs:text-sm sm:text-sm min-h-[40px] xs:min-h-[44px] sm:min-h-auto"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // Render as portal to avoid z-index and scroll conflicts
  return createPortal(modalContent, document.body);
};

export default AppointmentModal;