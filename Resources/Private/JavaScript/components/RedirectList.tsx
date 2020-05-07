import * as React from 'react';
import { FormEvent } from 'react';

import { Helpers } from '../util';
import { Redirect, NeosNotification } from '../interfaces';
import { RedirectListItem } from './RedirectListItem';
import { RedirectForm } from './RedirectForm';
import { RedirectContext } from '../providers';
import Filters, { Pagination } from './Filters';

const ITEMS_PER_PAGE = 20;

export enum SortDirection {
    Asc,
    Desc,
}

export interface RedirectListProps {
    redirects: Redirect[];
    translate: (id: string, label: string, args?: any[]) => string;
    notificationHelper: NeosNotification;
    initialTypeFilter: string;
    initialStatusCodeFilter: number;
    validSourceUriPathPattern: string;
    showHitCount: boolean;
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
    redirects: Redirect[];
    filteredRedirects: Redirect[];
    redirectCountByStatusCode: number[];
    redirectCountByType: { [index: string]: number };
    editedRedirect: Redirect;
    showDetails: boolean;
    showForm: boolean;
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
    showDetails: false,
    showForm: false,
};

export class RedirectList extends React.Component<RedirectListProps, RedirectListState> {
    static contextType = RedirectContext;

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

    public componentDidMount(): void {
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
    private handleUpdateSearch = (searchValue: string): void => {
        const {
            redirects,
            filterStatusCode,
            filterType,
            redirectCountByStatusCode,
            redirectCountByType,
            currentPage,
        } = this.state;
        let filteredRedirects: Redirect[] = redirects;

        const cleanSearchValue = searchValue.trim().toLowerCase();
        const validStatusCodeSelection = redirectCountByStatusCode[filterStatusCode] > 0 ? filterStatusCode : -1;
        const validFilterTypeSelection = redirectCountByType[filterType] > 0 ? filterType : '';

        // Filter by search value
        if (cleanSearchValue || validStatusCodeSelection || validFilterTypeSelection) {
            filteredRedirects = filteredRedirects.filter(redirect => {
                return (
                    (validStatusCodeSelection <= 0 || redirect.statusCode === validStatusCodeSelection) &&
                    (!validFilterTypeSelection || redirect.type === validFilterTypeSelection) &&
                    (!cleanSearchValue ||
                        redirect.sourceUriPath.toLowerCase().includes(cleanSearchValue) ||
                        redirect.targetUriPath.toLowerCase().includes(cleanSearchValue) ||
                        (redirect.comment || '').toLowerCase().includes(cleanSearchValue))
                );
            });
        }

        this.setState({
            searchValue: cleanSearchValue,
            filteredRedirects,
            filterStatusCode: validStatusCodeSelection,
            filterType: validFilterTypeSelection,
            currentPage: Math.min(currentPage, RedirectList.getMaxPage(filteredRedirects)),
        });
    };

    /**
     * Refreshes the list
     */
    private refresh = (): void => {
        const { redirects } = this.state;
        this.setState(
            {
                redirectCountByStatusCode: RedirectList.calculateRedirectCountByStatusCode(redirects),
                redirectCountByType: RedirectList.calculateRedirectCountByType(redirects),
            },
            () => this.handleUpdateSearch(this.state.searchValue),
        );
    }

    /**
     * Counts each type of status code over all given redirects and returns them
     *
     * @param redirects
     */
    private static calculateRedirectCountByStatusCode(redirects: Redirect[]): number[] {
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
    private static calculateRedirectCountByType(redirects: Redirect[]): { [index: string]: number } {
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
    private handleUpdateFilterStatusCode = (filterStatusCode: number): void => {
        this.setState({ filterStatusCode }, this.refresh);
    };

    /**
     * Updates the currently filtered redirect type and triggers a refresh on the search
     *
     * @param filterType
     */
    private handleUpdateFilterType = (filterType: string): void => {
        this.setState({ filterType }, this.refresh);
    };

    /**
     * Selecting a new property to sort by will set the sorting direction to ascending.
     * Selecting the same property again will toggle ascending and descending.
     *
     * @param sortBy
     */
    private handleUpdateSorting = (sortBy: string): void => {
        const previousSortBy = this.state.sortBy;
        this.setState({
            sortBy,
            sortDirection:
                sortBy === previousSortBy && this.state.sortDirection !== SortDirection.Desc
                    ? SortDirection.Desc
                    : SortDirection.Asc,
        });
    };

    /**
     * Updates the pagination state based on the pagination action
     *
     * @param action
     */
    private handlePagination = (action: Pagination): void => {
        const { currentPage } = this.state;

        switch (action) {
            case Pagination.Left:
                if (currentPage > 0) {
                    this.setState({
                        currentPage: currentPage - 1,
                    });
                }
                break;
            case Pagination.Right:
                this.setState({
                    currentPage: currentPage + 1,
                });
                break;
            default:
                break;
        }
    };

    /**
     * Sorts redirects ascending by the given property.
     *
     * @param redirects
     * @param propertyName
     * @param sortDirection
     */
    private sortRedirects = (redirects: Redirect[], propertyName: string, sortDirection: SortDirection): Redirect[] => {
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
    };

    /**
     * Asks for confirmation and then sends the deletion request to the backend.
     * A flash message will be created based on the result.
     *
     * @param event
     * @param redirect
     */
    private handleDeleteAction = (event: FormEvent, redirect: Redirect): void => {
        const { notificationHelper, actions } = this.props;
        const { csrfToken } = this.context;

        event.preventDefault();

        if (
            !confirm(
                this.props.translate('list.action.confirmDelete', 'Delete the redirect "{0}"?', [
                    (redirect.host || '') + '/' + redirect.sourceUriPath,
                ]),
            )
        ) {
            return;
        }

        const data = {
            __csrfToken: csrfToken,
            moduleArguments: {
                host: redirect.host,
                sourceUriPath: redirect.sourceUriPath,
            },
        };

        fetch(actions.delete, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(data => {
                const { success, messages } = data;
                if (success) {
                    const { redirects } = this.state;
                    const filteredRedirects = redirects.filter(storedRedirect => redirect !== storedRedirect);
                    this.setState(
                        {
                            redirects: filteredRedirects,
                        },
                        this.refresh,
                    );
                }
                messages.forEach(({ title, message, severity }) => {
                    notificationHelper[severity.toLowerCase()](title || message, message);
                });
            })
            .catch(error => {
                notificationHelper.error(error);
            });
    };

    /**
     * Sets the currently redirect that should be edited which will show the editing form
     */
    private handleEditAction = (event: FormEvent, editedRedirect: Redirect): void => {
        event.preventDefault();
        this.setState({ editedRedirect });
    };

    /**
     * Unset the currently edited redirect which will hide the editing form
     */
    private handleCancelAction = (): void => {
        this.setState({ editedRedirect: null });
    };

    /**
     * Toggles the detail view of the redirect table
     */
    private handleToggleDetails = (): void => {
        this.setState({ showDetails: !this.state.showDetails });
    };

    /**
     * Toggles the redirect creation form
     */
    private handleToggleForm = (): void => {
        this.setState({ showForm: !this.state.showForm });
    };

    /**
     * Adds or updates redirects in the list and triggers a refresh
     *
     * @param changedRedirects
     */
    private handleNewRedirect = (changedRedirects: Redirect[]): void => {
        let { redirects } = this.state;

        redirects.forEach((redirect, index, list) => {
            const changedRedirectIndex = changedRedirects.findIndex(changedRedirect =>
                Helpers.isSameRedirectAs(changedRedirect, redirect),
            );
            if (changedRedirectIndex >= 0) {
                list[index] = changedRedirects[changedRedirectIndex];
                changedRedirects.splice(changedRedirectIndex, 1);
            }
        });

        // Append remaining redirects which were not updates to existing ones
        redirects = redirects.concat(changedRedirects);

        this.setState(
            {
                redirects,
                editedRedirect: null,
            },
            this.refresh,
        );
    };

    /**
     * Removes the old redirect and add/updates changed ones
     *
     * @param changedRedirects
     * @param oldRedirect
     */
    private handleUpdatedRedirect = (changedRedirects: Redirect[], oldRedirect: Redirect): void => {
        let { redirects } = this.state;
        redirects = redirects.filter(redirect => redirect !== oldRedirect);
        this.setState({ redirects }, () => this.handleNewRedirect(changedRedirects));
    };

    /**
     * Copies the given value into the clipboard and shows a notification
     *
     * @param text
     */
    private handleCopyPathAction = (text: string): void => {
        Helpers.copyTextToClipboard(text);
        this.props.notificationHelper.info(this.props.translate('list.action.copyPath', 'Copied path to clipboard'));
    };

    /**
     * Renders a single column header including icons for sorting
     *
     * @param identifier
     * @param label
     */
    private renderColumnHeader(identifier: string, label: string): JSX.Element {
        const { sortBy, sortDirection } = this.state;
        const isActive = sortBy === identifier;
        return (
            <th onClick={() => this.handleUpdateSorting(identifier)} className={isActive ? 'active' : ''}>
                {this.props.translate(identifier, label)}{' '}
                {isActive && (
                    <i className={'fas fa-sort-amount-' + (sortDirection === SortDirection.Asc ? 'down' : 'up')} />
                )}
            </th>
        );
    }

    /**
     * Return the highest page number for the pagination
     */
    private static getMaxPage(redirects: Redirect[]): number {
        return Math.max(0, Math.ceil(redirects.length / ITEMS_PER_PAGE) - 1);
    }

    public render(): JSX.Element {
        const { showHitCount, translate, actions, validSourceUriPathPattern, notificationHelper } = this.props;

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
            showDetails,
            showForm,
        } = this.state;

        const pagingParameters = [
            currentPage * ITEMS_PER_PAGE + 1,
            Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredRedirects.length),
            filteredRedirects.length,
        ];

        const hasMorePages = RedirectList.getMaxPage(filteredRedirects) > currentPage;

        // Sort by column
        let visibleRedirects = sortBy
            ? this.sortRedirects(filteredRedirects, sortBy, sortDirection)
            : filteredRedirects;

        // Show only a limited number of redirects
        visibleRedirects = visibleRedirects.slice(pagingParameters[0] - 1, pagingParameters[1]);

        const columnCount = showHitCount ? 11 : 10;

        return (
            <React.Fragment>
                {!showForm && (
                    <button className="neos-button neos-button-primary" onClick={() => this.handleToggleForm()}>
                        {translate('action.create', 'Add redirect')}
                    </button>
                )}

                {showForm && (
                    <>
                        <h2 className="redirects-list__header">{translate('action.create', 'Add redirect')}</h2>

                        <RedirectForm
                            translate={translate}
                            actions={actions}
                            redirect={null}
                            notificationHelper={notificationHelper}
                            handleNewRedirect={this.handleNewRedirect}
                            handleUpdatedRedirect={this.handleUpdatedRedirect}
                            handleCancelAction={this.handleToggleForm}
                            idPrefix=""
                            validSourceUriPathPattern={validSourceUriPathPattern}
                        />
                    </>
                )}

                <h2 className="redirects-list__header">{translate('header.manageRedirects', 'Manage redirects')}</h2>

                <Filters
                    handleUpdateSearch={this.handleUpdateSearch}
                    currentPage={currentPage}
                    showDetails={showDetails}
                    filteredRedirects={filteredRedirects}
                    filterStatusCode={filterStatusCode}
                    filterType={filterType}
                    handlePagination={this.handlePagination}
                    handleUpdateFilterStatusCode={this.handleUpdateFilterStatusCode}
                    handleUpdateFilterType={this.handleUpdateFilterType}
                    handleToggleDetails={this.handleToggleDetails}
                    hasMorePages={hasMorePages}
                    pagingParameters={pagingParameters}
                    redirectCountByStatusCode={redirectCountByStatusCode}
                    redirectCountByType={redirectCountByType}
                />
                {redirects.length > 0 ? (
                    <div className="redirects-table-wrap">
                        <table className={'neos-table redirects-table' + (showDetails ? ' detail-view' : '')}>
                            <thead>
                                <tr>
                                    {this.renderColumnHeader('statusCode', 'Code')}
                                    {this.renderColumnHeader('host', 'Origin domain')}
                                    {this.renderColumnHeader('sourceUriPath', 'Source path')}
                                    {this.renderColumnHeader('targetUriPath', 'Target uri or path')}
                                    {this.renderColumnHeader('startDateTime', 'Active from')}
                                    {this.renderColumnHeader('endDateTime', 'Active until')}
                                    {showDetails && (
                                        <>
                                            {this.renderColumnHeader('comment', 'Comment')}
                                            {showHitCount && this.renderColumnHeader('hitCounter', 'Hits')}
                                            {this.renderColumnHeader('creationDate', 'Created')}
                                            {this.renderColumnHeader('creator', 'Creator')}
                                        </>
                                    )}
                                    <th className="redirect-table__heading-actions">
                                        {translate('actions', 'Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRedirects.map((redirect, index) => (
                                    <React.Fragment key={index}>
                                        <RedirectListItem
                                            redirect={redirect}
                                            rowClassNames={['redirects-table__row', index % 2 ? '' : 'odd']}
                                            translate={translate}
                                            handleDeleteAction={this.handleDeleteAction}
                                            handleEditAction={this.handleEditAction}
                                            handleCopyPathAction={this.handleCopyPathAction}
                                            searchValue={searchValue}
                                            showHitCount={showHitCount}
                                            showDetails={showDetails}
                                        />
                                        {editedRedirect === redirect && (
                                            <tr className="redirects-table__single-column-row">
                                                <td colSpan={columnCount}>
                                                    <h6>{translate('header.editRedirect', 'Edit redirect')}</h6>
                                                    <RedirectForm
                                                        translate={translate}
                                                        actions={actions}
                                                        redirect={redirect}
                                                        notificationHelper={notificationHelper}
                                                        handleNewRedirect={this.handleNewRedirect}
                                                        handleUpdatedRedirect={this.handleUpdatedRedirect}
                                                        handleCancelAction={this.handleCancelAction}
                                                        idPrefix={'redirect-' + index + '-'}
                                                        validSourceUriPathPattern={validSourceUriPathPattern}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div>{translate('list.empty', 'No redirects found')}</div>
                )}
            </React.Fragment>
        );
    }
}
