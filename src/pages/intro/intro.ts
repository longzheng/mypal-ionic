import { Component } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { ConfigProvider } from '../../providers/config';
import { TabsPage } from '../tabs/tabs';

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
  ) { }

  ionViewDidLoad() {
    (<any>window).FirebasePlugin.logEvent("tutorial_begin", {})
  }

  goToMain() {
    // set intro as seen
    this.configProvider.introSetSeen();

    // log event
    (<any>window).FirebasePlugin.logEvent("tutorial_complete", {})

    // go to main page
    this.navCtrl.setRoot(TabsPage, null, { animate: true, direction: 'forward' })
  }

  isIos() {
    return false;

    //return this.platform.is('ios');
  }

}
