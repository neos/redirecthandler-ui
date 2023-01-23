import React from 'react';

type IconProps = {
    icon: string;
};

export default function Icon({ icon }: IconProps) {
    return <i className={`fas fa-${icon}`} />;
}
