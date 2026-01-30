import React from 'react';
import { Service, Translations } from './types';
import { Clock, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  services: Service[];
  selectedService: Service | null;
  onSelect: (service: Service) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  t: Translations;
}

export const Step3Service: React.FC<Props> = ({ services, selectedService, onSelect, notes, onNotesChange, t }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">{t.chooseService}</h2>
      
      <div className="grid gap-4">
        {services.map((service, idx) => {
          const isSelected = selectedService?.id === service.id;
          return (
            // @ts-ignore
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onSelect(service)}
              className={`p-5 rounded-[24px] cursor-pointer transition-all duration-200 border-2 relative overflow-hidden bg-white shadow-sm hover:shadow-md ${
                isSelected 
                  ? 'border-gray-900 bg-gray-50' 
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                {isSelected && (
                  <div className="bg-gray-900 rounded-full p-1">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">{service.description}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5 text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{service.duration}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{service.price} DT</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Optional Box */}
      <div className="space-y-3 pt-2">
        <label className="text-sm font-bold text-gray-700 ml-1 block">{t.optionalNotes}</label>
        <textarea 
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-[24px] p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all shadow-sm resize-none"
          rows={3}
          placeholder={t.notesPlaceholder}
        />
      </div>
    </div>
  );
};
