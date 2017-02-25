import { Component } from '@angular/core';
import { App, NavController, ActionSheetController, MenuController, ToastController, ModalController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { ConfigProvider } from '../../providers/config';
import { Myki } from '../../models/myki';
import { LoginPage } from '../login/login';
import { Calendar } from 'ionic-native';
import { TopupPage } from '../topup/topup';
import moment from 'moment';

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
    public modalCtrl: ModalController,
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

  topupMoney() {
    this.topupModal(Myki.TopupType.Money)
  }

  topupPass() {
    this.topupModal(Myki.TopupType.Pass)
  }

  private topupModal(type: Myki.TopupType) {
    let modal = this.modalCtrl.create(TopupPage, { type: type });
    modal.present();
  }

  addReminder() {
    Calendar.hasWritePermission().then(
      result => {
        if (!result)
          // if we don't have calendar permissions, ask for it
          Calendar.requestWritePermission().then(
            () => {
              // when we have permissions (or think we have permission), move on
              return Promise.resolve()
            }
          )
      })
      .then(
      result => {
        // get card ID
        let cardId = this.card().idFormatted()

        // get the last 5 digits of the card (with space)
        let cardLastDigits = cardId.substring(cardId.length - 6)

        // create the calendar event
        Calendar.createEventInteractively(
          `Myki card ${cardLastDigits} expires`,
          null,
          `Card number ${cardId}`,
          this.card().expiry,
          moment(this.card().expiry).add(1, 'days').toDate() // the calendar end date needs to be the "end of day"
        ).catch(() => {
          // there was an error creating event, we probably don't have permission
          let toast = this.toastCtrl.create({
            position: 'top',
            message: 'This app does not have calendar permissions. Please go to settings and enable calendar permissions for this app.',
            duration: 3000
          });
          toast.present();
        })
      })
  }

}
