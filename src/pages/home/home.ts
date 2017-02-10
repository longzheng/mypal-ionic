import { Component } from '@angular/core';
import { NavController, ActionSheetController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { SavedLoginProvider } from '../../providers/saved-login';
import { Myki } from '../../models/myki';
import { LoginPage } from '../login/login';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    public navCtrl: NavController,
    public mykiProvider: MykiProvider,
    public actionSheetCtrl: ActionSheetController,
    public savedLoginProvider: SavedLoginProvider,
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

  card() {
    return this.mykiProvider.activeCard();
  }

  inactiveCard() {
    return this.card().status === Myki.CardStatus.Replaced
  }

  userOptions() {
    let actionSheet = this.actionSheetCtrl.create({
      buttons: [
        {
          text: 'Open myki site',
          handler: () => {
            // open myki site
            window.open('https://www.mymyki.com.au/NTSWebPortal/Login.aspx', '_system');
          }
        },
        {
          text: 'Log out',
          role: 'destructive',
          handler: () => {
            // log out
            // clear saved login
            this.savedLoginProvider.forget()

            // go to log in page
            this.navCtrl.setRoot(LoginPage, null, { animate: true, direction: 'back' })
          }
        },

        {
          text: 'Cancel',
          role: 'cancel',
        }
      ]
    });

    actionSheet.present();
  }

}
