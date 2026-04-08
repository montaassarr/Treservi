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

export const formatDisplayDate = (value: string | Date, locale: string = 'en-US'): string => {
  if (!value) return '';

  const date =
    typeof value === 'string'
      ? new Date(`${value}T00:00:00`)
      : value;

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
  const year = String(date.getFullYear() % 100).padStart(2, '0');

  return `${day} ${month}, ${year}`;
};
