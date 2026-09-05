"use client";

import React, { createContext, useContext, useState } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  toggleCurrency: () => void;
  formatPrice: (amountInINR: number, forceDecimals?: boolean) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Fixed exchange rate for demonstration
const EXCHANGE_RATE_INR_TO_USD = 83.05;

// Clean number mapping for specific marketing tiers
const PRICE_MAP: Record<number, number> = {
  4900: 59,
  9900: 120,
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === 'undefined') return 'INR';
    const saved = localStorage.getItem('shakti_currency');
    return saved === 'INR' || saved === 'USD' ? saved : 'INR';
  });

  const toggleCurrency = () => {
    setCurrency(prev => {
      const next = prev === 'INR' ? 'USD' : 'INR';
      localStorage.setItem('shakti_currency', next);
      return next;
    });
  };

  const formatPrice = (amountInINR: number, forceDecimals: boolean = false) => {
    if (currency === 'INR') {
      // Format as INR
      const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: forceDecimals ? 2 : 0,
        maximumFractionDigits: forceDecimals ? 2 : 0,
      });
      return formatter.format(amountInINR);
    } else {
      // Format as USD
      let usdAmount = amountInINR / EXCHANGE_RATE_INR_TO_USD;
      
      // Use clean mapping if exact match
      if (PRICE_MAP[amountInINR]) {
        usdAmount = PRICE_MAP[amountInINR];
      }

      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: forceDecimals || (!PRICE_MAP[amountInINR] && !Number.isInteger(usdAmount)) ? 2 : 0,
        maximumFractionDigits: forceDecimals || (!PRICE_MAP[amountInINR] && !Number.isInteger(usdAmount)) ? 2 : 0,
      });
      return formatter.format(usdAmount);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, toggleCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
