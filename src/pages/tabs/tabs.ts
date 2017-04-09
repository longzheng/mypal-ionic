import { Component } from '@angular/core';
import { HomePage } from '../home/home';
import { HistoryPage } from '../history/history';
import { TopupMapPage } from '../topup-map/topup-map';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {
  // this tells the tabs component which Pages
  // should be each tab's root Page
  tab1Root = HomePage;
  tab2Root = HistoryPage;
  tab3Root = TopupMapPage;

  constructor(
  ) {

  }

  ionViewDidLoad() {
  }
}
