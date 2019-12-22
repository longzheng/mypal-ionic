import { Component } from '@angular/core';
import { NavController, NavParams, AlertController, LoadingController } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';
import { ConfigProvider } from '../../providers/config';
import * as $ from "jquery";

@Component({
  selector: 'login',
  templateUrl: 'login.html'
})
export class LoginComponent {

  username = "";
  password = "";

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public alertCtrl: AlertController,
    public mykiProvider: MykiProvider,
    public configProvider: ConfigProvider,
    public loadingCtrl: LoadingController,
  ) {
  }

  loggingIn() {
    return this.mykiProvider.loggingIn
  }

  loadingAccount() {
    return this.mykiProvider.loggedIn && !this.mykiProvider.mykiAccount.loaded
  }

  logIn() {
    // close keyboard
    try{
      (<any>window).Keyboard.hide()
    }
    catch(e){
    }

    // check if username and password filled
    if (!this.username || !this.password) {
      let alert = this.alertCtrl.create({
        title: 'Username and password required',
        buttons: ['OK'],
        enableBackdropDismiss: false
      })
      alert.present()
      return;
    }

    this.mykiProvider.loginGetAccount(this.username, this.password).then(
      success => {
        // save login
        this.configProvider.loginSave(this.username, this.password);

        // log event
        (<any>window).FirebasePlugin.logEvent("login", {})
      },
      error => {
        if (error === 'network'){
          // network error
          let alert = this.alertCtrl.create({
            title: 'Internet error',
            subTitle: 'Check you have a working mobile or WiFi connection.',
            enableBackdropDismiss: false,
            buttons: [
              {
                text: 'OK',
                role: 'cancel',
                handler: () => {
                }
              }
            ]
          })
          alert.present()
        }

        if (error === 'locked') {
          // account locked error
          let alert = this.alertCtrl.create({
            title: 'Account locked',
            subTitle: 'Your account has been disabled due to too many incorrect password attempts.',
            enableBackdropDismiss: false,
            buttons: [
              {
                text: 'Unlock account',
                handler: () => {
                  window.open('https://www.mymyki.com.au/NTSWebPortal/common/Auxillary/UnlockUser.aspx', '_system');
                }
              },
              {
                text: 'OK',
                role: 'cancel',
                handler: () => {
                }
              }
            ]
          })
          alert.present()
        }

        if (error === 'login') {
          // login error
          let alert = this.alertCtrl.create({
            title: 'Username or password incorrect',
            subTitle: 'Could not log in. Verify your username and password.',
            enableBackdropDismiss: false,
            buttons: [
              {
                text: 'Forgot username',
                handler: () => {
                  window.open('https://www.mymyki.com.au/NTSWebPortal/common/Auxillary/ForgottenUsername.aspx', '_system');
                }
              },
              {
                text: 'Forgot password',
                handler: () => {
                  window.open('https://www.mymyki.com.au/NTSWebPortal/common/Auxillary/ForgotPassword.aspx', '_system');
                }
              },
              {
                text: 'OK',
                role: 'cancel',
                handler: () => {
                }
              }
            ]
          })
          alert.present()
        }

        if (error === 'account') {
          // error
          let alert = this.alertCtrl.create({
            title: 'Error loading account',
            subTitle: 'There was an error loading your account details and cards.',
            enableBackdropDismiss: false,
            buttons: [
              {
                text: 'Retry',
                role: 'cancel',
                handler: () => {
                  this.mykiProvider.getAccountDetails()
                }
              }
            ]
          })
          alert.present()
        }
      })
  }

  register() {
    // log event
    (<any>window).FirebasePlugin.logEvent("sign_up", {})

    // open myki register page
    window.open('https://www.mymyki.com.au/NTSWebPortal/Common/register/SetupWebAccess.aspx?menu=Set%20up%20web%20access', '_system');
  }

  // handle login username ENTER behavior
  usernameEnter() {
    // focus to password
    $("input[name=password]").focus()
  }

  // handle login password ENTER behavior
  passwordEnter() {
    // submit log in
    this.logIn()
  }

}
