import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { MykiProvider } from '../../providers/myki';
import { Myki } from '../../models/myki';
import { TabsPage } from '../tabs/tabs';

@Component({
  selector: 'page-load-cards',
  templateUrl: 'load-cards.html'
})
export class LoadCardsPage {

  errorNoCards: boolean = false;
  loadingAccount: boolean = false;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public mykiProvider: MykiProvider,
    public storage: Storage,
  ) { }

  ionViewDidLoad() {
    this.loadAccount()
  }

  loadAccount() {
    this.loadingAccount = true;

    // load the account and get the myki cards
    this.mykiProvider.getAccountDetails().then(
      () => {
        // check if we have more than 1 card
        if (this.mykiProvider.mykiAccount.cards.length >= 1) {

          // get stored active card id
          this.storage.get('activeCardId').then(result => {
            let activeCardId = result
            let activeCardFound = false

            // if there is an active card id stored, see if it exists in the current account
            if (activeCardId)
              activeCardFound = this.mykiProvider.mykiAccount.cards.findIndex(x => x.id === activeCardId) !== -1

            if (activeCardFound) {
              // set active card to stored active card
              this.mykiProvider.setActiveCard(activeCardId)
            } else {
              // set active card to first card
              this.mykiProvider.setActiveCard(this.mykiProvider.mykiAccount.cards[0].id)
            }

            // go to tabs page
            this.navCtrl.setRoot(TabsPage, null, { animate: false, direction: 'forward' })
          })

        } else {
          // somehow we don't have any cards in this account
          // TODO: show error alert
        }
      }).catch(error => {
        // error
        // TODO: show error alert
      }).then(() => {
        this.loadingAccount = false;
      })
  }

}
