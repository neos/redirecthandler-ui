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
            },
            Notification: {
                notice: Function;
                ok: Function;
                error: Function;
                warning: Function;
                info: Function;
            },
        };
    }
}

(() => {
    window.onload = () => {
        const redirectsList: HTMLElement = document.getElementById('redirects-list-app');
        const redirects: Array<Redirect> = JSON.parse(redirectsList.dataset['redirectsJson']);
        const showHitCount: boolean = JSON.parse(redirectsList.dataset['showHitCount'] || 'false');
        const csrfToken: string = redirectsList.dataset['csrfToken'];
        const actions: {
            delete: string;
            create: string;
            update: string;
        } = JSON.parse(redirectsList.dataset['actions']);
        const statusCodes: { [index: string]: string } = JSON.parse(redirectsList.dataset['statusCodes']);
        const validSourceUriPathPattern: string = redirectsList.dataset['validSourceUriPathPattern'];

        let initialTypeFilter = redirectsList.dataset['initialTypeFilter'] || '';
        let initialStatusCodeFilter = parseInt(redirectsList.dataset['initialStatusCodeFilter']);
        if (isNaN(initialStatusCodeFilter)) {
            initialStatusCodeFilter = -1;
        }

        const {I18n, Notification} = window.Typo3Neos;

        /**
         * @param id
         * @param label
         * @param args
         */
        const translate = (id: string, label: string = '', args: Array<any> = []): string => {
            return I18n.translate(id, label, 'Neos.RedirectHandler.Ui', 'Modules', args);
        };

        I18n.addObserver('initialized', () => {
            ReactDOM.render(
                <RedirectList redirects={redirects}
                              csrfToken={csrfToken}
                              actions={actions}
                              showHitCount={showHitCount}
                              translate={translate}
                              statusCodes={statusCodes}
                              validSourceUriPathPattern={validSourceUriPathPattern}
                              notificationHelper={Notification}
                              initialTypeFilter={initialTypeFilter}
                              initialStatusCodeFilter={initialStatusCodeFilter}/>, redirectsList);
        });
    };
})();

