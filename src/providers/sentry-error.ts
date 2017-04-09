import { IonicErrorHandler } from 'ionic-angular';
import Raven from 'raven-js';

// only initialize Sentry.io if on actual device
if ((<any>window).cordova)
    Raven
        .config('https://54c01f896cbb4594b75639dfbf59b81e@sentry.io/155883')
        .install();

// Sentry.io error handling
export class SentryErrorHandler extends IonicErrorHandler {
    handleError(error) {
        super.handleError(error);

        try {
            Raven.captureException(error.originalError || error);
            Raven.showReportDialog({});
        }
        catch (e) {
            console.error(e);
        }
    }
}