import * as React from 'react';
import Redirect from '../interfaces/Redirect';
import {highlight, shortenPath, escapeHtml} from '../util/helpers';

const EMPTY_VALUE = '–';
const URI_PATH_MAX_LENGTH = 80;

export interface RedirectListItemProps {
    redirect: Redirect;
    translate: Function;
    rowClassNames: Array<string>;
    showHitCount: boolean;
    searchValue: string;
    handleEditAction: Function;
    handleDeleteAction: Function;
    handleCopyPathAction: Function;
}

export class RedirectListItem extends React.PureComponent<RedirectListItemProps, {}> {
    /**
     * Highlights and shortens the given path to nicely display in the table.
     *
     * @param path
     */
    private renderPath = (path: string): string => {
        return highlight(shortenPath(escapeHtml(path), URI_PATH_MAX_LENGTH), this.props.searchValue);
    };

    /**
     * Highlights the comment
     */
    private renderComment = (): string => {
        const {searchValue, redirect} = this.props;
        if (redirect.comment) {
            const comment = highlight(escapeHtml(redirect.comment.trim()), searchValue);
            return comment.replace(/(?:\r\n|\r|\n)/g, '<br/>');
        }
        return EMPTY_VALUE;
    };

    render(): React.ReactElement {
        const {
            redirect,
            translate,
            rowClassNames,
            showHitCount,
            handleDeleteAction, handleEditAction, handleCopyPathAction
        } = this.props;
        const identifier = redirect.host + '/' + redirect.sourceUriPath;
        const parsedStartDateTime = redirect.startDateTime ? Date.parse(redirect.startDateTime) : null;
        const parsedEndDateTime = redirect.endDateTime ? Date.parse(redirect.endDateTime) : null;
        const now = Date.now();

        const rowBaseClass = rowClassNames[0];
        if ((parsedStartDateTime && parsedStartDateTime > now) || (parsedEndDateTime && parsedEndDateTime < now)) {
            rowClassNames.push(rowBaseClass + '--inactive');
        }

        return (
            <tr className={rowClassNames.join(' ')}>
                <td className={rowBaseClass + '__column-status-code'}
                    title={translate('statusCodes.' + redirect.statusCode + '.tooltip')}>{redirect.statusCode}</td>
                <td>{redirect.host || '*'}</td>
                <td title={redirect.sourceUriPath} className={rowBaseClass + '__column-source-uri-path'}>
                    <span dangerouslySetInnerHTML={{__html: this.renderPath(redirect.sourceUriPath)}}/>
                    {redirect.sourceUriPath && <i role="button" className="copy-path fas fa-clipboard"
                                                  onClick={() => handleCopyPathAction(redirect.sourceUriPath)}/>}
                </td>
                <td title={redirect.targetUriPath} className={rowBaseClass + '__column-target-uri-path'}>
                    <span dangerouslySetInnerHTML={{__html: this.renderPath(redirect.targetUriPath || '/')}}/>
                    {redirect.targetUriPath && <i role="button" className="copy-path fas fa-clipboard"
                                                  onClick={() => handleCopyPathAction(redirect.targetUriPath)}/>}
                </td>
                <td className={rowBaseClass + '__column-start'}>
                    {redirect.startDateTime ? new Date(redirect.startDateTime).toLocaleString() : EMPTY_VALUE}
                </td>
                <td className={rowBaseClass + '__column-end'}>
                    {redirect.endDateTime ? new Date(redirect.endDateTime).toLocaleString() : EMPTY_VALUE}
                </td>
                <td className={rowBaseClass + '__column-comment'} title={redirect.comment}
                    dangerouslySetInnerHTML={{__html: this.renderComment()}}/>
                {showHitCount && (
                    <td className={rowBaseClass + '__column-hit-count'}
                        title={redirect.lastHit ? translate('list.lastHit', 'Last hit at {0}', [new Date(redirect.lastHit).toLocaleString()]) : translate('list.neverHit', 'Never hit')}>
                        {redirect.hitCounter}
                    </td>
                )}
                <td className={rowBaseClass + '__column-creation-date-time'} title={redirect.creationDateTime}>
                    {redirect.creationDateTime ? new Date(redirect.creationDateTime).toLocaleDateString() : EMPTY_VALUE}
                </td>
                <td>
                    {redirect.creator} {redirect.type !== 'manual' &&
                    <span className="redirect__type">({redirect.type})</span>}
                </td>
                <td className="neos-action">
                    <button type="button" className="neos-button"
                            onClick={e => handleEditAction(e, redirect)}
                            title={translate('list.action.edit', 'Edit')}
                            data-edit-redirect-id={identifier}>
                        <i className="fa fa-pencil-alt icon-pencil icon-white"/>
                    </button>
                    <button type="submit" className="neos-button neos-button-danger"
                            onClick={e => handleDeleteAction(e, redirect)}
                            title={translate('list.action.delete', 'Delete')}>
                        <i className="fa fa-trash-alt icon-trash icon-white"/>
                    </button>
                </td>
            </tr>
        );
    }
}
