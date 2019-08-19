import * as React from 'react';
import {ChangeEvent, PureComponent} from 'react';
import DatePicker from 'react-datepicker';
import Redirect from '../interfaces/Redirect';
import NeosNotification from '../interfaces/NeosNotification';
import {formatReadable, formatW3CString} from '../util/datetime';

const MAX_INPUT_LENGTH = 255;

export interface RedirectFormProps {
    translate: Function;
    notificationHelper: NeosNotification;
    csrfToken: string;
    actions: {
        create: string;
        update: string;
    }
    redirect: Redirect;
    idPrefix: string;
    statusCodes: { [index: string]: string };
    validSourceUriPathPattern: string;
    defaultStatusCode: number;
    handleNewRedirect: Function;
    handleUpdatedRedirect: Function;
    handleCancelAction: Function;
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
};

export class RedirectForm extends PureComponent<RedirectFormProps, RedirectFormState> {

    constructor(props: RedirectFormProps) {
        super(props);
        this.state = {
            ...initialState,
            statusCode: props.defaultStatusCode,
            ...props.redirect,
        };
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
            csrfToken,
            notificationHelper,
            actions,
            handleNewRedirect,
            handleUpdatedRedirect,
            defaultStatusCode,
        } = this.props;

        const {
            startDateTime,
            endDateTime,
        } = this.state;

        const data = {
            '__csrfToken': csrfToken,
            moduleArguments: {
                originalHost: redirect ? redirect.host : null,
                originalSourceUriPath: redirect ? redirect.sourceUriPath : null,
                ...this.state,
                startDateTime: startDateTime ? formatW3CString(new Date(startDateTime)) : null,
                endDateTime: endDateTime ? formatW3CString(new Date(endDateTime)) : null,
            }
        };

        this.setState({isSendingData: true});

        fetch(redirect ? actions.update : actions.create, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify(data),
            }
        )
            .then(response => response.json())
            .then(data => {
                const {success, message, changedRedirects} = data;

                if (success) {
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
                } else {
                    notificationHelper.error(message);
                }
            }).catch(error => {
                notificationHelper.error(error);
            }
        );
    };

    /**
     * Stores any change to the form in the state
     *
     * @param event
     */
    handleInputChange = (event: ChangeEvent): void => {
        const target: HTMLInputElement = event.target as HTMLInputElement;
        const {name, value} = target;
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
    private handleDatePickerChange(property: string, datetime: Date | string) {
        const formattedValue = typeof datetime === 'string' ? datetime : formatReadable(datetime);
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
    private renderDatePicker = (property: string, dateTimeString: string, placeholder: string) => {
        const {translate} = this.props;
        const dateTime = dateTimeString ? new Date(dateTimeString) : null;

        return (
            <DatePicker
                dateFormat="yyyy-MM-dd HH:mm"
                timeFormat="HH:mm"
                showTimeSelect
                timeIntervals={15}
                todayButton={translate('datepicker.today', 'Today')}
                placeholderText={placeholder}
                selected={dateTime}
                timeCaption={translate('datepicker.time', 'Time')}
                onChange={(value) => this.handleDatePickerChange(property, value)}/>
        );
    };

    /**
     * Renders list of changed redirects to be used in a flash message
     *
     * @param changedRedirects
     */
    private renderChangedRedirects = (changedRedirects: Array<Redirect>): string => {
        const {translate} = this.props;
        return (
            '<p>' + translate('message.relatedChanges', 'Related changes') + '</p>' +
            '<ul>' +
            changedRedirects.map((redirect, index) => (
                '<li>' + (redirect.host || '') + '/' + redirect.sourceUriPath + '&rarr;' + redirect.targetUriPath + '</li>'
            )).join('') +
            '</ul>'
        );
    };

    render() {
        const {
            translate,
            redirect,
            statusCodes,
            idPrefix,
            validSourceUriPathPattern,
            handleCancelAction,
        } = this.props;

        const {
            host,
            sourceUriPath,
            targetUriPath,
            statusCode,
            startDateTime,
            endDateTime,
            comment,
            isSendingData,
        } = this.state;

        return (
            <form onSubmit={e => this.handleSubmit(e)} className="add-redirect-form">
                <div className="row">
                    <div className="neos-control-group">
                        <label className="neos-control-label" htmlFor={idPrefix + 'host'}>{translate('host')}</label>
                        <input name="host" id={idPrefix + 'host'} type="text"
                               placeholder="www.example.org" value={host || ''} onChange={this.handleInputChange}/>
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label"
                               htmlFor={idPrefix + 'sourceUriPath'}>{translate('sourceUriPath')}*</label>
                        <input name="sourceUriPath" id={idPrefix + 'sourceUriPath'} type="text"
                               title={validSourceUriPathPattern} onChange={this.handleInputChange}
                               autoFocus={true} required={true} placeholder="the-old-url/product-a"
                               pattern={validSourceUriPathPattern} value={sourceUriPath || ''}/>
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label"
                               htmlFor={idPrefix + 'statusCode'}>{translate('statusCode')}</label>
                        <select name="statusCode" id={idPrefix + 'statusCode'} value={statusCode}
                                onChange={this.handleInputChange}>
                            {Object.keys(statusCodes).map((code) => (
                                <option value={code} key={code}
                                        title={statusCodes[code] != 'i18n' ? statusCodes[code] : translate('statusCodes.' + code + '.tooltip')}>
                                    {statusCodes[code] != 'i18n' ? statusCodes[code] : translate('statusCodes.' + code + '.label')}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label"
                               htmlFor={idPrefix + 'targetUriPath'}>{translate('targetUriPath')}*</label>
                        <input name="targetUriPath" id={idPrefix + 'targetUriPath'} type="text"
                               required={true} placeholder="(https://)the-new-url/product-a"
                               value={targetUriPath || ''} onChange={this.handleInputChange}/>
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label">{translate('startDateTime')}</label>
                        {this.renderDatePicker('startDateTime', startDateTime, translate('startDateTime.placeholder'))}
                    </div>
                    <div className="neos-control-group">
                        <label className="neos-control-label">{translate('endDateTime')}</label>
                        {this.renderDatePicker('endDateTime', endDateTime, translate('endDateTime.placeholder'))}
                    </div>
                    <div className="neos-control-group neos-control-group--large">
                        <label className="neos-control-label"
                               htmlFor={idPrefix + 'comment'}>{translate('comment')}</label>
                        <div className="textarea-wrap">
                            <textarea name="comment" id={idPrefix + 'comment'} value={comment || ''}
                                      placeholder={translate('comment.placeholder')} rows={4}
                                      onChange={this.handleInputChange}>
                            </textarea>
                        </div>
                    </div>
                    <div className="neos-control-group neos-control-group--auto">
                        <button type="submit" disabled={isSendingData} className="neos-button neos-button-primary">
                            {redirect ? translate('action.update', 'Update redirect') : translate('action.create', 'Add redirect')}
                        </button>
                    </div>
                    {redirect && (
                        <div className="neos-control-group neos-control-group--auto">
                            <a className="neos-button add-redirect-form__cancel" onClick={() => handleCancelAction()}>
                                {translate('action.cancel', 'Cancel')}
                            </a>
                        </div>
                    )}
                </div>
            </form>
        )
    }
}