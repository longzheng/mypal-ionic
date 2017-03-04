import { Component } from '@angular/core';
import { Platform, NavController, NavParams } from 'ionic-angular';

@Component({
  selector: 'page-launch-roadblock',
  templateUrl: 'launch-roadblock.html'
})
export class LaunchRoadblockPage {

  public message: string;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public platform: Platform,
  ) {
    this.message = navParams.get('message')
  }

  ionViewDidLoad() {
    // disable the back button on android
    this.platform.registerBackButtonAction( () => {
      return;
    })
  }

}
