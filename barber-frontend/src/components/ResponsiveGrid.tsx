import React from 'react';

interface ResponsiveGridProps {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  gap?: string;
  children: React.ReactNode;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  mobile = 1,
  tablet = 2,
  desktop = 3,
  gap = 'gap-4',
  children,
}) => {
  return (
    <div
      className={`grid ${gap} grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${desktop}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
