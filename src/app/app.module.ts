import { NgModule, ErrorHandler } from '@angular/core';
import { HttpModule } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import { IonicApp, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';
import { CurrencyPipe } from '@angular/common';
import { MomentModule } from 'angular2-moment';
import { IonicStorageModule } from '@ionic/storage';

// Custom pages
import { LoginPage } from '../pages/login/login';
import { HistoryPage } from '../pages/history/history';
import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';
import { LoadCardsPage } from '../pages/load-cards/load-cards';
import { IntroPage } from '../pages/intro/intro';
import { TopupPage } from '../pages/topup/topup';
import { LaunchRoadblockPage } from '../pages/launch-roadblock/launch-roadblock';
import { FarePricesPage } from '../pages/fare-prices/fare-prices';
import { TopupMapPage } from '../pages/topup-map/topup-map';

// Custom components
import { SelectCardComponent } from '../components/select-card/select-card';
import { TransactionComponent } from '../components/transaction/transaction';

// Custom providers
import { MykiProvider } from '../providers/myki';
import { ConfigProvider } from '../providers/config';
import { SentryErrorHandler } from '../providers/sentry-error';

// Ionic native
import { StatusBar } from '@ionic-native/status-bar';
import { HeaderColor } from '@ionic-native/header-color';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Calendar } from '@ionic-native/calendar';
import { Firebase } from '@ionic-native/firebase';
import { GoogleMaps } from '@ionic-native/google-maps';
import { AppVersion } from '@ionic-native/app-version';

let pages = [
  MyApp,
  LoginPage,
  TabsPage,
  HomePage,
  HistoryPage,
  LoadCardsPage,
  IntroPage,
  TopupPage,
  LaunchRoadblockPage,
  FarePricesPage,
  TopupMapPage,
  SelectCardComponent,
  TransactionComponent
]

export function declarations() {
  return pages
}

export function entryComponents() {
  return pages
}

@NgModule({
  declarations: declarations(),
  imports: [
     BrowserModule,
    HttpModule,
    IonicModule.forRoot(MyApp),
    MomentModule,
    // Ionic Storage
    IonicStorageModule.forRoot(),
  ],
  bootstrap: [IonicApp],
  entryComponents: entryComponents(),
  providers: [
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    CurrencyPipe,
    // Custom providers
    MykiProvider,
    ConfigProvider,
    // Ionic native
    StatusBar,
    HeaderColor,
    SplashScreen,
    Calendar,
    Firebase,
    GoogleMaps,
    AppVersion
  ]
})
export class AppModule { }
