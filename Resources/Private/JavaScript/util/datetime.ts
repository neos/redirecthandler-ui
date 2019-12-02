export function formatReadable(date: Date): string {
    const year: number | string = date.getUTCFullYear();
    let month: number | string = date.getUTCMonth();
    month++;
    if (month < 10) {
        month = '0' + month;
    }
    let day: number | string = date.getUTCDate();
    if (day < 10) {
        day = '0' + day;
    }
    let hours: number | string = date.getUTCHours();
    if (hours < 10) {
        hours = '0' + hours;
    }
    let minutes: number | string = date.getUTCMinutes();
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
}

export function formatW3CString(date: Date): string {
    const year: number | string = date.getFullYear();
    let month: number | string = date.getMonth();
    month++;
    if (month < 10) {
        month = '0' + month;
    }
    let day: number | string = date.getDate();
    if (day < 10) {
        day = '0' + day;
    }
    let hours: number | string = date.getHours();
    if (hours < 10) {
        hours = '0' + hours;
    }
    let minutes: number | string = date.getMinutes();
    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    let seconds: number | string = date.getSeconds();
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    const offset = -date.getTimezoneOffset();
    let offsetHours: number | string = Math.abs(Math.floor(offset / 60));
    let offsetMinutes: number | string = Math.abs(offset) - offsetHours * 60;
    if (offsetHours < 10) {
        offsetHours = '0' + offsetHours;
    }
    if (offsetMinutes < 10) {
        offsetMinutes = '0' + offsetMinutes;
    }
    let offsetSign = '+';
    if (offset < 0) {
        offsetSign = '-';
    }
    return (
        year +
        '-' +
        month +
        '-' +
        day +
        'T' +
        hours +
        ':' +
        minutes +
        ':' +
        seconds +
        offsetSign +
        offsetHours +
        ':' +
        offsetMinutes
    );
}
