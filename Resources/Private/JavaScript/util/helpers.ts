import Redirect from '../interfaces/Redirect';

const HTML_ESCAPE_MAP: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
};

/**
 * Returns true if the redirects are the same object or if their host and sourceUriPath are the same.
 *
 * @param a
 * @param b
 */
export function isSameRedirectAs(a: Redirect, b: Redirect): boolean {
    return a === b || (a.host === b.host && a.sourceUriPath === b.sourceUriPath);
}

/**
 * Returns true if the given status code requires a target uri
 *
 * @param statusCode
 */
export function statusCodeSupportsTarget(statusCode: number): boolean {
    return statusCode >= 300 && statusCode < 400;
}

/**
 * Replaces middle parts of a url path with ellipses when it's too long.
 *
 * @param path
 * @param maxLength
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
 *
 * @param text
 * @param keyword
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
 *
 * @param text
 */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}

/**
 * Copy text to clipboard fallback method which supports older browser version including IE
 *
 * @param text
 */
function fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        // tslint:disable-next-line:no-empty
    } catch {}

    document.body.removeChild(textArea);
}

/**
 * Copy text to clipboard method which will use a fallback if the browser doesn't offer the clipboard api yet
 *
 * @param text
 */
export function copyTextToClipboard(text: string): void {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text);
}
