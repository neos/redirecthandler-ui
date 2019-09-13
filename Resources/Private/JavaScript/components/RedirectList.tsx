import * as React from 'react';
import Redirect from '../interfaces/Redirect';
import {RedirectListItem} from './RedirectListItem';
import {FormEvent} from 'react';
import {copyTextToClipboard, isSameRedirectAs} from '../util/helpers';
import NeosNotification from '../interfaces/NeosNotification';
import {RedirectForm} from './RedirectForm';

const ITEMS_PER_PAGE = 20;

export enum SortDirection {
    Asc,
    Desc,
}

export enum Pagination {
    Left,
    Right,
    Start,
    End
}

export interface RedirectListProps {
    redirects: Array<Redirect>;
    translate: Function;
    notificationHelper: NeosNotification;
    initialTypeFilter: string;
    initialStatusCodeFilter: number;
    defaultStatusCode: number;
    statusCodes: { [index: string]: string };
    validSourceUriPathPattern: string;
    showHitCount: boolean;
    csrfToken: string;
    actions: {
        delete: string;
        update: string;
        create: string;
    };
}

export interface RedirectListState {
    searchValue: string;
    sortBy: string;
    sortDirection: SortDirection;
    filterType: string;
    filterStatusCode: number;
    currentPage: number;
    redirects: Array<Redirect>;
    filteredRedirects: Array<Redirect>;
    redirectCountByStatusCode: Array<number>;
    redirectCountByType: { [index: string]: number };
    editedRedirect: Redirect;
}

const initialState: RedirectListState = {
    searchValue: '',
    sortBy: 'sourceUriPath',
    sortDirection: SortDirection.Asc,
    filterType: '',
    filterStatusCode: -1,
    currentPage: 0,
    redirects: [],
    filteredRedirects: [],
    redirectCountByStatusCode: [],
    redirectCountByType: {},
    editedRedirect: null,
};

export class RedirectList extends React.Component<RedirectListProps, RedirectListState> {
    constructor(props: RedirectListProps) {
        super(props);
        this.state = {
            ...initialState,
            redirects: props.redirects,
            filteredRedirects: props.redirects,
            filterStatusCode: props.initialStatusCodeFilter,
            filterType: props.initialTypeFilter,
            redirectCountByStatusCode: RedirectList.calculateRedirectCountByStatusCode(props.redirects),
            redirectCountByType: RedirectList.calculateRedirectCountByType(props.redirects),
        };
    }

    componentDidMount(): void {
        if (this.props.initialStatusCodeFilter) {
            this.handleUpdateSearch('');
        }
    }

    /**
     * Filters the full list of redirects by the search value and status code if set.
     * The result is stored in the state so it doesn't need to be recomputed for pagination or sorting.
     *
     * @param searchValue
     */
    private handleUpdateSearch(searchValue: string): void {
        const {redirects, filterStatusCode, filterType, redirectCountByStatusCode} = this.state;
        let filteredRedirects: Array<Redirect> = redirects;

        searchValue = searchValue.trim().toLowerCase();
        const validStatusCodeSelection = redirectCountByStatusCode[filterStatusCode] > 0 ? filterStatusCode : -1;

        // Filter by search value
        if (searchValue || validStatusCodeSelection || filterType) {
            filteredRedirects = filteredRedirects.filter(redirect => {
                return (validStatusCodeSelection <= 0 || redirect.statusCode === validStatusCodeSelection) &&
                    (!filterType || redirect.type === filterType) &&
                    (
                        !searchValue ||
                        redirect.sourceUriPath.toLowerCase().includes(searchValue) ||
                        redirect.targetUriPath.toLowerCase().includes(searchValue) ||
                        (redirect.comment || '').toLowerCase().includes(searchValue)
                    );
            });
        }

        this.setState({
            searchValue,
            filteredRedirects,
            filterStatusCode: validStatusCodeSelection,
            currentPage: 0,
        });
    }

    /**
     * Refreshes the list
     */
    private refresh(): void {
        const {redirects} = this.state;
        this.setState({
            redirectCountByStatusCode: RedirectList.calculateRedirectCountByStatusCode(redirects),
            redirectCountByType: RedirectList.calculateRedirectCountByType(redirects),
        }, () => this.handleUpdateSearch(this.state.searchValue));
    }

    /**
     * Counts each type of status code over all given redirects and returns them
     *
     * @param redirects
     */
    private static calculateRedirectCountByStatusCode(redirects: Array<Redirect>): Array<number> {
        return redirects.reduce((counts, redirect) => {
            counts[redirect.statusCode] = counts[redirect.statusCode] ? counts[redirect.statusCode] + 1 : 1;
            return counts;
        }, []);
    }

    /**
     * Counts each type of status code over all given redirects and returns them
     *
     * @param redirects
     */
    private static calculateRedirectCountByType(redirects: Array<Redirect>): { [index: string]: number } {
        const counts: { [index: string]: number } = {};
        return redirects.reduce((counts, redirect) => {
            counts[redirect.type] = counts[redirect.type] ? counts[redirect.type] + 1 : 1;
            return counts;
        }, counts);
    }

    /**
     * Updates the currently filtered status code and triggers a refresh on the search.
     *
     * @param filterStatusCode
     */
    private handleUpdateFilterStatusCode(filterStatusCode: number): void {
        this.setState({filterStatusCode}, this.refresh);
    }

    /**
     * Updates the currently filtered redirect type and triggers a refresh on the search
     *
     * @param filterType
     */
    private handleUpdateFilterType(filterType: string): void {
        this.setState({filterType}, this.refresh);
    }

    /**
     * Selecting a new property to sort by will set the sorting direction to ascending.
     * Selecting the same property again will toggle ascending and descending.
     *
     * @param sortBy
     */
    private handleUpdateSorting(sortBy: string): void {
        const previousSortBy = this.state.sortBy;
        this.setState({
            sortBy,
            sortDirection: sortBy === previousSortBy && this.state.sortDirection !== SortDirection.Desc ? SortDirection.Desc : SortDirection.Asc,
        });
    }

    /**
     * Updates the pagination state based on the pagination action
     *
     * @param action
     */
    private handlePagination(action: Pagination): void {
        const {currentPage} = this.state;

        switch (action) {
            case Pagination.Left:
                if (currentPage > 0) {
                    this.setState({
                        currentPage: currentPage - 1
                    });
                }
                break;
            case Pagination.Right:
                this.setState({
                    currentPage: currentPage + 1
                });
                break;
            default:
                break;
        }
    }

    /**
     * Sorts redirects ascending by the given property.
     *
     * @param redirects
     * @param propertyName
     * @param sortDirection
     */
    private sortRedirects(redirects: Array<Redirect>, propertyName: string, sortDirection: SortDirection): Array<Redirect> {
        const sortedRedirects = redirects.sort((a, b) => {
            let x = a[propertyName];
            if (typeof x === 'string') {
                x = x.toLowerCase();
            } else if (x === null) {
                x = '';
            }
            let y = b[propertyName];
            if (typeof y === 'string') {
                y = y.toLowerCase();
            } else if (y === null) {
                y = '';
            }
            return x < y ? -1 : x > y ? 1 : 0;
        });

        if (sortDirection === SortDirection.Desc) {
            sortedRedirects.reverse();
        }

        return sortedRedirects;
    }

    /**
     * Asks for confirmation and then sends the deletion request to the backend.
     * A flash message will be created based on the result.
     *
     * @param event
     * @param redirect
     */
    private handleDeleteAction = (event: FormEvent, redirect: Redirect): void => {
        const {csrfToken, notificationHelper, actions} = this.props;

        event.preventDefault();

        if (!confirm(this.props.translate('list.action.confirmDelete', 'Delete the redirect "{0}"?', [(redirect.host || '') + '/' + redirect.sourceUriPath]))) {
            return;
        }

        const data = {
            '__csrfToken': csrfToken,
            moduleArguments: {
                host: redirect.host,
                sourceUriPath: redirect.sourceUriPath,
            }
        };

        fetch(actions.delete, {
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
                if (data.success) {
                    const {redirects} = this.state;
                    const filteredRedirects = redirects.filter(storedRedirect => redirect !== storedRedirect);
                    this.setState({
                        redirects: filteredRedirects,
                    }, this.refresh);
                    notificationHelper.ok(data.message);
                } else {
                    notificationHelper.error(data.message);
                }
            }).catch(error => {
                notificationHelper.error(error);
            }
        );
    };

    /**
     * Sets the currently redirect that should be edited which will show the editing form
     */
    private handleEditAction = (event: FormEvent, editedRedirect: Redirect): void => {
        event.preventDefault();
        this.setState({editedRedirect});
    };

    /**
     * Unset the currently edited redirect which will hide the editing form
     */
    private handleCancelAction = (): void => {
        this.setState({editedRedirect: null});
    };

    /**
     * Adds or updates redirects in the list and triggers a refresh
     *
     * @param changedRedirects
     */
    private handleNewRedirect = (changedRedirects: Array<Redirect>): void => {
        let {redirects} = this.state;

        redirects.forEach((redirect, index, list) => {
            const changedRedirectIndex = changedRedirects.findIndex(changedRedirect => isSameRedirectAs(changedRedirect, redirect));
            if (changedRedirectIndex >= 0) {
                list[index] = changedRedirects[changedRedirectIndex];
                changedRedirects.splice(changedRedirectIndex, 1);
            }
        });

        // Append remaining redirects which were not updates to existing ones
        redirects = redirects.concat(changedRedirects);

        this.setState({
            redirects,
            editedRedirect: null,
        }, this.refresh);
    };

    /**
     * Removes the old redirect and add/updates changed ones
     *
     * @param changedRedirects
     * @param oldRedirect
     */
    private handleUpdatedRedirect = (changedRedirects: Array<Redirect>, oldRedirect: Redirect): void => {
        let {redirects} = this.state;
        redirects = redirects.filter(redirect => redirect !== oldRedirect);
        this.setState({redirects}, () => this.handleNewRedirect(changedRedirects));
    };

    /**
     * Copies the given value into the clipboard and shows a notification
     *
     * @param text
     */
    private handleCopyPathAction = (text: string): void => {
        copyTextToClipboard(text);
        this.props.notificationHelper.info(this.props.translate('list.action.copyPath', 'Copied path to clipboard'));
    };

    /**
     * Renders a single column header including icons for sorting
     *
     * @param identifier
     * @param label
     */
    private renderColumnHeader(identifier: string, label: string): JSX.Element {
        const {sortBy, sortDirection} = this.state;
        const isActive = sortBy === identifier;
        return (
            <th onClick={() => this.handleUpdateSorting(identifier)} className={isActive ? 'active' : ''}>
                {this.props.translate(identifier, label)} {isActive && (
                <i className={'fas fa-sort-amount-' + (sortDirection === SortDirection.Asc ? 'down' : 'up')}/>
            )}
            </th>
        );
    }

    public render(): JSX.Element {
        const {
            showHitCount,
            translate,
            actions,
            csrfToken,
            statusCodes,
            validSourceUriPathPattern,
            notificationHelper,
            initialStatusCodeFilter,
            defaultStatusCode,
        } = this.props;

        const {
            redirects,
            sortBy,
            sortDirection,
            filteredRedirects,
            currentPage,
            redirectCountByStatusCode,
            redirectCountByType,
            filterStatusCode,
            filterType,
            searchValue,
            editedRedirect,
        } = this.state;

        const pagingParameters = [
            (currentPage * ITEMS_PER_PAGE) + 1,
            Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredRedirects.length),
            filteredRedirects.length
        ];

        const hasMorePages = pagingParameters[1] < filteredRedirects.length;

        // Sort by column
        let visibleRedirects = sortBy ? this.sortRedirects(filteredRedirects, sortBy, sortDirection) : filteredRedirects;

        // Show only a limited number of redirects
        visibleRedirects = visibleRedirects.slice(pagingParameters[0] - 1, pagingParameters[1]);

        const columnCount = showHitCount ? 11 : 10;

        return (
            <React.Fragment>
                <RedirectForm
                    translate={translate}
                    actions={actions}
                    redirect={null}
                    csrfToken={csrfToken}
                    notificationHelper={notificationHelper}
                    handleNewRedirect={this.handleNewRedirect}
                    handleUpdatedRedirect={this.handleUpdatedRedirect}
                    handleCancelAction={null}
                    idPrefix=""
                    statusCodes={statusCodes}
                    validSourceUriPathPattern={validSourceUriPathPattern}
                    defaultStatusCode={defaultStatusCode}/>

                <div className="redirects-filter">
                    <div className="row">
                        <div className="neos-control-group">
                            <label htmlFor="redirects-search">{translate('filter.search', 'Search')}</label>
                            <input id="redirects-search" type="text" placeholder="Search"
                                   onChange={e => this.handleUpdateSearch(e.target.value)}/>
                        </div>

                        <div className="neos-control-group">
                            <label htmlFor="redirects-filter-status-code">
                                {translate('filter.statusCode', 'Code')}
                            </label>
                            <select id="redirects-filter-status-code" defaultValue={filterStatusCode.toString()}
                                    onChange={e => this.handleUpdateFilterStatusCode(parseInt(e.target.value, 10))}>
                                <option value="-1">All</option>
                                {redirectCountByStatusCode.map((numberOfRedirects, statusCode) => {
                                    return (
                                        <option key={statusCode} value={statusCode}>
                                            {statusCode}
                                            &nbsp;{translate('filter.resultsCountSuffix', 'results', [numberOfRedirects])}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="neos-control-group">
                            <label htmlFor="redirects-filter-type">
                                {translate('filter.type', 'Type')}
                            </label>
                            <select id="redirects-filter-type" defaultValue={filterType}
                                    onChange={e => this.handleUpdateFilterType(e.target.value)}>
                                <option value="">All</option>
                                {Object.keys(redirectCountByType).map(type => {
                                    return (
                                        <option key={type} value={type}>
                                            {translate('filter.type.' + type, type)}
                                            &nbsp;{translate('filter.resultsCountSuffix', 'results', [redirectCountByType[type]])}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="redirects-filter__pagination">
                        {filteredRedirects.length > 0 && (
                            <i role="button" className={'fas fa-caret-left' + (currentPage > 0 ? '' : ' disabled')}
                               onClick={() => currentPage > 0 && this.handlePagination(Pagination.Left)}/>
                        )}
                        {filteredRedirects.length > 0 ? translate('pagination.position', 'Showing {0}-{1} of {2}', pagingParameters) : translate('pagination.noResults', 'No redirects match your search')}
                        {filteredRedirects.length > 0 && (
                            <i role="button" className={'fas fa-caret-right' + (hasMorePages ? '' : ' disabled')}
                               onClick={() => hasMorePages && this.handlePagination(Pagination.Right)}/>
                        )}
                    </div>
                </div>
                {redirects.length > 0 ? (
                    <div className="redirects-table-wrap">
                        <table className="neos-table redirects-table">
                            <thead>
                                <tr>
                                    {this.renderColumnHeader('statusCode', 'Code')}
                                    {this.renderColumnHeader('host', 'Origin domain')}
                                    {this.renderColumnHeader('sourceUriPath', 'Source path')}
                                    {this.renderColumnHeader('targetUriPath', 'Target uri or path')}
                                    {this.renderColumnHeader('startDateTime', 'Active from')}
                                    {this.renderColumnHeader('endDateTime', 'Active until')}
                                    {this.renderColumnHeader('comment', 'Comment')}
                                    {showHitCount && this.renderColumnHeader('hitCounter', 'Hits')}
                                    {this.renderColumnHeader('creationDate', 'Created')}
                                    {this.renderColumnHeader('creator', 'Creator')}
                                    <th className="redirect-table__heading-actions">{translate('actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRedirects.map((redirect, index) => (
                                    <React.Fragment key={index}>
                                        <RedirectListItem redirect={redirect}
                                                          rowClassNames={['redirects-table__row', index % 2 ? '' : 'odd']}
                                                          translate={translate}
                                                          handleDeleteAction={this.handleDeleteAction}
                                                          handleEditAction={this.handleEditAction}
                                                          handleCopyPathAction={this.handleCopyPathAction}
                                                          searchValue={searchValue}
                                                          showHitCount={showHitCount}/>
                                        {editedRedirect === redirect && (
                                        <tr className="redirect-edit-form">
                                            <td colSpan={columnCount}>
                                                <h6>{translate('header.editRedirect')}</h6>
                                                <RedirectForm translate={translate}
                                                              actions={actions}
                                                              redirect={redirect}
                                                              csrfToken={csrfToken}
                                                              notificationHelper={notificationHelper}
                                                              handleNewRedirect={this.handleNewRedirect}
                                                              handleUpdatedRedirect={this.handleUpdatedRedirect}
                                                              handleCancelAction={this.handleCancelAction}
                                                              idPrefix={'redirect-' + index + '-'}
                                                              statusCodes={statusCodes}
                                                              validSourceUriPathPattern={validSourceUriPathPattern}
                                                              defaultStatusCode={initialStatusCodeFilter}/>
                                            </td>
                                        </tr>
                                    )}
                                    </React.Fragment>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : <div>{translate('list.empty', 'No redirects found')}</div>}
            </React.Fragment>
        );
    }
}
