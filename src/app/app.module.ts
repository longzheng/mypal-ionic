import { NgModule, ErrorHandler } from '@angular/core';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { MyApp } from './app.component';

import { HistoryPage } from '../pages/history/history';
import { HomePage } from '../pages/home/home';
import { TabsPage } from '../pages/tabs/tabs';

import { MykiProvider } from '../providers/myki';
import { Storage } from '@ionic/storage';

let pages = [
  MyApp,
  TabsPage,
  HomePage,
  HistoryPage,
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
    IonicModule.forRoot(MyApp)
  ],
  bootstrap: [IonicApp],
  entryComponents: entryComponents(),
  providers: [
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    MykiProvider,
    Storage
  ]
})
export class AppModule {}
