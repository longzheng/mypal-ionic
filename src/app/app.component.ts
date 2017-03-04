import { Component } from '@angular/core';
import { App, Platform, AlertController, ModalController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/statusbar';
import { Splashscreen } from '@ionic-native/splashscreen';
import { ConfigProvider } from '../providers/config';
import { LoginPage } from '../pages/login/login';
import { IntroPage } from '../pages/intro/intro';
import { Firebase } from '@ionic-native/firebase';
import { LaunchRoadblockPage } from '../pages/launch-roadblock/launch-roadblock';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = null;
  roadBlocked = false;

  constructor(
    public app: App,
    public platform: Platform,
    public configProvider: ConfigProvider,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
  ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();

      // Android status bar coloring
      if (platform.is('android')) {
        StatusBar.backgroundColorByHexString("#9CAF24");
      }

      // check if we've seen intro
      this.configProvider.introHasSeen().then(
        result => {
          // hide splash screen
          Splashscreen.hide();

          //Make sure we have the Firebase plugin
          if ((<any>window).FirebasePlugin !== undefined) {
            // Fetch Firebase remote config
            (<any>window).FirebasePlugin.fetch(600, result => {
              // activate the fetched remote config
              (<any>window).FirebasePlugin.activateFetched(
                // Android seems to return error always, so we want to cath both
                result => { this.launchNotifications() }, error => { this.launchNotifications() }
              )
            });
          }

          if (result)
            return this.rootPage = LoginPage;

          this.rootPage = IntroPage;
        })

    });
  }

  private launchNotifications() {
    // get the "launch_prompt" value
    (<any>window).FirebasePlugin.getValue("launch_prompt", result => {
      // if value exists, show a prompt
      if (result) {
        let alert = this.alertCtrl.create({
          title: 'Notice',
          subTitle: result,
          buttons: ['OK'],
          enableBackdropDismiss: false
        })
        alert.present()
      }
    });

    // get the "launch_roadblock" value
    (<any>window).FirebasePlugin.getValue("launch_roadblock", result => {
      // if value exists, show a roadblock as a modal
      if (result) {
        let modal = this.modalCtrl.create(LaunchRoadblockPage, { message: result })
        modal.present()
      }
    });
  }
}
