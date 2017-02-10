import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { SavedLoginProvider } from '../../providers/saved-login';
import { LoadCardsPage } from '../load-cards/load-cards';
import * as $ from "jquery";

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
    // get saved login details
    this.savedLoginProvider.get().then(
      result => {

        // check if we have any stored login information
        if (!result[0] || !result[1]) {
          // show login
          this.autologin = false;

          // early exit
          return;
        }

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

    // handle login username ENTER behavior
    $("input[name=username]").on('keydown', (e) => {
      if (e.which == 13) {
        // focus to password
        $("input[name=password]").focus()
      }
    })

    // handle login password ENTER behavior
    $("input[name=password]").on('keydown', (e) => {
      if (e.which == 13) {
        // submit log in
        this.logIn()
      }
    })
  }

  logIn() {
    // check if username and password filled
    if (!this.username || !this.password) {
      let alert = this.alertCtrl.create({
        title: 'Username and password required',
        buttons: ['OK']
      })
      alert.present()
      return;
    }

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

  register() {
    // open myki register page
    window.open('https://www.mymyki.com.au/NTSWebPortal/Common/register/SetupWebAccess.aspx?menu=Set%20up%20web%20access', '_system');
  }

}
