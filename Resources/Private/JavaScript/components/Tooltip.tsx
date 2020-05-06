import * as React from 'react';

interface TooltipProps {
    caption: string;
    onClick: () => void;
}

export default function renderTooltip({ caption, onClick }: TooltipProps): React.ReactElement {
    return (
        <div role="tooltip" onClick={() => onClick()} className="redirect-tooltip">
            {caption}
        </div>
    );
}
