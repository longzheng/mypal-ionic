import { Component } from '@angular/core';
import { NavController, NavParams, ViewController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { Myki } from '../../models/myki';

@Component({
  selector: 'page-cards-popover',
  templateUrl: 'cards-popover.html'
})
export class CardsPopoverPage {

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public viewCtrl: ViewController,
    public mykiProvider: MykiProvider
  ) { }

  ionViewDidLoad() {
  }

  selectCard(card: Myki.Card) {
    this.mykiProvider.activeCardId = card.id;
    this.viewCtrl.dismiss();
  }

  isActiveCard(cardId: string) {
    return this.mykiProvider.activeCardId === cardId;
  }

  activeCards() {
    return this.mykiProvider.mykiAccount.cards.filter(x => x.status === Myki.CardStatus.Active)
  }

  inactiveCards() {
    return this.mykiProvider.mykiAccount.cards.filter(x => x.status === Myki.CardStatus.Replaced)
  }

}
