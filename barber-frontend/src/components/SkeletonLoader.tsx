import React from 'react';

const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-[32px] animate-pulse ${className}`} />
);

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="p-6 lg:p-10 w-full max-w-[1600px] mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-8">
          {/* Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CardSkeleton className="h-48" />
            <CardSkeleton className="h-48" />
          </div>
          
          {/* Chart */}
          <CardSkeleton className="h-[400px]" />
          
          {/* Table */}
          <CardSkeleton className="h-[400px]" />
        </div>

        {/* Right Col */}
        <div className="space-y-8">
            <CardSkeleton className="h-[420px]" />
            <CardSkeleton className="h-[600px]" />
        </div>
      </div>
    </div>
  );
};
