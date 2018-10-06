import { IonicErrorHandler } from 'ionic-angular';
import * as Sentry from 'sentry-cordova';

// only initialize Sentry.io if on actual device
if ((<any>window).cordova)
    Sentry.init({ dsn: 'https://54c01f896cbb4594b75639dfbf59b81e@sentry.io/155883' });

// Sentry.io error handling
export class SentryIonicErrorHandler extends IonicErrorHandler {
    handleError(error) {
        super.handleError(error);
        try {
            Sentry.captureException(error.originalError || error);
        } catch (e) {
            console.error(e);
        }
    }
}