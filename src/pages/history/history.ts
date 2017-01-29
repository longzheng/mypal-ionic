import { Component } from '@angular/core';
import { MykiProvider } from '../../providers/myki';
import { Myki } from '../../models/myki';
import { NavController } from 'ionic-angular';

@Component({
  selector: 'page-history',
  templateUrl: 'history.html'
})
export class HistoryPage {

  constructor(
    public navCtrl: NavController,
    public mykiProvider: MykiProvider,
  ) {

  }

  doRefresh(refresher) {
    // refresh active card transactions
    this.mykiProvider.getCardDetails(this.mykiProvider.activeCard(), true).then(
      () => {
        refresher.complete();
      }).catch(error => {
      })
  }

  gotoHistory() {
    this.navCtrl.parent.select(1)
  }

  account() {
    return this.mykiProvider.mykiAccount;
  }

  card() {
    return this.mykiProvider.activeCard();
  }

  cardInitialLoad() {
    return this.card().type === undefined;
  }

  transactions() {
    return this.card().transactions;
  }

}
