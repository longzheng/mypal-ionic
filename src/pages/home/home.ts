import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { Myki } from '../../models/myki';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    public navCtrl: NavController,
    public mykiProvider: MykiProvider,
  ) {

  }

  ionViewDidLoad() {
    this.mykiProvider.getAccountDetails().then(
      () => {

      }).catch(error => {
      })
  }

  doRefresh(refresher) {
    // refresh active card
    this.mykiProvider.getCardDetails(this.mykiProvider.activeCard()).then(
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

  inactiveCard() {
    return this.card().status === Myki.CardStatus.Replaced
  }

  cardInitialLoad() {
    return this.card().type === undefined;
  }

}
