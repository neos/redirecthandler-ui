import React from 'react';
import { useIntl } from '../providers';

export enum PaginationDirection {
    Left,
    Right,
    Start,
    End,
}

type PaginationProps = {
    currentPage: number;
    filteredRedirects: any[];
    handlePagination: (action: PaginationDirection) => void;
    pagingParameters: number[];
    hasMorePages: boolean;
};

const Pagination: React.FC<PaginationProps> = ({ currentPage, handlePagination, hasMorePages, pagingParameters }) => {
    const { translate } = useIntl();

    return (
        <div className="redirects-pagination">
            <button
                role="button"
                disabled={currentPage <= 0}
                className="neos-button"
                onClick={() => currentPage > 0 && handlePagination(PaginationDirection.Left)}
            >
                <i className="fas fa-caret-left" />
            </button>
            <span>{translate('pagination.position', '{0}-{1} of {2}', pagingParameters)}</span>
            <button
                role="button"
                disabled={!hasMorePages}
                className="neos-button"
                onClick={() => hasMorePages && handlePagination(PaginationDirection.Right)}
            >
                <i className="fas fa-caret-right" />
            </button>
        </div>
    );
};

export default React.memo(Pagination);
