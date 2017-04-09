import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { MykiProvider } from '../../providers/myki';

@Component({
  selector: 'page-fare-prices',
  templateUrl: 'fare-prices.html'
})
export class FarePricesPage {

  public fareType: string = "full";

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public mykiProvider: MykiProvider,
  ) { }

  ionViewDidLoad() {
    // check if our account has loaded
    // if not, don't bother trying to select fare type
    if (!this.mykiProvider.mykiAccount.loaded)
      return

    // default to fare type for the card
    // if not a full fare card, show concession
    this.fareType = this.mykiProvider.activeCard().type === "Full Fare" ? "full" : "concession";
  }

  public isFull() {
    return this.fareType === "full";
  }

  public isConcession() {
    return this.fareType === "concession";
  }

}
