import React from 'react';

interface ResponsiveGridProps {
  columns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  gap?: string;
  children: React.ReactNode;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = '4',
  children,
}) => {
  return (
    <div
      className={`grid gap-${gap} grid-cols-${columns.mobile} md:grid-cols-${columns.tablet} lg:grid-cols-${columns.desktop}`}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
