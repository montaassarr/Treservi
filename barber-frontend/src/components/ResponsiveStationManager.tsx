import React, { useState } from 'react';
import { List, Grid3X3 } from 'lucide-react';

export interface Station {
  id: string;
  name: string;
  position_x?: number;
  position_y?: number;
  is_active: boolean;
  staff_count?: number;
}

interface ResponsiveStationManagerProps {
  stations: Station[];
  onUpdatePosition?: (id: string, x: number, y: number) => void;
  onSelectStation?: (station: Station) => void;
}

const ResponsiveStationManager: React.FC<ResponsiveStationManagerProps> = ({
  stations,
  onUpdatePosition,
  onSelectStation,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile && viewMode === 'list') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Stations</h3>
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <Grid3X3 size={20} />
          </button>
        </div>

        {stations.map((station) => (
          <div
            key={station.id}
            onClick={() => onSelectStation?.(station)}
            className={`p-4 rounded-2xl cursor-pointer transition-all ${
              station.is_active
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {station.name}
                </h4>
                {station.staff_count !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {station.staff_count} staff assigned
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  station.is_active
                    ? 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200'
                }`}
              >
                {station.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view (default for desktop, optional for mobile)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Stations</h3>
        {isMobile && (
          <button
            onClick={() => setViewMode('list')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <List size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {stations.map((station) => (
          <div
            key={station.id}
            onClick={() => onSelectStation?.(station)}
            className={`p-4 rounded-2xl cursor-pointer transition-all ${
              station.is_active
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700'
            }`}
          >
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {station.name}
            </h4>
            {station.staff_count !== undefined && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {station.staff_count} staff
              </p>
            )}
            <span
              className={`text-xs font-bold mt-2 inline-block px-2 py-1 rounded-full ${
                station.is_active
                  ? 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-200'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-200'
              }`}
            >
              {station.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResponsiveStationManager;
