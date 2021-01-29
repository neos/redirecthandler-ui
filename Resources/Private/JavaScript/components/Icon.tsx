import * as React from 'react';

interface IconProps {
    icon: string;
}

const Icon = ({ icon }: IconProps) => {
    return <i className={`fas fa-${icon}`} />;
};

export default React.memo(Icon);
