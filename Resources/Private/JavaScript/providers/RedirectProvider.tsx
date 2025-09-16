import React, { useContext, createContext } from 'react';

type RedirectContextInterface = {
    statusCodes: { [index: string]: string };
    hostOptions: string[];
    csrfToken: string;
    defaultStatusCode: number;
};

export const RedirectContext = createContext({} as RedirectContextInterface);
export const useRedirects = () => useContext(RedirectContext);

export const RedirectProvider = ({ value, children }: { value: RedirectContextInterface; children: any }) => {
    return <RedirectContext.Provider value={value}>{children}</RedirectContext.Provider>;
};
