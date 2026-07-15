import React from 'react';

import { useIntl } from '../providers';

type BulkActionsProps = {
    selectedRedirects: Set<string>;
    handleBulkDeleteAction: () => void;
};

const BulkActions: React.FC<BulkActionsProps> = ({ selectedRedirects, handleBulkDeleteAction }) => {
    const { translate } = useIntl();

    return (
        <div className="redirects-bulk-actions">
            <span>{translate('bulkedit.actions.head', 'Bulk Actions')}</span>
            <button
                disabled={selectedRedirects.size <= 0}
                className="redirects-bulk-delete neos-button"
                title={translate('bulkedit.actions.delete', 'Delete')}
                onClick={handleBulkDeleteAction}
            >
                <i className="fas fa-trash" />
            </button>
        </div>
    );
};

export default React.memo(BulkActions);
