import { Component } from '@angular/core';
import { App, NavController, ActionSheetController, MenuController, ToastController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { ConfigProvider } from '../../providers/config';
import { Myki } from '../../models/myki';
import { LoginPage } from '../login/login';
import { Calendar } from 'ionic-native';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    public app: App,
    public navCtrl: NavController,
    public mykiProvider: MykiProvider,
    public actionSheetCtrl: ActionSheetController,
    public configProvider: ConfigProvider,
    public menuCtrl: MenuController,
    public toastCtrl: ToastController,
  ) {

  }

  ionViewDidLoad() {
    // enable menu
    this.menuCtrl.enable(true);
  }

  doRefresh(refresher) {
    // refresh active card
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
            this.mykiProvider.logout()

            // disable menu
            this.menuCtrl.enable(false);

            // go to log in page
            this.app.getRootNav().setRoot(LoginPage, null, { animate: true, direction: 'back' }).then(result => {
              this.mykiProvider.reset()
            })
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

  addReminder() {
    Calendar.hasWritePermission().then(
      result => {
        // has permission
      }, error => {
        // ask for permission
        return Calendar.requestWritePermission()
      })
      .then(
        result => {
          Calendar.createEventInteractively(
            "Myki card expires",
            null,
            `Myki card number ${this.card().idFormatted()}`,
            this.card().expiry,
            this.card().expiry
          )
        }, error => {
          let toast = this.toastCtrl.create({
          position: 'top',
          message: 'This app does not have calendar permissions. Please go to settings and enable calendar permissions for this app.',
          duration: 3000
        });
        toast.present();
        }
      )
  }

}
