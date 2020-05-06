import * as React from 'react';
import { useContext, createContext } from 'react';

export interface RedirectContextInterface {
    statusCodes: { [index: string]: string };
    hostOptions: string[];
    csrfToken: string;
    defaultStatusCode: number;
}

export const RedirectContext = createContext({});
export const useRedirects = () => useContext(RedirectContext);

export const RedirectProvider = ({ value, children }: { value: RedirectContextInterface; children: any }) => {
    return <RedirectContext.Provider value={value}>{children}</RedirectContext.Provider>;
};
