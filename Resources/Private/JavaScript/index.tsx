import React from 'react';
import ReactDOM from 'react-dom';

import { RedirectList } from './components';
import { RedirectProvider, IntlProvider } from './providers';

import '../Styles/styles.scss';

window.addEventListener('load', async (): Promise<void> => {
    let NeosAPI = window.NeosCMS;

    while (!NeosAPI || !NeosAPI.I18n || !NeosAPI.I18n.initialized) {
        NeosAPI = window.NeosCMS;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const redirectsList: HTMLElement = document.getElementById('redirects-list-app');
    const redirectsData: HTMLElement = document.getElementById('redirects-list-data');

    if (!redirectsList || !redirectsData) {
        return;
    }

    const redirects: Redirect[] = JSON.parse(redirectsData.innerText);
    const showHitCount: boolean = JSON.parse(redirectsList.dataset.showHitCount || 'false');
    const actions: Endpoints = JSON.parse(redirectsList.dataset.actions);
    const statusCodes: { [index: string]: string } = JSON.parse(redirectsList.dataset.statusCodes);
    const hostOptions: string[] = JSON.parse(redirectsList.dataset.hostOptions);

    const { csrfToken, validSourceUriPathPattern } = redirectsList.dataset;

    const initialTypeFilter = redirectsList.dataset.initialTypeFilter || '';
    const defaultStatusCode = parseInt(redirectsList.dataset.defaultStatusCode, 10);
    let initialStatusCodeFilter = parseInt(redirectsList.dataset.initialStatusCodeFilter, 10);
    if (isNaN(initialStatusCodeFilter)) {
        initialStatusCodeFilter = -1;
    }

    const { I18n, Notification } = NeosAPI;

    const translate = (id: string, label = '', args = []): string => {
        return I18n.translate(id, label, 'Neos.RedirectHandler.Ui', 'Modules', args);
    };

    ReactDOM.render(
        <RedirectProvider value={{ hostOptions, statusCodes, csrfToken, defaultStatusCode }}>
            <IntlProvider translate={translate}>
                <RedirectList
                    redirects={redirects}
                    actions={actions}
                    translate={translate}
                    showHitCount={showHitCount}
                    validSourceUriPathPattern={validSourceUriPathPattern}
                    notificationHelper={Notification}
                    initialTypeFilter={initialTypeFilter}
                    initialStatusCodeFilter={initialStatusCodeFilter}
                />
            </IntlProvider>
        </RedirectProvider>,
        redirectsList,
    );
}, true);
