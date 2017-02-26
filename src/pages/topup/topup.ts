import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
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
  public formTopupMoney: FormGroup;
  public formTopupPass: FormGroup;

  constructor(
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public mykiProvider: MykiProvider,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
  ) {
    // get topup type from navigation parameter
    this.topupOptions.topupType = navParams.get('type')

    // initialize form groups
    this.formTopupMoney = formBuilder.group({
      moneyAmount: ['10', Validators.compose([Validators.required, this.validateMoneyAmount])]
    })

    this.formTopupPass = formBuilder.group({
      // field validation
      passDuration: ['7', Validators.compose([Validators.required, this.validatePassDuration])],
      zoneFrom: ['1', Validators.compose([Validators.required])],
      zoneTo: ['2', Validators.compose([Validators.required])],
    }, {
        // form validators
        validator: this.validateZones('zoneFrom', 'zoneTo')
      })
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

  public canNext() {
    return (this.isTopupMoney() && this.formTopupMoney.valid) || (this.isTopupPass() && this.formTopupPass.valid)
  }

  public next() {
    // if either of the forms are invalid
    if (
      (this.isTopupMoney() && !this.formTopupMoney.valid)
      || (this.isTopupPass() && !this.formTopupPass.valid)
    ) {
      // show error
      let alert = this.alertCtrl.create({
        title: 'Top up options error',
        subTitle: 'Please correct the errors ',
        buttons: ['OK']
      })
      alert.present()
    }
  }

  private validatePassDuration(control: FormControl) {
    if (
      control.value < 7
      || (control.value > 7 && control.value < 28)
      || control.value > 365
    )
      return { invalidPassDuration: true }

    return null
  }

  private validateMoneyAmount(control: FormControl) {
    if (
      control.value < 10
      || control.value > 250
    )
      return { invalidMoneyAmount: true }

    return null
  }

  private validateZones(from: string, to: string) {
    return (group: FormGroup) => {
      let zoneFrom = parseInt(group.controls[from].value)
      let zoneTo = parseInt(group.controls[to].value)

      if (zoneFrom > zoneTo)
        return { invalidZones: true }

      return null
    }
  }

}
