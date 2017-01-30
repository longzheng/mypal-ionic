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
  }

  doRefresh(refresher) {
    // refresh active card
    this.mykiProvider.getCardDetails(this.card(), true).then(
      () => {
        refresher.complete();
      }).catch(error => {
      })
  }

  gotoHistory() {
    this.navCtrl.parent.select(1)
  }

  card() {
    return this.mykiProvider.activeCard();
  }

  inactiveCard() {
    return this.card().status === Myki.CardStatus.Replaced
  }

}
