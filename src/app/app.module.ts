import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MomentModule } from 'angular2-moment';
import { MyApp } from './app.component';

import { LoginPage } from '../pages/login/login';
import { HistoryPage } from '../pages/history/history';
import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';
import { LoadCardsPage } from '../pages/load-cards/load-cards';

import { SelectCardComponent } from '../components/select-card/select-card';
import { TransactionComponent } from '../components/transaction/transaction';

import { MykiProvider } from '../providers/myki';
import { SavedLoginProvider } from '../providers/saved-login';
import { Storage } from '@ionic/storage';

let pages = [
  MyApp,
  LoginPage,
  TabsPage,
  HomePage,
  HistoryPage,
  LoadCardsPage,

  SelectCardComponent,
  TransactionComponent,
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
    IonicModule.forRoot(MyApp),
    MomentModule
  ],
  bootstrap: [IonicApp],
  entryComponents: entryComponents(),
  providers: [
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    MykiProvider,
    SavedLoginProvider,
    Storage
  ]
})
export class AppModule {}
