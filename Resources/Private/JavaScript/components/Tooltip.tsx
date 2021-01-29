import * as React from 'react';

interface TooltipProps {
    caption: string;
    onClick: () => void;
}

const Tooltip: React.FC<TooltipProps> = ({ caption, onClick }) => {
    return (
        <div role="tooltip" onClick={() => onClick()} className="redirect-tooltip">
            {caption}
        </div>
    );
};

export default React.memo(Tooltip);
