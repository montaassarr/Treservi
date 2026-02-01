/**
 * Validation utilities for Tunisian phone numbers and spam prevention
 */

/**
 * Validates a Tunisian phone number
 * - Must be exactly 8 digits
 * - Must start with specific carrier prefixes:
 *   - Telecom Tunisia: 71, 72, 73, 74
 *   - Ooredoo: 50, 51, 52, 53
 *   - Orange: 20, 21, 22, 23
 *   - Other Carriers: 90-99
 * 
 * @param phone - The phone number to validate (can include spaces/hyphens)
 * @returns true if valid Tunisian number, false otherwise
 */
export const isValidTunisianPhone = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Must be exactly 8 digits
  if (cleaned.length !== 8) return false;
  
  // Check if starts with valid Tunisian carrier prefix
  const prefix = cleaned.substring(0, 2);
  const firstDigit = parseInt(prefix[0]);
  const fullPrefix = parseInt(prefix);
  
  // Valid ranges:
  // 71-74 (Telecom), 50-53 (Ooredoo), 20-23 (Orange), 90-99 (Other carriers)
  const validPrefixes = [
    // Telecom Tunisia
    '71', '72', '73', '74',
    // Ooredoo
    '50', '51', '52', '53',
    // Orange
    '20', '21', '22', '23'
  ];
  
  // Check standard carriers or 90-99 range
  const isValidPrefix = validPrefixes.includes(prefix) || (fullPrefix >= 90 && fullPrefix <= 99);
  
  return isValidPrefix;
};

/**
 * Format a Tunisian phone number for display
 * @param phone - The phone number to format
 * @returns Formatted phone number (e.g., "50123456" -> "50 123 456")
 */
export const formatTunisianPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 8) return cleaned;
  
  return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
};

/**
 * Get descriptive error message for invalid Tunisian phone
 * @param phone - The phone number that failed validation
 * @returns Error message
 */
export const getTunisianPhoneErrorMessage = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 0) {
    return 'Phone number is required';
  }
  
  if (cleaned.length !== 8) {
    return `Phone must be exactly 8 digits (you entered ${cleaned.length})`;
  }
  
  const prefix = cleaned.substring(0, 2);
  const carrierMap: Record<string, string> = {
    '71': 'Telecom', '72': 'Telecom', '73': 'Telecom', '74': 'Telecom',
    '50': 'Ooredoo', '51': 'Ooredoo', '52': 'Ooredoo', '53': 'Ooredoo',
    '20': 'Orange', '21': 'Orange', '22': 'Orange', '23': 'Orange'
  };
  
  const carrier = Object.entries(carrierMap).find(([key]) => key === prefix)?.[1];
  
  if (!carrier && !(parseInt(prefix) >= 90 && parseInt(prefix) <= 99)) {
    return `Invalid prefix "${prefix}". Must start with: 71-74 (Telecom), 50-53 (Ooredoo), 20-23 (Orange), or 90-99 (Other)`;
  }
  
  return 'Invalid phone number';
};

/**
 * Check if user has booked too many appointments recently (spam prevention)
 * @param recentBookings - Array of recent booking times (timestamps)
 * @param maxBookingsPerHour - Maximum allowed bookings per hour
 * @param timeWindowMs - Time window in milliseconds (default: 1 hour)
 * @returns true if user is spamming, false if within limits
 */
export const isSpammingBookings = (
  recentBookings: number[],
  maxBookingsPerHour: number = 3,
  timeWindowMs: number = 60 * 60 * 1000 // 1 hour
): boolean => {
  const now = Date.now();
  const recentCount = recentBookings.filter(time => now - time < timeWindowMs).length;
  return recentCount >= maxBookingsPerHour;
};

/**
 * Check if user is attempting to book the same slot twice
 * @param phone - User's phone number
 * @param staffId - Staff member ID
 * @param dateTime - Appointment date and time
 * @param existingBookings - Array of existing bookings
 * @returns true if attempting duplicate booking, false otherwise
 */
export const isDuplicateBookingAttempt = (
  phone: string,
  staffId: string,
  dateTime: Date,
  existingBookings: Array<{ customer_phone: string; staff_id: string; appointment_time: string; appointment_date: string }>
): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  const dateStr = dateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const timeStr = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM
  
  return existingBookings.some(booking => 
    booking.customer_phone.replace(/\D/g, '') === cleaned &&
    booking.staff_id === staffId &&
    booking.appointment_date === dateStr &&
    booking.appointment_time === timeStr
  );
};

/**
 * Check if slot is already booked by another user
 * @param staffId - Staff member ID
 * @param dateTime - Appointment date and time
 * @param existingBookings - Array of existing bookings
 * @returns true if slot is already taken, false otherwise
 */
export const isSlotAlreadyBooked = (
  staffId: string,
  dateTime: Date,
  existingBookings: Array<{ staff_id: string; appointment_time: string; appointment_date: string; status?: string }>
): boolean => {
  const dateStr = dateTime.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const timeStr = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // HH:MM
  
  return existingBookings.some(booking => 
    booking.staff_id === staffId &&
    booking.appointment_date === dateStr &&
    booking.appointment_time === timeStr &&
    (booking.status === 'pending' || booking.status === 'confirmed' || !booking.status) // Exclude cancelled
  );
};
