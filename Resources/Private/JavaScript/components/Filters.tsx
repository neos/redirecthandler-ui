import React from 'react';

import { useIntl } from '../providers';

type FiltersProps = {
    filterStatusCode: number;
    filterType: string;
    handleUpdateFilterStatusCode: (statusCode: number) => void;
    handleUpdateFilterType: (filterType: string) => void;
    handleUpdateSearch: (searchWord: string) => void;
    redirectCountByStatusCode: number[];
    redirectCountByType: { [index: string]: number };
};

export default function Filters({
    filterStatusCode,
    filterType,
    handleUpdateFilterStatusCode,
    handleUpdateFilterType,
    handleUpdateSearch,
    redirectCountByStatusCode,
    redirectCountByType,
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
                        onChange={(e) => handleUpdateSearch(e.target.value)}
                    />
                </div>

                <div className="neos-control-group">
                    <label htmlFor="redirects-filter-status-code">{translate('filter.statusCode', 'Code')}</label>
                    <select
                        id="redirects-filter-status-code"
                        defaultValue={filterStatusCode.toString()}
                        onChange={(e) => handleUpdateFilterStatusCode(parseInt(e.target.value, 10))}
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
                        onChange={(e) => handleUpdateFilterType(e.target.value)}
                    >
                        <option value="">All</option>
                        {Object.keys(redirectCountByType).map((type) => {
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
            </div>
        </div>
    );
}
