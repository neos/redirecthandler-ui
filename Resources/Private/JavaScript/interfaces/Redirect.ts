export default interface Redirect {
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
