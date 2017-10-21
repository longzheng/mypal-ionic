import { Component } from '@angular/core';
import { App, Platform, AlertController, ModalController, ActionSheetController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { HeaderColor } from '@ionic-native/header-color';
import { SplashScreen } from '@ionic-native/splash-screen';
import { AppVersion } from '@ionic-native/app-version';
import { MykiProvider } from '../providers/myki';
import { ConfigProvider } from '../providers/config';
import { TabsPage } from '../pages/tabs/tabs';
import { IntroPage } from '../pages/intro/intro';
import { LaunchRoadblockPage } from '../pages/launch-roadblock/launch-roadblock';
import Raven from 'raven-js';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = null;

  constructor(
    public app: App,
    public platform: Platform,
    public configProvider: ConfigProvider,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public actionSheetCtrl: ActionSheetController,
    public statusBar: StatusBar,
    public headerColor: HeaderColor,
    public splashScreen: SplashScreen,
    public appVersion: AppVersion,
    public mykiProvider: MykiProvider,
  ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();

      // Android status bar coloring
      if (platform.is('android')) {
        this.statusBar.backgroundColorByHexString("#9CAF24");
        this.headerColor.tint("#9CAF24");
      }

      // Sentry.io error logging
      // Set release version from app version
      if ((<any>window).cordova !== undefined) {
        this.appVersion.getVersionNumber().then(result => {
          Raven.setRelease(result)
        })
      }

      // check if we've seen intro
      this.configProvider.introHasSeen().then(
        hasSeenIntro => {
          // hide splash screen
          this.splashScreen.hide();

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

          if (hasSeenIntro) {
            // handle saved login
            // get saved login details
            this.configProvider.loginGet().then(
              result => {
                // check if we have any stored login information
                if (!result[0] || !result[1]) {
                  return;
                }

                // login
                this.mykiProvider.loginGetAccount(result[0], result[1])
                  .then()
                  .catch(error => {
                    // show error
                    let alert = this.alertCtrl.create({
                      title: 'Cannot log in',
                      subTitle: 'Could not log in with your saved login details. Please check your internet connection and account details.',
                      buttons: ['OK'],
                      enableBackdropDismiss: false
                    })
                    alert.present()
                  })
              }, error => {
                // no op
              })

            // if have seen intro, go to tabs page
            this.rootPage = TabsPage
            return
          }

          // if have not seen the intro, go to intro
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

  menuEnabled() {
    return this.mykiProvider.mykiAccount.loaded
  }

  userOptions() {
    let actionSheet = this.actionSheetCtrl.create({
      buttons: [
        {
          text: 'Log out',
          role: 'destructive',
          handler: () => {
            this.mykiProvider.logout()
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
}
