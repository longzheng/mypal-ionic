import { Component } from '@angular/core';
import { MykiProvider } from '../../providers/myki';
import { NavController, ToastController } from 'ionic-angular';

@Component({
  selector: 'page-history',
  templateUrl: 'history.html',
})
export class HistoryPage {

  constructor(
    public navCtrl: NavController,
    public mykiProvider: MykiProvider,
    public toastCtrl: ToastController,
  ) {

  }

  doRefresh(refresher) {
    // refresh active card transactions
    this.mykiProvider.getCardDetails(this.card(), true).then(
      () => {
      }).catch(error => {
        let toast = this.toastCtrl.create({
          position: 'top',
          message: 'There was a problem refreshing your card details',
          duration: 3000
        });
        toast.present();
      }).then(() => {
        refresher.complete();
      })
  }

  accountLoaded() {
    return this.mykiProvider.mykiAccount.loaded;
  }

  card() {
    return this.mykiProvider.activeCard();
  }

  transactions() {
    return this.card().transactions;
  }

  transactionsGrouped() {
    return this.card().transactionsGrouped
  }

  hasTransactions() {
    return this.card().transactions.length > 0;
  }

}