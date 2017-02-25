import { Component } from '@angular/core';
import { ViewController, NavParams, AlertController } from 'ionic-angular';
import { Myki } from '../../models/myki';
import { MykiProvider } from '../../providers/myki';

@Component({
  selector: 'page-topup',
  templateUrl: 'topup.html'
})
export class TopupPage {

  public topupOptions: Myki.TopupOptions = new Myki.TopupOptions()
  public loading: boolean = false;

  constructor(
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public mykiProvider: MykiProvider,
    public alertCtrl: AlertController,
  ) {
    this.topupOptions.topupType = navParams.get('type')
  }

  ionViewDidLoad() {
    // defaults
    this.topupOptions.moneyAmount = 10
    this.topupOptions.passDuration = 7
    this.topupOptions.zoneFrom = 1
    this.topupOptions.zoneTo = 2

    // initialize top up
    this.loading = true;
    this.mykiProvider.topupCardLoad(this.mykiProvider.activeCard(), this.topupOptions.topupType).then(
      result => {
        this.loading = false
      }, error => {
        // show error
        let alert = this.alertCtrl.create({
          title: 'Error loading top up',
          subTitle: 'Top up functionality is not available. Please check the myki website.',
          buttons: ['OK']
        })
        alert.present()
        // close modal
        this.viewCtrl.dismiss()
      }
    )
  }

  public close() {
    this.viewCtrl.dismiss()
  }

  public title() {
    return `Top up ${this.topupOptions.topupType === Myki.TopupType.Money ? 'money' : 'pass'}`
  }

  public isTopupMoney() {
    return this.topupOptions.topupType === Myki.TopupType.Money
  }

  public isTopupPass() {
    return this.topupOptions.topupType === Myki.TopupType.Pass
  }

  public moneySelect() {
    return Array.apply(null, { length: 25 }).map(function (value, index) {
      return (index + 1) * 10;
    });
  }

  public zoneSelect() {
    return Array.apply(null, { length: 81 }).map(function (value, index) {
      return (index + 1);
    });
  }

}
