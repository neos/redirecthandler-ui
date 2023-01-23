const HTML_ESCAPE_MAP: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
};

/**
 * Returns true if the redirects are the same object or if their host and sourceUriPath are the same.
 */
export function isSameRedirectAs(a: Redirect, b: Redirect): boolean {
    return a === b || (a.host === b.host && a.sourceUriPath === b.sourceUriPath);
}

/**
 * Returns true if the given status code requires a target uri
 */
export function statusCodeSupportsTarget(statusCode: number): boolean {
    return statusCode >= 300 && statusCode < 400;
}

/**
 * Replaces middle parts of a url path with ellipses when it's too long.
 */
export function shortenPath(path: string, maxLength: number): string {
    if (path.length <= maxLength) {
        return path;
    }
    const pathParts = path.split('/');
    if (pathParts.length > 3) {
        return (
            pathParts[0] +
            (pathParts[0].length <= 6 ? '/' + pathParts[1] : '') +
            '/…/' +
            pathParts[pathParts.length - 1]
        );
    }
    return path;
}

/**
 * Highlights the keyword in the given text with the `mark` tag
 */
export function highlight(text: string, keyword: string): string {
    if (keyword) {
        const cleanKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegExp = new RegExp('(' + cleanKeyword + ')', 'ig');
        return text.replace(searchRegExp, '<mark>$1</mark>');
    }
    return text;
}

/**
 * Replace html special characters
 */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}

/**
 * Copy text to clipboard method which will use a fallback if the browser doesn't offer the clipboard api yet
 */
export function copyTextToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
}
