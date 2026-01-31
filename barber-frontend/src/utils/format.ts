// Utility to format price in TND
export const formatPrice = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '0.000 DT';
  
  return new Intl.NumberFormat('fr-TN', {
    style: 'decimal',
    minimumFractionDigits: 3, 
    maximumFractionDigits: 3,
  }).format(numericAmount) + ' DT';
};
