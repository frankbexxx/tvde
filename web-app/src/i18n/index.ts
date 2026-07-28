import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { readStoredLocale } from './localeStorage'

import ptCommon from './locales/pt/common.json'
import ptTrip from './locales/pt/trip.json'
import ptAuth from './locales/pt/auth.json'
import ptSettings from './locales/pt/settings.json'
import ptErrors from './locales/pt/errors.json'
import ptPassenger from './locales/pt/passenger.json'
import ptDriver from './locales/pt/driver.json'
import ptPartner from './locales/pt/partner.json'
import ptAdmin from './locales/pt/admin.json'

import enCommon from './locales/en/common.json'
import enTrip from './locales/en/trip.json'
import enAuth from './locales/en/auth.json'
import enSettings from './locales/en/settings.json'
import enErrors from './locales/en/errors.json'
import enPassenger from './locales/en/passenger.json'
import enDriver from './locales/en/driver.json'
import enPartner from './locales/en/partner.json'
import enAdmin from './locales/en/admin.json'

const resources = {
  pt: {
    common: ptCommon,
    trip: ptTrip,
    auth: ptAuth,
    settings: ptSettings,
    errors: ptErrors,
    passenger: ptPassenger,
    driver: ptDriver,
    partner: ptPartner,
    admin: ptAdmin,
  },
  en: {
    common: enCommon,
    trip: enTrip,
    auth: enAuth,
    settings: enSettings,
    errors: enErrors,
    passenger: enPassenger,
    driver: enDriver,
    partner: enPartner,
    admin: enAdmin,
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: readStoredLocale(),
  fallbackLng: 'pt',
  defaultNS: 'common',
  ns: ['common', 'trip', 'auth', 'settings', 'errors', 'passenger', 'driver', 'partner', 'admin'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18n
