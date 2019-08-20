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

window.onload = (): void => {
    const redirectsList: HTMLElement = document.getElementById('redirects-list-app');
    const redirects: Array<Redirect> = JSON.parse(redirectsList.dataset.redirectsJson);
    const showHitCount: boolean = JSON.parse(redirectsList.dataset.showHitCount || 'false');
    const {csrfToken} = redirectsList.dataset;
    const actions: {
        delete: string;
        create: string;
        update: string;
    } = JSON.parse(redirectsList.dataset.actions);
    const statusCodes: { [index: string]: string } = JSON.parse(redirectsList.dataset.statusCodes);
    const {validSourceUriPathPattern} = redirectsList.dataset;

    const initialTypeFilter = redirectsList.dataset.initialTypeFilter || '';
    let initialStatusCodeFilter = parseInt(redirectsList.dataset.initialStatusCodeFilter, 10);
    if (isNaN(initialStatusCodeFilter)) {
        initialStatusCodeFilter = -1;
    }

    // The global Neos api might not be available yet, when this script is run
    const loadNeosApi = (callback: Function): void => {
        if (window.Typo3Neos) {
            callback();
        } else {
            window.setTimeout(() => loadNeosApi(callback), 50);
        }
    };

    loadNeosApi(() => {
        const {I18n, Notification} = window.Typo3Neos;

        /**
         * @param id
         * @param label
         * @param args
         */
        const translate = (id: string, label = '', args: Array<any> = []): string => {
            return I18n.translate(id, label, 'Neos.RedirectHandler.Ui', 'Modules', args);
        };

        const renderApp = (): void => {
            ReactDOM.render(
                <RedirectList
                    redirects={redirects}
                    csrfToken={csrfToken}
                    actions={actions}
                    showHitCount={showHitCount}
                    translate={translate}
                    statusCodes={statusCodes}
                    validSourceUriPathPattern={validSourceUriPathPattern}
                    notificationHelper={Notification}
                    initialTypeFilter={initialTypeFilter}
                    initialStatusCodeFilter={initialStatusCodeFilter}/>, redirectsList);
        };

        if (I18n.initialized) {
            renderApp();
        } else {
            I18n.addObserver('initialized', renderApp);
        }
    });
};

