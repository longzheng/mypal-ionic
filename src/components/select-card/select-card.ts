import { Component } from '@angular/core';
import { MenuController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { Myki } from '../../models/myki';

/*
  Generated class for the SelectCard component.

  See https://angular.io/docs/ts/latest/api/core/index/ComponentMetadata-class.html
  for more info on Angular 2 Components.
*/
@Component({
  selector: 'select-card',
  templateUrl: 'select-card.html'
})
export class SelectCardComponent {

  constructor(
    public mykiProvider: MykiProvider,
    public menuCtrl: MenuController,
  ) {

  }

  account() {
    return this.mykiProvider.mykiAccount;
  }

  selectCard(card: Myki.Card) {
    this.mykiProvider.activeCardId = card.id;
    this.menuCtrl.close()
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
