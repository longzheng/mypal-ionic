import { Component } from '@angular/core';
import { Platform } from 'ionic-angular';
import { StatusBar, Splashscreen } from 'ionic-native';
import { ConfigProvider } from '../providers/config';
import { LoginPage } from '../pages/login/login';
import { IntroPage } from '../pages/intro/intro';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = null;

  constructor(
    public platform: Platform,
    public configProvider: ConfigProvider,
  ) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();

      if (platform.is('android')) {
        StatusBar.backgroundColorByHexString("#C4DB2D");
      }

      // check if we've seen intro
      this.configProvider.introHasSeen().then(
        result => {
          Splashscreen.hide();

          if (result)
            return this.rootPage = LoginPage;

          this.rootPage = IntroPage;
        })

    });
  }
}
