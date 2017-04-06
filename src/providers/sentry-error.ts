import { IonicErrorHandler } from 'ionic-angular';
import Raven from 'raven-js';

// Sentry.io error handling
Raven
  .config('https://54c01f896cbb4594b75639dfbf59b81e@sentry.io/155883')
  .install();

export class SentryErrorHandler extends IonicErrorHandler {

    handleError(error) {
        super.handleError(error);

        try {
            Raven.captureException(error.originalError || error);
        }
        catch (e) {
            console.error(e);
        }
    }
}