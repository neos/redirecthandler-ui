export function parseURL(url: string, baseUrl: string = location.origin): URL {
    try {
        return new URL(url, baseUrl);
    } catch (e) {
        return null;
    }
}
