import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ViewController, NavParams, AlertController } from 'ionic-angular';
import { Myki } from '../../models/myki';
import { MykiProvider } from '../../providers/myki';
import * as $ from "jquery";
import Payment from "payment"

@Component({
  selector: 'page-topup',
  templateUrl: 'topup.html'
})
export class TopupPage {

  public state: TopUpState = TopUpState.Form
  public topupOptions: Myki.TopupOptions = new Myki.TopupOptions()
  public loadingTopUp: boolean = false;
  public loadingPay: boolean = false;
  public formTopupMoney: FormGroup;
  public formTopupPass: FormGroup;
  public formTopupPayCC: FormGroup;
  public formTopupPayReminder: FormGroup;
  public topupOrder: Myki.TopupOrder = new Myki.TopupOrder()

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
      moneyAmount: ['', [
        Validators.required,
        this.validateMoneyAmount
      ]]
    })

    this.formTopupPass = formBuilder.group({
      // field validation
      passDuration: ['', [
        Validators.required,
        this.validatePassDuration
      ]],
      zoneFrom: ['', [
        Validators.required
      ]],
      zoneTo: ['', [
        Validators.required
      ]],
    }, {
        // form validators
        validator: this.validateZones()
      })

    this.formTopupPayCC = formBuilder.group({
      card: ['', [
        Validators.required,
        this.validateCCNumber
      ]],
      expiry: ['', [
        Validators.required,
        this.validateCCExpiry
      ]],
      cvc: ['', [
        Validators.required
      ]],
    }, {
        validator: this.validateCreditCard()
      })

    this.formTopupPayReminder = formBuilder.group({
      reminderType: ['', [
        Validators.required
      ]],
      reminderEmail: ['', [
        Validators.pattern('^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$')
      ]],
      reminderMobile: [''],
    }, {
        validator: this.validateReminder()
      })
  }

  ionViewDidLoad() {
    // defaults
    this.topupOptions.moneyAmount = 10
    this.topupOptions.passDuration = 7
    this.topupOptions.zoneFrom = 1
    this.topupOptions.zoneTo = 2
    this.topupOptions.reminderType = Myki.TopupReminderType.Email

    // initialize top up
    this.loadingTopUp = true;
    this.mykiProvider.topupCardLoad(this.topupOptions).then(
      result => {
        this.loadingTopUp = false
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

    // set up payment fields
    Payment.formatCardNumber(<any>document.querySelector('ion-input.ccNumber input'))
    Payment.formatCardExpiry(<any>document.querySelector('ion-input.ccExpiry input'))
    Payment.formatCardCVC(<any>document.querySelector('ion-input.ccCVC input'))
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

  public zoneSelect() {
    // currently max zones 13 https://static.ptv.vic.gov.au/siteassets/PDFs/Maps/Network-maps/Regional-Network-Map_myki-zones_connections.pdf
    return Array.apply(null, { length: 13 }).map(function (value, index) {
      return (index + 1);
    });
  }

  public canOrder() {
    return (this.isTopupMoney() && this.formTopupMoney.valid) || (this.isTopupPass() && this.formTopupPass.valid)
  }

  public order() {
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

    // go to pay state
    this.loadingPay = true; // add loading
    this.state = TopUpState.Pay // set the page state
    // submit the order
    this.mykiProvider.topupCardOrder(this.topupOptions).then(
      result => {
        this.loadingPay = false     // remove loading
        this.topupOrder = result    // store the top up order we get back
      }, error => {
        // show error
        let alert = this.alertCtrl.create({
          title: 'Error ordering top up',
          subTitle: 'Please check your top up options',
          buttons: ['OK']
        })
        alert.present()
        // reset state
        this.state = TopUpState.Form
      }
    )
  }

  public stateForm() {
    return this.state === TopUpState.Form
  }

  public statePay() {
    return this.state === TopUpState.Pay
  }

  public canPay() {
    return (this.formTopupPayCC.valid && this.formTopupPayReminder.valid)
  }

  public pay() {
    // parse the month/year from the credit card expiry
    let expiry = Payment.fns.cardExpiryVal(this.topupOptions.ccExpiry)
    this.topupOptions.ccExpiryMonth = expiry.month
    this.topupOptions.ccExpiryYear = expiry.year

    console.log(this.topupOptions)
  }

  public isReminderEmail() {
    return this.topupOptions.reminderType === Myki.TopupReminderType.Email
  }

  public isReminderMobile() {
    return this.topupOptions.reminderType === Myki.TopupReminderType.Mobile
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

  private validateZones() {
    return (group: FormGroup): any => {
      let zoneFrom = parseInt(group.controls['zoneFrom'].value)
      let zoneTo = parseInt(group.controls['zoneTo'].value)

      if (zoneFrom > zoneTo)
        return { invalidZones: true }

      if (zoneTo === 1)
        return { zoneToInvalid: true }

      return null
    }
  }

  private validateCCNumber(control: FormControl) {
    if (!Payment.fns.validateCardNumber(control.value))
      return { invalidNumber: true }

    return null
  }

  private validateCCExpiry(control: FormControl) {
    if (!Payment.fns.validateCardExpiry(control.value))
      return { invalidExpiry: true }

    return null
  }

  private validateCreditCard() {
    return (group: FormGroup): any => {
      let cardNumber = group.controls['card'].value
      let cardCVC = group.controls['cvc'].value
      let cardType = Payment.fns.cardType(cardNumber)

      if (cardNumber && !(cardType === 'visa' || cardType === 'mastercard'))
        return { invalidCardType: true }

      if (!Payment.fns.validateCardCVC(cardCVC, cardType))
        return { invalidCVC: true }

      return null
    }
  }

  private validateReminder() {
    return (group: FormGroup): any => {
      let reminderType = group.controls['reminderType'].value
      let reminderEmail = group.controls['reminderEmail'].value
      let reminderMobile = group.controls['reminderMobile'].value

      if (reminderType === Myki.TopupReminderType.Email && !reminderEmail)
        return { emailRequired: true }

      if (reminderType === Myki.TopupReminderType.Mobile && !reminderMobile)
        return { mobileRequired: true }

      return null
    }
  }
}

export enum TopUpState {
  Form,
  Pay,
  Confirm
}