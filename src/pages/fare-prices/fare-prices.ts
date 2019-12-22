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
    // log event
    (<any>window).FirebasePlugin.logEvent("select_content", {
      "content_type": "view fare prices page",
      "item_id": "page_fare_prices"
    })

    // check if our account has loaded
    // if not, don't bother trying to select fare type
    if (!this.mykiProvider.mykiAccount.loaded)
      return

    // default to fare type for the card
    // if not a full fare card, show concession
    switch (this.mykiProvider.activeCard().type) {
      case "Full Fare":
      case "Commuter Club":
        this.fareType = "full";
        break;
      default:
        this.fareType = "concession";
        break;
    }
  }

  public isFull() {
    return this.fareType === "full";
  }

  public isConcession() {
    return this.fareType === "concession";
  }

  public is2020() {
    return new Date().getFullYear() >= 2020;
  }

}
