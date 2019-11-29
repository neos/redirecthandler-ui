import * as React from 'react';
import { ChangeEvent, PureComponent } from 'react';
import DatePicker from 'react-datepicker';
import Redirect from '../interfaces/Redirect';
import NeosNotification from '../interfaces/NeosNotification';
import { formatReadable, formatW3CString } from '../util/datetime';
import { parseURL } from '../util/url';
import { statusCodeSupportsTarget } from '../util/helpers';
import { RedirectContext } from '../providers/RedirectProvider';

const MAX_INPUT_LENGTH = 255;

export interface RedirectFormProps {
    translate: (id: string, label: string, args?: any[]) => string;
    notificationHelper: NeosNotification;
    actions: {
        create: string;
        update: string;
    };
    redirect: Redirect;
    idPrefix: string;
    validSourceUriPathPattern: string;
    handleNewRedirect: (changedRedirects: Redirect[]) => void;
    handleUpdatedRedirect: (changedRedirects: Redirect[], oldRedirect: Redirect) => void;
    handleCancelAction: () => void;
}

export interface RedirectFormState {
    [index: string]: any;

    host: string;
    sourceUriPath: string;
    targetUriPath: string;
    statusCode: number;
    startDateTime: string;
    endDateTime: string;
    comment: string;
    isSendingData: boolean;
    activeHelpMessage: string;
}

const initialState: RedirectFormState = {
    host: '',
    sourceUriPath: '',
    targetUriPath: '',
    statusCode: -1,
    startDateTime: '',
    endDateTime: '',
    comment: '',
    isSendingData: false,
    activeHelpMessage: '',
};

export class RedirectForm extends PureComponent<RedirectFormProps, RedirectFormState> {
    static contextType = RedirectContext;

    constructor(props: RedirectFormProps) {
        super(props);
        this.state = {
            ...initialState,
            ...props.redirect,
        };
    }

    public componentDidMount(): void {
        // Context cannot be accessed in the constructor therefore set the default here is necessary
        if (this.state.statusCode === -1) {
            this.setState({ statusCode: this.context.defaultStatusCode });
        }
    }

    /**
     * Edits an existing redirect or creates a new one
     *
     * @param event
     */
    private handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const {
            redirect,
            notificationHelper,
            actions,
            handleNewRedirect,
            handleUpdatedRedirect,
            translate,
        } = this.props;

        const { csrfToken, defaultStatusCode } = this.context;

        const { startDateTime, endDateTime, host, statusCode, sourceUriPath, targetUriPath } = this.state;
        const finalStatusCode = statusCode > 0 ? statusCode : defaultStatusCode;

        if (!host || host === location.host) {
            const parsedSourceUrl: URL = parseURL(sourceUriPath, location.origin);
            const parsedTargetUrl: URL = parseURL(targetUriPath, location.origin);
            if (parsedSourceUrl.pathname === parsedTargetUrl.pathname) {
                notificationHelper.warning(
                    translate('error.sameSourceAndTarget', 'The source and target paths cannot be the same'),
                );
                return;
            }
        }

        const data = {
            __csrfToken: csrfToken,
            moduleArguments: {
                originalHost: redirect ? redirect.host : null,
                originalSourceUriPath: redirect ? redirect.sourceUriPath : null,
                ...this.state,
                targetUriPath: statusCodeSupportsTarget(finalStatusCode) ? targetUriPath : '/',
                startDateTime: startDateTime ? formatW3CString(new Date(startDateTime)) : null,
                endDateTime: endDateTime ? formatW3CString(new Date(endDateTime)) : null,
            },
        };

        this.setState({ isSendingData: true });

        this.postRedirect(redirect ? actions.update : actions.create, data)
            .then(data => {
                const { message, changedRedirects } = data;

                // Depending on whether an existing redirect was edited handle the list of changes but keep the original
                if (redirect) {
                    handleUpdatedRedirect(changedRedirects.slice(), redirect);
                } else {
                    handleNewRedirect(changedRedirects.slice());

                    // Reset form when a redirect was created but not when it was just updated
                    this.setState({
                        ...initialState,
                        statusCode: defaultStatusCode,
                        ...redirect,
                        isSendingData: false,
                    });
                }

                if (changedRedirects.length > 1) {
                    const changeList = this.renderChangedRedirects(changedRedirects);
                    notificationHelper.warning(message, changeList);
                } else {
                    notificationHelper.ok(message);
                }
            })
            .catch(error => {
                notificationHelper.error(error);
                this.setState({
                    isSendingData: false,
                });
            });
    };

    private postRedirect = (path: string, body?: any): Promise<any> => {
        return fetch(path, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: body && JSON.stringify(body),
        })
            .then(res => res.json())
            .then(async data => {
                if (data.success) {
                    return data;
                }
                throw new Error(data.message);
            });
    };

    /**
     * Stores any change to the form in the state
     *
     * @param event
     */
    private handleInputChange = (event: ChangeEvent): void => {
        const target: HTMLInputElement = event.target as HTMLInputElement;
        const { name, value } = target;
        this.setState({
            [name]: value.substring(0, MAX_INPUT_LENGTH),
        });
    };

    /**
     * Stores changes to datetime fields in the state
     *
     * @param property
     * @param datetime
     */
    private handleDatePickerChange(property: string, datetime: Date | string): void {
        const formattedValue = typeof datetime === 'string' ? datetime : datetime ? formatReadable(datetime) : '';
        this.setState({
            [property]: formattedValue,
        });
    }

    /**
     * Renders a datepicker
     *
     * @param property
     * @param dateTimeString
     * @param placeholder
     */
    private renderDatePicker = (property: string, dateTimeString: string, placeholder: string): React.ReactElement => {
        const { translate } = this.props;
        const dateTime = dateTimeString ? new Date(dateTimeString) : null;

        return (
            <DatePicker
                dateFormat="yyyy-MM-dd HH:mm"
                timeFormat="HH:mm"
                showTimeSelect={true}
                minDate={new Date()}
                timeIntervals={15}
                todayButton={translate('datepicker.today', 'Today')}
                placeholderText={placeholder}
                selected={dateTime}
                timeCaption={translate('datepicker.time', 'Time')}
                onChange={value => this.handleDatePickerChange(property, value)}
            />
        );
    };

    /**
     * Renders list of changed redirects to be used in a flash message
     *
     * @param changedRedirects
     */
    private renderChangedRedirects = (changedRedirects: Redirect[]): string => {
        const { translate } = this.props;
        return `
            <p>${translate('message.relatedChanges', 'Related changes')}</p>
            <ul>
                ${changedRedirects
                    .map(
                        redirect =>
                            `<li>${redirect.host || ''}/${redirect.sourceUriPath}&rarr;${redirect.targetUriPath}</li>`,
                    )
                    .join('')}
            </ul>`;
    };

    /**
     * Sets a help message active
     *
     * @param identifier
     */
    private toggleHelpMessage = (identifier: string): void => {
        const { activeHelpMessage } = this.state;
        this.setState({ activeHelpMessage: activeHelpMessage === identifier ? '' : identifier });
    };

    /**
     * Renders a tooltip with the given caption and it will close when clicked
     *
     * @param identifier
     * @param caption
     */
    private renderTooltip = (identifier: string, caption: string): React.ReactElement => {
        return (
            <div role="tooltip" onClick={() => this.toggleHelpMessage(identifier)} className="redirect-tooltip">
                {caption}
            </div>
        );
    };

    public render(): React.ReactElement {
        const { translate, redirect, idPrefix, validSourceUriPathPattern, handleCancelAction } = this.props;

        const { statusCodes, hostOptions } = this.context;

        const {
            host,
            sourceUriPath,
            targetUriPath,
            statusCode,
            startDateTime,
            endDateTime,
            comment,
            isSendingData,
            activeHelpMessage,
        } = this.state;

        return (
            <form onSubmit={e => this.handleSubmit(e)} className="add-redirect-form">
                <div className="row">
                    <div className="neos-control-group">
                        <label className="neos-control-label" htmlFor={idPrefix + 'host'}>
                            {translate('host', 'Host')}
                        </label>
                        <input
                            name="host"
                            id={idPrefix + 'host'}
                            type="text"
                            list="redirect-hosts"
                            placeholder="www.example.org"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            value={host || ''}
                            onChange={this.handleInputChange}
                        />
                        {hostOptions && (
                            <datalist id="redirect-hosts">
                                {hostOptions.map((hostOption: string) => (
                                    <option key={hostOption} value={hostOption}>
                                        {hostOption}
                                    </option>
                                ))}
                            </datalist>
                        )}
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label" htmlFor={idPrefix + 'sourceUriPath'}>
                            {translate('sourceUriPath', 'Source path')}*{' '}
                            <i
                                role="button"
                                className={'fas fa-question-circle'}
                                onClick={() => this.toggleHelpMessage('sourceUriPath')}
                            />
                            {activeHelpMessage === 'sourceUriPath' &&
                                this.renderTooltip(
                                    sourceUriPath,
                                    translate('sourceUriPath.help', 'Explanation of the source path'),
                                )}
                        </label>
                        <input
                            name="sourceUriPath"
                            id={idPrefix + 'sourceUriPath'}
                            type="text"
                            title={validSourceUriPathPattern}
                            onChange={this.handleInputChange}
                            autoFocus={true}
                            required={true}
                            placeholder="the-old-url/product-a"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            pattern={validSourceUriPathPattern}
                            value={sourceUriPath || ''}
                        />
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label" htmlFor={idPrefix + 'statusCode'}>
                            {translate('statusCode', 'Code')}
                        </label>
                        <select
                            name="statusCode"
                            id={idPrefix + 'statusCode'}
                            value={statusCode}
                            onChange={this.handleInputChange}
                        >
                            {Object.keys(statusCodes).map(code => (
                                <option
                                    value={code}
                                    key={code}
                                    title={
                                        statusCodes[code] === 'i18n'
                                            ? translate('statusCodes.' + code + '.tooltip', code)
                                            : statusCodes[code]
                                    }
                                >
                                    {statusCodes[code] === 'i18n'
                                        ? translate('statusCodes.' + code + '.label', code)
                                        : statusCodes[code]}
                                </option>
                            ))}
                        </select>
                    </div>
                    {statusCodeSupportsTarget(statusCode) && (
                        <div className="neos-control-group">
                            <label className="neos-control-label" htmlFor={idPrefix + 'targetUriPath'}>
                                {translate('targetUriPath', 'Target uri or path')}*
                            </label>
                            <input
                                name="targetUriPath"
                                id={idPrefix + 'targetUriPath'}
                                type="text"
                                required={true}
                                placeholder="(https://)the-new-url/product-a"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck={false}
                                value={targetUriPath || ''}
                                onChange={this.handleInputChange}
                            />
                        </div>
                    )}
                    <div className="neos-control-group">
                        <label className="neos-control-label">{translate('startDateTime', 'Start date')}</label>
                        {this.renderDatePicker(
                            'startDateTime',
                            startDateTime,
                            translate('startDateTime.placeholder', 'Enter start date'),
                        )}
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label">{translate('endDateTime', 'End date')}</label>
                        {this.renderDatePicker(
                            'endDateTime',
                            endDateTime,
                            translate('endDateTime.placeholder', 'Enter end date'),
                        )}
                    </div>
                    <div className="neos-control-group neos-control-group--large">
                        <label className="neos-control-label" htmlFor={idPrefix + 'comment'}>
                            {translate('comment', 'Comment')}
                        </label>
                        <div className="textarea-wrap">
                            <textarea
                                name="comment"
                                id={idPrefix + 'comment'}
                                value={comment || ''}
                                placeholder={translate('comment.placeholder', 'Enter comment')}
                                rows={4}
                                onChange={this.handleInputChange}
                            />
                        </div>
                    </div>
                    <div className="neos-control-group neos-control-group--auto">
                        <button type="submit" disabled={isSendingData} className="neos-button neos-button-primary">
                            {redirect
                                ? translate('action.update', 'Update redirect')
                                : translate('action.create', 'Add redirect')}
                        </button>
                    </div>
                    {redirect && (
                        <div className="neos-control-group neos-control-group--auto">
                            <a
                                role="button"
                                className="neos-button add-redirect-form__cancel"
                                onClick={() => handleCancelAction()}
                            >
                                {translate('action.cancel', 'Cancel')}
                            </a>
                        </div>
                    )}
                </div>
            </form>
        );
    }
}
