import * as React from 'react';
import { ChangeEvent, PureComponent } from 'react';
import DatePicker from 'react-datepicker';

import { NeosNotification, Redirect } from '../interfaces';
import { DateTimeUtil, UrlUtil, Helpers } from '../util';
import { RedirectContext } from '../providers';
import { Tooltip } from './index';

const MAX_INPUT_LENGTH = 500;

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

    protected sourceUriPathInputRef: React.RefObject<HTMLInputElement>;

    constructor(props: RedirectFormProps) {
        super(props);
        this.state = {
            ...initialState,
            ...props.redirect,
        };

        this.sourceUriPathInputRef = React.createRef();
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

        const { startDateTime, endDateTime, statusCode, sourceUriPath, targetUriPath } = this.state;
        let { host } = this.state;
        const finalStatusCode = statusCode > 0 ? statusCode : defaultStatusCode;

        // Replace a single asterisk with an empty value to match any domain
        host = host && host.trim() === '*' ? '' : host;

        if (!host || host === location.host) {
            const parsedSourceUrl: URL = UrlUtil.parseURL(sourceUriPath, location.origin);
            const parsedTargetUrl: URL = UrlUtil.parseURL(targetUriPath, location.origin);
            if (parsedSourceUrl.pathname === parsedTargetUrl.pathname) {
                notificationHelper.warning(
                    translate('error.sameSourceAndTarget', 'The source and target paths cannot be the same'),
                );
                return;
            }
        }

        const validStartDateTimeString =
            startDateTime.indexOf('T') === -1 ? startDateTime.replace(' ', 'T') + 'Z' : startDateTime;
        const validStartDateTime = startDateTime ? new Date(validStartDateTimeString) : null;
        const validEndDateTimeString =
            endDateTime.indexOf('T') === -1 ? endDateTime.replace(' ', 'T') + 'Z' : endDateTime;
        const validEndDateTime = endDateTime ? new Date(validEndDateTimeString) : null;

        const data = {
            __csrfToken: csrfToken,
            moduleArguments: {
                originalHost: redirect ? redirect.host : null,
                originalSourceUriPath: redirect ? redirect.sourceUriPath : null,
                ...this.state,
                host,
                targetUriPath: Helpers.statusCodeSupportsTarget(finalStatusCode) ? targetUriPath : '/',
                startDateTime: validStartDateTime ? DateTimeUtil.formatW3CString(validStartDateTime) : null,
                endDateTime: validEndDateTime ? DateTimeUtil.formatW3CString(validEndDateTime) : null,
            },
        };

        this.setState({ isSendingData: true });

        this.postRedirect(redirect ? actions.update : actions.create, data)
            .then(data => {
                const { messages, changedRedirects } = data;

                // Depending on whether an existing redirect was edited handle the list of changes but keep the original
                if (redirect) {
                    handleUpdatedRedirect(changedRedirects.slice(), redirect);
                } else {
                    handleNewRedirect(changedRedirects.slice());

                    // Reset form when a redirect was created but not when it was just updated
                    this.setState({
                        ...initialState,
                        statusCode: this.state.statusCode,
                        isSendingData: false,
                    });

                    this.sourceUriPathInputRef.current.focus();
                }

                if (changedRedirects.length > 1) {
                    const changeList = this.renderChangedRedirects(changedRedirects);
                    notificationHelper.warning(translate('message.updatedRedirects', 'Changed redirects'), changeList);
                }
                messages.forEach(({ title, message, severity }) => {
                    notificationHelper[severity.toLowerCase()](title || message, message);
                });
            })
            .catch(() => {
                this.setState({
                    isSendingData: false,
                });
            });
    };

    private postRedirect = (path: string, body?: any): Promise<any> => {
        const { notificationHelper } = this.props;

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
                data.messages.forEach(({ title, message, severity }) => {
                    notificationHelper[severity.toLowerCase()](title || message, message);
                });
                throw new Error();
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
        const formattedValue =
            typeof datetime === 'string' ? datetime : datetime ? DateTimeUtil.formatReadable(datetime) : '';
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
        // We need to modify the format to make it valid for all browsers (Safari, Firefox, etc...)
        const validDateTimeString =
            dateTimeString.indexOf('T') === -1 ? dateTimeString.replace(' ', 'T') + 'Z' : dateTimeString;
        const dateTime = dateTimeString ? new Date(validDateTimeString) : null;

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
                            {activeHelpMessage === 'sourceUriPath' && (
                                <Tooltip
                                    caption={translate('sourceUriPath.help', 'Explanation of the source path')}
                                    onClick={() => this.toggleHelpMessage(sourceUriPath)}
                                />
                            )}
                        </label>
                        <input
                            name="sourceUriPath"
                            id={idPrefix + 'sourceUriPath'}
                            ref={this.sourceUriPathInputRef}
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
                </div>
                <div className="row">
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
                    {Helpers.statusCodeSupportsTarget(statusCode) && (
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
                </div>
                <div className="row">
                    <div className="neos-control-group neos-control-group--half">
                        <label className="neos-control-label">{translate('startDateTime', 'Start date')}</label>
                        {this.renderDatePicker(
                            'startDateTime',
                            startDateTime,
                            translate('startDateTime.placeholder', 'Enter start date'),
                        )}
                    </div>
                    <div className="neos-control-group neos-control-group--half">
                        <label className="neos-control-label">{translate('endDateTime', 'End date')}</label>
                        {this.renderDatePicker(
                            'endDateTime',
                            endDateTime,
                            translate('endDateTime.placeholder', 'Enter end date'),
                        )}
                    </div>
                    <div className="neos-control-group">
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
                </div>
                <div className="row row--actions">
                    {handleCancelAction && (
                        <div className="neos-control-group">
                            <a
                                role="button"
                                className="neos-button add-redirect-form__cancel"
                                onClick={() => handleCancelAction()}
                            >
                                {translate('action.cancel', 'Cancel')}
                            </a>
                        </div>
                    )}
                    <div className="neos-control-group">
                        <button type="submit" disabled={isSendingData} className="neos-button neos-button-primary">
                            {redirect
                                ? translate('action.update', 'Update redirect')
                                : translate('action.create', 'Add redirect')}
                        </button>
                    </div>
                </div>
            </form>
        );
    }
}
