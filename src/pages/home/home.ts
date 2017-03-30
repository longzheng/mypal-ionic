import { Component } from '@angular/core';
import { Platform, App, NavController, ActionSheetController, MenuController, ToastController, ModalController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { ConfigProvider } from '../../providers/config';
import { Myki } from '../../models/myki';
import { LoginPage } from '../login/login';
import { Calendar } from '@ionic-native/calendar';
import { TopupPage } from '../topup/topup';
import { Firebase } from '@ionic-native/firebase';
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
    public platform: Platform,
    public firebase: Firebase,
    public calendar: Calendar,
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

  replacedCard() {
    return this.card().status === Myki.CardStatus.Replaced
  }

  blockedCard() {
    return this.card().status === Myki.CardStatus.Blocked
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
          text: 'Help & support',
          handler: () => {
            // open project page
            window.open('https://longzheng.github.io/mypal-ionic/#support', '_system');
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

  addPassReminder() {
    // log event
    this.firebase.logEvent("select_content", {
      "content_type": "calendar pass expiry",
      "item_id": "calendar_pass"
    })

    // get card ID
    let cardId = this.card().idFormatted()

    this.calendarCreateReminderWithPermission(
      `Myki pass expires`,
      null,
      `Card number ${cardId}`,
      this.card().passActiveExpiry,
      moment(this.card().passActiveExpiry).add(1, 'seconds').toDate(),
    )
  }

  addExpiryReminder() {
    // log event
    this.firebase.logEvent("select_content", {
      "content_type": "calendar card expiry",
      "item_id": "calendar_card"
    })

    // get card ID
    let cardId = this.card().idFormatted()

    this.calendarCreateReminderWithPermission(
      `Myki card expires`,
      null,
      `Card number ${cardId}`,
      this.card().expiry,
      moment(this.card().expiry).add(1, 'seconds').toDate(),
    )
  }

  isIos() {
    return false;
    
    // Apple App Store review will not approve the app if there is top up functionality
    // detect if platform is iOS and we will hide the top up buttons
    //return this.platform.is('ios');
  }

  private calendarCreateReminderWithPermission(title?: string, location?: string, notes?: string, startDate?: Date, endDate?: Date) {
    if ((<any>window).Calendar === undefined)
      return

    this.calendar.hasWritePermission().then(
      result => {
        if (!result && this.platform.is('ios')) {
          // we don't have calendar permissions
          // ask for calendar permissions
          // only matters on iOS since Android seems to allow us to create calendar event anyway
          // if we're targetting Android SDK>23 we might need this for runtime permission https://developer.android.com/training/permissions/requesting.html
          this.calendar.requestWritePermission().then()
        }

        // just kidding, we don't actually care, going to create event anyway
        this.calendarCreateReminder(title, location, notes, startDate, endDate)
      })
  }

  private calendarCreateReminder(title?: string, location?: string, notes?: string, startDate?: Date, endDate?: Date) {
    // create the calendar event
    // on iOS: if we don't have permissions, this will error
    // on Android, we can create event anyway
    this.calendar.createEventInteractivelyWithOptions(
      title,
      location,
      notes,
      startDate,
      endDate,
      {
        firstReminderMinutes: moment.duration(1, "day").asMinutes(),
      }
    ).catch(() => {
      // show calendar error
      this.calendarError()
    })
  }

  private calendarError() {
    // there was an error creating event, we probably don't have permission
    let toast = this.toastCtrl.create({
      position: 'top',
      message: 'This app does not have calendar permissions. Please go to settings and enable calendar permissions for this app.',
      duration: 3000
    });
    toast.present();
  }

}
