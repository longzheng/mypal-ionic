import { QueryEncoder } from '@angular/http';

// Angular2 by default encodes + as spaces in URLSearchParams.
// This custom encoder comments out parsing the "+" character
// https://github.com/angular/angular/issues/11058
export class CustomURLEncoder extends QueryEncoder {
    encodeKey(k: string): string {
        return this.encode(k);
    }
    encodeValue(v: string): string {
        return this.encode(v);
    }

    private encode(v: string): string {
        return encodeURIComponent(v)
            .replace(/%40/gi, '@')
            .replace(/%3A/gi, ':')
            .replace(/%24/gi, '$')
            .replace(/%2C/gi, ',')
            .replace(/%3B/gi, ';')
            //.replace(/%2B/gi, '+')
            .replace(/%3D/gi, '=')
            .replace(/%3F/gi, '?')
            .replace(/%2F/gi, '/');
    }
}