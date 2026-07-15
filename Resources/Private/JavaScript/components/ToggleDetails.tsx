import React from 'react';
import { useIntl } from '../providers';

type ToggleDetailsProps = {
    handleToggleDetails: (event: React.ChangeEvent<HTMLInputElement>) => void;
    showDetails: boolean;
};

const ToggleDetails: React.FC<ToggleDetailsProps> = ({ handleToggleDetails, showDetails }) => {
    const { translate } = useIntl();

    return (
        <div className="redirects-toggle-details">
            <span>{translate('filter.showDetails', 'Show details')}</span>
            <label className="neos-checkbox">
                <input
                    onChange={handleToggleDetails}
                    type="checkbox"
                    checked={showDetails}
                    name="redirects-toggle-details"
                />
                <span></span>
            </label>
        </div>
    );
};

export default React.memo(ToggleDetails);
