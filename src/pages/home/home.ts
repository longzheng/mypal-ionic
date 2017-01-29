import { Component } from '@angular/core';
import { NavController, MenuController } from 'ionic-angular';
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
    public menuCtrl: MenuController,
  ) {

  }

  ionViewDidLoad() {
    // enable menu
    this.menuCtrl.enable(true);

    this.mykiProvider.getAccountDetails().then(
      () => {
      }).catch(error => {
      })
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

  cardInitialLoad() {
    return this.card().type === undefined;
  }

}
