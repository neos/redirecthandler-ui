import React from 'react';
import { createContext, useContext } from 'react';

type ProviderProps = {
    children: React.ReactElement;
    translate: (id: string, fallback?: string, parameters?: any[]) => string;
};

type ProviderValues = {
    translate: (id: string, fallback?: string, parameters?: any[]) => string;
};

export const IntlContext = createContext(null);
export const useIntl = (): ProviderValues => useContext(IntlContext);

export function IntlProvider({ children, translate }: ProviderProps) {
    return <IntlContext.Provider value={{ translate }}>{children}</IntlContext.Provider>;
}
