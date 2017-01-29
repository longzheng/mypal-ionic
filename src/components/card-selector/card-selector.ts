import { Component } from '@angular/core';
import { PopoverController } from 'ionic-angular';
import { CardsPopoverPage } from '../../pages/cards-popover/cards-popover';
import { MykiProvider } from '../../providers/myki';

@Component({
  selector: 'card-selector',
  templateUrl: 'card-selector.html'
})
export class CardSelectorComponent {

  constructor(
    public popoverCtrl: PopoverController,
    public mykiProvider: MykiProvider
  ) {

  }

  cardsPopover(myEvent) {
    let popover = this.popoverCtrl.create(CardsPopoverPage, {}, { cssClass: 'cardSelectorPopover' });
    popover.present({
      ev: myEvent
    });
  }

  activeCard() {
    return this.mykiProvider.activeCard();
  }

}
