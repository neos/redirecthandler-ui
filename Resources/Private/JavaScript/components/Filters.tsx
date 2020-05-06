import * as React from 'react';

import { useIntl } from '../providers';
import { Redirect } from '../interfaces';

interface FiltersProps {
    handleUpdateSearch: (searchWord: string) => void;
    currentPage: number;
    filterStatusCode: number;
    filterType: string;
    filteredRedirects: Redirect[];
    redirectCountByStatusCode: number[];
    redirectCountByType: { [index: string]: number };
    pagingParameters: number[];
    showDetails: boolean;
    hasMorePages: boolean;
    handlePagination: (action: Pagination) => void;
    handleUpdateFilterStatusCode: (statusCode: number) => void;
    handleUpdateFilterType: (filterType: string) => void;
    handleToggleDetails: () => void;
}

export enum Pagination {
    Left,
    Right,
    Start,
    End,
}

export default function Filters({
    handleUpdateSearch,
    handleUpdateFilterStatusCode,
    handleUpdateFilterType,
    handlePagination,
    handleToggleDetails,
    showDetails,
    currentPage,
    filterStatusCode,
    filterType,
    filteredRedirects,
    redirectCountByStatusCode,
    redirectCountByType,
    pagingParameters,
    hasMorePages,
}: FiltersProps) {
    const { translate } = useIntl();

    return (
        <div className="redirects-filter">
            <div className="row">
                <div className="neos-control-group neos-control-group--large">
                    <label htmlFor="redirects-search">{translate('filter.search', 'Search')}</label>
                    <input
                        id="redirects-search"
                        type="text"
                        placeholder={translate('filter.search.placeholder', 'Search for a redirect')}
                        onChange={e => handleUpdateSearch(e.target.value)}
                    />
                </div>

                <div className="neos-control-group">
                    <label htmlFor="redirects-filter-status-code">{translate('filter.statusCode', 'Code')}</label>
                    <select
                        id="redirects-filter-status-code"
                        defaultValue={filterStatusCode.toString()}
                        onChange={e => handleUpdateFilterStatusCode(parseInt(e.target.value, 10))}
                    >
                        <option value="-1">All</option>
                        {redirectCountByStatusCode.map((numberOfRedirects, statusCode) => {
                            return (
                                <option key={statusCode} value={statusCode}>
                                    {statusCode}
                                    &nbsp;
                                    {translate('filter.resultsCountSuffix', 'results', [numberOfRedirects])}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="neos-control-group">
                    <label htmlFor="redirects-filter-type">{translate('filter.type', 'Type')}</label>
                    <select
                        id="redirects-filter-type"
                        defaultValue={filterType}
                        onChange={e => handleUpdateFilterType(e.target.value)}
                    >
                        <option value="">All</option>
                        {Object.keys(redirectCountByType).map(type => {
                            return (
                                <option key={type} value={type}>
                                    {translate('filter.type.' + type, type)}
                                    &nbsp;
                                    {translate('filter.resultsCountSuffix', 'results', [redirectCountByType[type]])}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="neos-control-group neos-control-group--right neos-control-group--fill">
                    <div className="redirects-filter__pagination">
                        {filteredRedirects.length > 0 && (
                            <button
                                role="button"
                                disabled={currentPage <= 0}
                                className="neos-button"
                                onClick={() => currentPage > 0 && handlePagination(Pagination.Left)}
                            >
                                <i className="fas fa-caret-left" />
                            </button>
                        )}
                        <span>
                            {filteredRedirects.length > 0
                                ? translate('pagination.position', 'Showing {0}-{1} of {2}', pagingParameters)
                                : translate('pagination.noResults', 'No redirects match your search')}
                        </span>
                        {filteredRedirects.length > 0 && (
                            <button
                                role="button"
                                disabled={!hasMorePages}
                                className="neos-button"
                                onClick={() => hasMorePages && handlePagination(Pagination.Right)}
                            >
                                <i className="fas fa-caret-right" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="neos-control-group align--right">
                    <label htmlFor="redirects-filter-details" className="redirects-filter-switch">
                        <span>{translate('filter.showDetails', 'Show details')}</span>
                        <input
                            id="redirects-filter-details"
                            type="checkbox"
                            checked={showDetails}
                            onChange={() => handleToggleDetails()}
                        />
                        <div className="redirects-filter-switch__slider" />
                    </label>
                </div>
            </div>
        </div>
    );
}
