import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ViewController, NavParams, AlertController, ActionSheetController, LoadingController } from 'ionic-angular';
import { Myki } from '../../models/myki';
import { MykiProvider } from '../../providers/myki';
import * as $ from "jquery";
import { Firebase } from '@ionic-native/firebase'; ƒ
import '../../libs/jquery.payment.js'

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
  public transactionReference: string;

  constructor(
    public viewCtrl: ViewController,
    public navParams: NavParams,
    public mykiProvider: MykiProvider,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public actionSheetCtrl: ActionSheetController,
    public loadingCtrl: LoadingController,
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
        this.validateCCNumber
      ]],
      expiry: ['', [
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
        Validators.pattern('^[a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,15})$') // generic email validation
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
        // log event
        Firebase.logEvent("topup_load", {
          type: this.topupOptions.topupType.toString()
        })

        this.loadingTopUp = false
      }, error => {
        // log event
        Firebase.logEvent("topup_load_error", {
          type: this.topupOptions.topupType.toString()
        })

        // show error
        let alert = this.alertCtrl.create({
          title: 'Error loading top up',
          subTitle: 'Top up functionality is not available. Please check the myki website.',
          buttons: ['OK'],
          enableBackdropDismiss: false,
        })
        alert.present()
        // close modal
        this.viewCtrl.dismiss()
      }
    )

    // set up payment fields
    $('ion-input.ccNumber input').payment('formatCardNumber')
    $('ion-input.ccExpiry input').payment('formatCardExpiry')
    $('ion-input.ccCVC input').payment('formatCardCVC')

    // handle credit card ENTER behavior
    $("ion-input.ccNumber input").on('keydown', (e) => {
      if (e.which == 13) {
        // focus to password
        $("ion-input.ccExpiry input").focus()
      }
    })

    // handle expiry ENTER behavior
    $("ion-input.ccExpiry input").on('keydown', (e) => {
      if (e.which == 13) {
        // focus to password
        $("ion-input.ccCVC input").focus()
      }
    })
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
        title: 'Top up error',
        subTitle: 'Please correct the top up errors',
        buttons: ['OK'],
        enableBackdropDismiss: false,
      })
      alert.present()
    }

    // go to pay state
    this.loadingPay = true; // add loading
    this.state = TopUpState.Pay // set the page state
    // submit the order
    this.mykiProvider.topupCardOrder(this.topupOptions).then(
      result => {
        // log event
        Firebase.logEvent("topup_order", {
          type: this.topupOptions.topupType.toString()
        })

        this.loadingPay = false     // remove loading
        this.topupOrder = result    // store the top up order we get back
      }, error => {
        // log event
        Firebase.logEvent("topup_order_error", {
          type: this.topupOptions.topupType.toString()
        })

        // show error
        let alert = this.alertCtrl.create({
          title: 'Error ordering top up',
          subTitle: 'Please check your top up options',
          buttons: ['OK'],
          enableBackdropDismiss: false
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

  public stateSuccess() {
    return this.state === TopUpState.Success
  }

  public canPay() {
    return (this.formTopupPayCC.valid && this.formTopupPayReminder.valid)
  }

  public pay() {
    // log event
    Firebase.logEvent("topup_pay_confirm", {
      type: this.topupOptions.topupType.toString(),
      price: this.topupOrder.amount
    })

    let actionSheet = this.actionSheetCtrl.create({
      title: 'Confirm top up',
      buttons: [
        {
          text: `Pay $${this.topupOrder.amount}`,
          role: 'destructive',
          handler: () => {
            // start paying process
            this.confirmPay()
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

  private confirmPay() {
    let loading = this.loadingCtrl.create({
      spinner: 'crescent',
      content: 'Paying...'
    });

    loading.present();

    this.mykiProvider.topupCardPay(this.topupOptions).then(
      result => {
        // log event
        Firebase.logEvent("topup_pay_success", {
          type: this.topupOptions.topupType.toString(),
          price: this.topupOrder.amount
        })

        // successfully topped up
        loading.dismiss() // dismiss loading throbber
        this.state = TopUpState.Success // set the page state
        this.transactionReference = result // update transaction reference
        setTimeout(() => {
          $("ion-content.success ion-icon").addClass("animated") // animate face
        }, 200)
      },
      error => {
        // log event
        Firebase.logEvent("topup_pay_error", {
          type: this.topupOptions.topupType.toString(),
          price: this.topupOrder.amount
        })

        // error with payment
        // myki's site shits the fan and doesn't allow the user to do anything with the top up now
        // to workaround it we're going to set up a new myki topup with the same options we already have
        this.mykiProvider.topupCardLoad(this.topupOptions).then(() => {
          return this.mykiProvider.topupCardOrder(this.topupOptions)
        }).catch(() => {
          // something went wrong when we're reloading the top up
          // time to give up and send user back to the home screen
          loading.dismiss() // dismiss loading throbber
          let alert = this.alertCtrl.create({
            title: 'Error processing payment',
            subTitle: 'An error occured while topping up. Try again.',
            buttons: ['OK'],
            enableBackdropDismiss: false,
          })
          alert.present()
          this.close() // close modal
          throw new Error() // throwing so we're not continuing the promise
        }).then(() => {
          loading.dismiss()
          // show error
          let alert = this.alertCtrl.create({
            title: 'Error processing payment',
            subTitle: 'Check your credit card details.',
            buttons: ['OK'],
            enableBackdropDismiss: false,
          })
          alert.present()
        }).catch(() => {
          // noop handled earlier
        })
      }
    )
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
    if (!$.payment.validateCardNumber(control.value))
      return { invalidNumber: true }

    return null
  }

  private validateCCExpiry(control: FormControl) {
    let expiry = $.payment.cardExpiryVal(control.value !== undefined ? control.value : '') // can't validate undefined, so pass in empty string

    if (!$.payment.validateCardExpiry(expiry.month.toString(), expiry.year.toString()))
      return { invalidExpiry: true }

    return null
  }

  private validateCreditCard() {
    return (group: FormGroup): any => {
      let cardNumber = group.controls['card'].value
      let cardCVC = group.controls['cvc'].value
      let cardType = $.payment.cardType(cardNumber)

      if (cardNumber && !(cardType === 'visa' || cardType === 'mastercard'))
        return { invalidCardType: true }

      if (!$.payment.validateCardCVC(cardCVC, cardType))
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
  Success
}