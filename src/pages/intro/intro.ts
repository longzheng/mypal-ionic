import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { ConfigProvider } from '../../providers/config';
import { LoginPage } from '../login/login';
import { Firebase } from '@ionic-native/firebase';

@Component({
  selector: 'page-intro',
  templateUrl: 'intro.html'
})
export class IntroPage {

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public configProvider: ConfigProvider,
    public platform: Platform,
    public firebase: Firebase,
  ) { }

  ionViewDidLoad() {
    this.firebase.logEvent("tutorial_begin", {})
  }

  goToLogin() {
    // set intro as seen
    this.configProvider.introSetSeen();

    // log event
    this.firebase.logEvent("tutorial_complete", {})

    // go to login page
    this.navCtrl.setRoot(LoginPage, null, { animate: true, direction: 'forward' })
  }

  isIos() {
    return this.platform.is('ios');
  }

}
