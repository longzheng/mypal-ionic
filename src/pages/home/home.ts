import { Component } from '@angular/core';

import { NavController } from 'ionic-angular';

import { MykiProvider } from '../../providers/myki';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    public navCtrl: NavController,
    public mykiProvider: MykiProvider
  ) {
   
  }

}
