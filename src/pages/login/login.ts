import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { SavedLoginProvider } from '../../providers/saved-login';
import { LoadCardsPage } from '../load-cards/load-cards';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  username = "";
  password = "";
  autologin = true;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    public mykiProvider: MykiProvider,
    public savedLoginProvider: SavedLoginProvider,
    public loadingCtrl: LoadingController
  ) {
  }

  ionViewDidLoad() {
    // check if saved login exists
    this.savedLoginProvider.has().then(
      hasSavedLogin => {

        // no autologin
        if (hasSavedLogin === false) {
          // show login
          this.autologin = false;

          // early exit
          return;
        }

        // get saved login details
        this.savedLoginProvider.get().then(
          result => {
            // login
            this.mykiProvider.login(result[0], result[1]).then(() =>
              this.goToLoadCards()
            ).catch(() => {
              // show error
              let alert = this.alertCtrl.create({
                title: 'Saved login invalid',
                subTitle: 'Could not log in with your saved login details. Please re-enter your username and password.',
                buttons: ['OK']
              })
              alert.present()

              // show login form
              this.autologin = false
            })
          })
      })
  }

  hasUsernamePassword() {
    if (this.username && this.password)
      return true;

    return false;
  }

  logIn() {
    let loading = this.loadingCtrl.create({
      content: 'Logging in...'
    });

    loading.present()

    this.mykiProvider.login(this.username, this.password).then(
      success => {
        // save login
        this.savedLoginProvider.save(this.username, this.password)

        // go to load cards page
        this.goToLoadCards()
      },
      error => {
        // show error
        let alert = this.alertCtrl.create({
          title: 'Username or password incorrect',
          subTitle: 'Could not log in. Verify your username and password.',
          buttons: ['OK']
        })
        alert.present()
      }).then(() =>
        loading.dismiss()
      )
  }

  goToLoadCards() {
    // change nav root
    this.navCtrl.setRoot(LoadCardsPage, null, { animate: false, direction: 'forward' })
  }

}
