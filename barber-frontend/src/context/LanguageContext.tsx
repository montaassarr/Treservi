import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'fr' | 'tn';

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  en: {
    dashboard: 'Dashboard',
    appointments: 'Appointments',
    staff: 'Staff',
    services: 'Services',
    income: 'Income',
    notifications: 'Notifications',
    logout: 'Logout',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    welcome: 'Welcome Back',
    todayClients: "Today's Clients",
    todayEarnings: "Today's Earnings",
    totalCompleted: 'Total Completed',
    totalEarnings: 'Total Earnings',
    quickAddWalkin: 'Quick Add Walk-In',
    todaySchedule: "Today's Schedule",
    bookingAnalytics: 'Booking Analytics',
    noAppointments: 'No appointments today',
    addWalkIn: 'Add a walk-in client to get started',
    totalBookings: 'Total Bookings',
    todayRevenue: "Today's Revenue",
    newCustomers: 'new customers today!',
    topBarbers: 'Top Barbers',
    growth: 'Growth',
    comments: 'Comments',
    upcomingAppointments: 'Upcoming Appointments',
    newAppointment: 'New Appointment',
    viewAll: 'View all',
    customer: 'Customer',
    service: 'Service',
    time: 'Time',
    status: 'Status',
    amount: 'Amount',
    actions: 'Actions',
    confirmed: 'Confirmed',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    markCompleted: 'Mark as Completed',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    save: 'Save',
    close: 'Close',
    language: 'Language',
    english: 'English',
    french: 'Français',
    tunisian: 'Darija',
  },
  fr: {
    dashboard: 'Tableau de Bord',
    appointments: 'Rendez-vous',
    staff: 'Personnel',
    services: 'Services',
    income: 'Revenus',
    notifications: 'Notifications',
    logout: 'Déconnexion',
    darkMode: 'Mode Sombre',
    lightMode: 'Mode Clair',
    welcome: 'Bienvenue',
    todayClients: 'Clients Aujourd\'hui',
    todayEarnings: 'Revenus Aujourd\'hui',
    totalCompleted: 'Total Complété',
    totalEarnings: 'Revenus Totaux',
    quickAddWalkin: 'Ajouter un Client Direct',
    todaySchedule: 'Emploi du Jour',
    bookingAnalytics: 'Analyse des Réservations',
    noAppointments: 'Aucun rendez-vous aujourd\'hui',
    addWalkIn: 'Ajoutez un client direct pour commencer',
    totalBookings: 'Total des Réservations',
    todayRevenue: 'Revenus Aujourd\'hui',
    newCustomers: 'nouveaux clients aujourd\'hui!',
    topBarbers: 'Meilleurs Barbiers',
    growth: 'Croissance',
    comments: 'Commentaires',
    upcomingAppointments: 'Rendez-vous à Venir',
    newAppointment: 'Nouveau Rendez-vous',
    viewAll: 'Voir tout',
    customer: 'Client',
    service: 'Service',
    time: 'Heure',
    status: 'Statut',
    amount: 'Montant',
    actions: 'Actions',
    confirmed: 'Confirmé',
    pending: 'En Attente',
    completed: 'Complété',
    cancelled: 'Annulé',
    markCompleted: 'Marquer comme Complété',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    save: 'Enregistrer',
    close: 'Fermer',
    language: 'Langue',
    english: 'English',
    french: 'Français',
    tunisian: 'Darija',
  },
  tn: {
    dashboard: 'Dashboard',
    appointments: 'Rendez-vous',
    staff: 'Staff',
    services: 'Services',
    income: 'Dkhol',
    notifications: 'Notifications',
    logout: 'Logout',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    welcome: 'Sláma Alikon',
    todayClients: 'Clients Lyoum',
    todayEarnings: 'Dkhol Lyoum',
    totalCompleted: 'Total Kammla',
    totalEarnings: 'Dkhol Kammel',
    quickAddWalkin: 'Add Walk-In',
    todaySchedule: 'Schedule Lyoum',
    bookingAnalytics: 'Booking Analytics',
    noAppointments: 'Wech Appointments Lyoum',
    addWalkIn: 'Add walk-in client',
    totalBookings: 'Total Bookings',
    todayRevenue: 'Revenue Lyoum',
    newCustomers: 'customers eljaoua!',
    topBarbers: 'Top Barbers',
    growth: 'Growth',
    comments: 'Comments',
    upcomingAppointments: 'Rendez-vous Jey',
    newAppointment: 'Rendez-vous Jadid',
    viewAll: 'View all',
    customer: 'Customer',
    service: 'Service',
    time: 'Wakt',
    status: 'Status',
    amount: 'Mtaa',
    actions: 'Actions',
    confirmed: 'Confirmed',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    markCompleted: 'Mark as Completed',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    save: 'Save',
    close: 'Close',
    language: 'Language',
    english: 'English',
    french: 'Français',
    tunisian: 'Darija',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language | null;
    return saved || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
