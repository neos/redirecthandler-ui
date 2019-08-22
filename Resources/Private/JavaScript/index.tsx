import * as React from 'react';
import * as ReactDOM from 'react-dom';

import {RedirectList} from './components/RedirectList';
import Redirect from './interfaces/Redirect';

import '../Styles/styles.scss';

// Declare interface for Neos backend API
declare global {
    interface Window {
        Typo3Neos: {
            I18n: {
                translate: Function;
                addObserver: Function;
                initialized: boolean;
            };
            Notification: {
                notice: Function;
                ok: Function;
                error: Function;
                warning: Function;
                info: Function;
            };
        };
    }
}

window.onload = async (): Promise<void> => {
    while (!window.Typo3Neos || !window.Typo3Neos.I18n.initialized) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    const redirectsList: HTMLElement = document.getElementById('redirects-list-app');

    if (!redirectsList) {
        return;
    }

    const redirects: Array<Redirect> = JSON.parse(redirectsList.dataset.redirectsJson);
    const showHitCount: boolean = JSON.parse(redirectsList.dataset.showHitCount || 'false');
    const actions: {
        delete: string;
        create: string;
        update: string;
    } = JSON.parse(redirectsList.dataset.actions);
    const statusCodes: { [index: string]: string } = JSON.parse(redirectsList.dataset.statusCodes);

    const {
        csrfToken,
        validSourceUriPathPattern
    } = redirectsList.dataset;

    const initialTypeFilter = redirectsList.dataset.initialTypeFilter || '';
    const defaultStatusCode = parseInt(redirectsList.dataset.defaultStatusCode, 10);
    let initialStatusCodeFilter = parseInt(redirectsList.dataset.initialStatusCodeFilter, 10);
    if (isNaN(initialStatusCodeFilter)) {
        initialStatusCodeFilter = -1;
    }

    const {I18n, Notification} = window.Typo3Neos;

    /**
     * @param id
     * @param label
     * @param args
     */
    const translate = (id: string, label = '', args: Array<any> = []): string => {
        return I18n.translate(id, label, 'Neos.RedirectHandler.Ui', 'Modules', args);
    };

    ReactDOM.render(
        <RedirectList
            redirects={redirects}
            csrfToken={csrfToken}
            actions={actions}
            showHitCount={showHitCount}
            translate={translate}
            defaultStatusCode={defaultStatusCode}
            statusCodes={statusCodes}
            validSourceUriPathPattern={validSourceUriPathPattern}
            notificationHelper={Notification}
            initialTypeFilter={initialTypeFilter}
            initialStatusCodeFilter={initialStatusCodeFilter}/>, redirectsList);
};

