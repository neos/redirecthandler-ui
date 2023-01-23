interface NeosI18n {
    translate: (id: string, fallback: string, packageKey: string, source: string, args: any[]) => string;
    initialized: boolean;
}

interface NeosNotification {
    notice: (title: string) => void;
    ok: (title: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string) => void;
}

interface Window {
    Typo3Neos: {
        I18n: NeosI18n;
        Notification: NeosNotification;
    };
    NeosCMS: {
        I18n: NeosI18n;
        Notification: NeosNotification;
    };
}

interface Navigator extends Navigator{
    clipboard: {
        writeText: (text: string) => void;
    }
}

interface Redirect {
    [key: string]: any; // Generic accessor to get property via its name
    host: string;
    sourceUriPath: string;
    targetUriPath: string;
    statusCode: number;
    startDateTime: string;
    endDateTime: string;
    comment: string;
    creator: string;
    type: string;
    hitCount: number;
    lastHit: string;
    creationDateTime: string;
}

type Endpoints = {
    delete: string;
    create: string;
    update: string;
}
