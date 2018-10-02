import { Injectable } from '@angular/core';
import { ConfigProvider } from './config';
import 'rxjs/add/operator/map';
import { Myki } from '../models/myki';
import * as $ from "jquery";
import * as moment from 'moment';
import Raven from 'raven-js';
import { HTTP, HTTPResponse } from '@ionic-native/http';
import { Platform } from 'ionic-angular';

@Injectable()
export class MykiProvider {

  // APi root for all requests
  apiDomain = "https://www.mymyki.com.au"
  apiRoot = `${this.apiDomain}/NTSWebPortal/`
  errorUrl = `${this.apiRoot}ErrorPage.aspx`

  // holders for ASP.NET page state properties
  private lastViewState = "";
  private lastEventValidation = "";
  private username = "";
  private password = "";
  private demoMode = false;

  // initialize new myki account
  mykiAccount = new Myki.Account();
  activeCardId = '';

  // Store login state
  loggingIn: boolean = false;
  loggedIn: boolean = false;

  constructor(
    public http: HTTP,
    public configProvider: ConfigProvider,
    public platform: Platform
  ) {
    // wait for platform to be ready
    platform.ready().then(() => {
      // set HTTP data serializer to form
      this.http.setDataSerializer("urlencoded");
      // disable redirect handler
      this.http.disableRedirect(true);
    });
  }

  setActiveCard(id: string) {
    console.log('setting active card')
    this.activeCardId = id;

    // if card isn't loaded yet, load it
    if (!this.activeCard().loaded)
      this.getCardDetails(this.activeCard())

    // if the history isn't loaded yet, load it
    if (!this.activeCard().transactionLoaded)
      this.getCardHistory(this.activeCard())

    // store last active card ID
    this.configProvider.activeCardSet(id)
  }

  activeCard() {
    if (this.activeCardId === '' || this.mykiAccount.cards.length === 0)
      return new Myki.Card;

    return this.mykiAccount.cards.find(x => x.id === this.activeCardId)
  }

  logout() {
    console.log('logging out')
    // reset state
    this.demoMode = false;
    this.loggedIn = false;
    this.activeCardId = '';
    this.mykiAccount.reset()
    // clear saved login
    this.configProvider.loginForget()
  }

  // log in to myki account
  login(username: string, password: string): Promise<Response> {
    console.log('logging in')

    // clear any existing cookies
    this.http.clearCookies();

    this.loggingIn = true

    // determine if we're in mock demo models
    if (username === 'demo' && password === 'demo') {
      this.demoMode = true;
      return this.mockHttpDelay(() => {
        this.mockLogin()
        this.loggingIn = false
      })
    }

    // specify the login endpoint
    let loginUrl = `${this.apiRoot}login.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(loginUrl).then(
        data => {
          // set up form fields
          const body = {};
          body['ctl00$uxContentPlaceHolder$uxUsername'] = username;
          body['ctl00$uxContentPlaceHolder$uxPassword'] = password;
          body['ctl00$uxContentPlaceHolder$uxLogin'] = 'Login';

          // post form fields
          this.httpPostFormAsp(loginUrl, body).then(
            data => {
              // scrape webpage
              let scraperJquery = this.jQueryHTML(data.data)

              // verify if we are actually logged in
              // successful login redirects us to the "Login-Services.aspx" page
              if (data.url !== `${this.apiRoot}Registered/MyMykiAccount.aspx?menu=My%20myki%20account`) {
                // scrape error
                let error = scraperJquery.find('#uxservererror').text().trim()

                // different errors
                switch (error) {
                  case 'Invalid Username/Password.':
                    return reject('login')
                  case 'Your account has been locked out.':
                    return reject('locked')
                  default:
                    return reject('login')
                }

              }

              console.log("logged in to account")
              this.loggedIn = true;

              // store the last username/password
              this.username = username;
              this.password = password;

              // scrape account holder
              try {
                this.mykiAccount.holder = scraperJquery.find('#ctl00_uxContentPlaceHolder_uxUserName').text()
              } catch (e) {
                console.error('error scraping account holder')
                console.log(data)
                throw e
              }
              return resolve();
            },
            error => {
              return reject();
            }
          ).then(() => { this.loggingIn = false })
        },
        error => {
          this.loggingIn = false
          return reject('network')
        })
    })
  }

  // login and get account details
  loginGetAccount(username: string, password: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      // try logging in
      this.login(username, password).then(
        result => {
          // for some reason we have to get the account details after logging in before we can do anything else
          this.getAccountDetails().then(
            result => {
              return resolve()
            }, error => {
              return reject('account')
            }
          )
        }, error => {
          return reject(error)
        })
    })
  }

  // re-login
  // the myki session might have expired
  relogin(): Promise<Response> {
    console.log('relogging in')
    return this.loginGetAccount(this.username, this.password)
  }

  getAccountDetails(): Promise<Response> {
    console.log('loading account details')

    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { this.mockAccountDetails() })
    }

    // specify the login endpoint
    let accountUrl = `${this.apiRoot}Registered/MyMykiAccount.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(accountUrl).then(
        data => {
          // check if we're redirected to error page
          if (data.url === this.errorUrl) {
            console.error('error loading account details (redirected to error page)')
            return reject()
          }

          // set up form fields
          const body = {}
          body['ctl00$uxContentPlaceHolder$uxTimer'] = ''

          // post form fields
          this.httpPostFormAsp(accountUrl, body).then(
            data => {
              console.log('loaded account details')

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data.data)

              // scrape active cards
              let activeCards = scraperJquery.find("#tabs-1 table tr").not(":first")

              // get card ids of active cards
              activeCards.each((index, elem) => {
                try {
                  var cardJquery = $(elem)
                  let cardId = cardJquery.find("td:nth-child(1)").text().trim();

                  // create or update card
                  let card = this.findOrInsertCardById(cardId)

                  card.status = Myki.CardStatus.Active;
                  card.holder = cardJquery.find("td:nth-child(2)").text().trim();

                  // process money
                  card.moneyBalance = parseFloat(cardJquery.find("td:nth-child(3)").text().trim().replace("$", ""));

                  // process pass
                  let passActive = cardJquery.find("td:nth-child(4)").text().trim();
                  if (passActive !== '' && passActive.includes('valid until')) {
                    card.passActive = passActive
                    card.passActiveExpiry = moment(passActive.split('valid until ')[1], "D MMM YY").toDate()
                  }
                } catch (e) {
                  console.error('error parsing active card')
                  console.log(elem)
                  throw e
                }
              })

              console.log(`found ${activeCards.length} active cards`)

              // scrape ianctive cards
              let inactiveCards = scraperJquery.find("#tabs-2 table tr").not(":first")

              // get card ids of active cards
              inactiveCards.each((index, elem) => {
                try {
                  var cardJquery = $(elem)
                  let cardId = cardJquery.find("td:nth-child(1)").text().trim();

                  // create or update card
                  let card = this.findOrInsertCardById(cardId)

                  // Set card status
                  card.setStatus(cardJquery.find("td:nth-child(3)").text().trim());

                  card.holder = cardJquery.find("td:nth-child(2)").text().trim();
                } catch (e) {
                  console.error('error parsing inactive card')
                  console.log(elem)
                  throw e
                }
              })

              console.log(`found ${inactiveCards.length} inactive cards`)

              this.mykiAccount.loaded = true

              // check if we have more than 1 card
              if (this.mykiAccount.cards.length === 0)
                return reject();

              // set last active card
              this.setLastActiveCard()

              return resolve();
            },
            error => {
              console.error('error loading account details (POST)')
              return reject();
            }
          )
        },
        error => {
          console.log('error loading account details (GET)')
          return reject()
        })
    })
  }

  getCardDetails(card: Myki.Card, loadHistory: boolean = false) {
    console.log('getting card details')

    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { this.mockCardDetails(card) })
    }

    // specify the login endpoint
    let cardUrl = `${this.apiRoot}Registered/ManageMyCard.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAspWithRetry(cardUrl).then(
        data => {
          // check if we're redirected to error page
          if (data.url === this.errorUrl) {
            console.error('error loading card details (redirected to error page)')
            return reject()
          }

          // set up form fields
          const body = {}
          body['ctl00$uxContentPlaceHolder$uxCardList'] = card.id
          body['ctl00$uxContentPlaceHolder$uxGo'] = 'Go'

          // post form fields
          this.httpPostFormAsp(cardUrl, body).then(
            data => {
              console.log('loaded card details')

              try {
                // scrape webpage
                let scraperJquery = this.jQueryHTML(data.data)
                let cardTable = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxCardDetailsPnl table");

                card.holder = cardTable.find("tr:nth-child(1) td:nth-child(2)").text().trim();
                card.type = cardTable.find("tr:nth-child(2) td:nth-child(2)").text().trim();
                card.expiry = moment(cardTable.find("tr:nth-child(3) td:nth-child(2)").text().trim(), "D MMM YYYY").toDate();
                card.status = Myki.CardStatus[cardTable.find("tr:nth-child(4) td:nth-child(2)").text().trim()];
                card.moneyBalance = parseFloat(cardTable.find("tr:nth-child(5) td:nth-child(2)").text().trim().replace("$", ""));
                card.moneyTopupInProgress = parseFloat(cardTable.find("tr:nth-child(6) td:nth-child(2)").text().trim().replace("$", ""));
                card.moneyTotalBalance = parseFloat(cardTable.find("tr:nth-child(7) td:nth-child(2)").text().trim().replace("$", ""));

                // process pass
                let passActive = cardTable.find("tr:nth-child(8) td:nth-child(2)").text().trim();
                if (passActive !== '' && passActive !== '-') {
                  card.passActive = passActive
                  card.passActiveExpiry = moment(passActive.split('Valid to ')[1], "D MMM YYYY").toDate()
                }

                let passInactive = cardTable.find("tr:nth-child(9) td:nth-child(2)").text().trim();
                if (passInactive !== '' && passInactive !== '-') {
                  card.passInactive = passInactive
                }

                let lastTransactionDate = moment(cardTable.find("tr:nth-child(10) td:nth-child(2)").text().trim(), "D MMM YYYY hh:mm:ss A")
                if (lastTransactionDate.isValid()) {
                  card.lastTransactionDate = lastTransactionDate.toDate();
                }

                card.autoTopup = cardTable.find("tr:nth-child(11) td:nth-child(2) li#ctl00_uxContentPlaceHolder_ModifyAutoload").length > 0;
              } catch (e) {
                console.error('error parsing card details')
                console.log(data)
                throw e
              }

              // load card history?
              if (loadHistory)
                this.getCardHistory(card);

              // set loading state
              card.loaded = true;

              return resolve();
            },
            error => {
              console.error('error loading card details (POST)')
              return reject();
            }
          )
        },
        error => {
          console.error('error loading card details (GET)')
          console.log(error)
          return reject()
        })
    })
  }

  getCardHistory(card: Myki.Card) {
    console.log('loading card history')

    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { this.mockCardHistory(card) })
    }

    // specify the login endpoint
    let historyUrl = `${this.apiRoot}Registered/MYTransactionsInfo.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAspWithRetry(historyUrl).then(
        data => {
          // check if we're redirected to error page
          if (data.url === this.errorUrl) {
            console.error('error loading card history (redirected to error page)')
            return reject()
          }

          // set up form fields
          const body = {}
          body['ctl00$uxContentPlaceHolder$uxCardList'] = card.id
          body['ctl00$uxContentPlaceHolder$uxPageSize'] = '40'
          body['ctl00$uxContentPlaceHolder$uxFromDay'] = '0'
          body['ctl00$uxContentPlaceHolder$uxFromMonth'] = '0'
          body['ctl00$uxContentPlaceHolder$uxFromYear'] = '0'
          body['ctl00$uxContentPlaceHolder$uxToDay'] = '0'
          body['ctl00$uxContentPlaceHolder$uxToMonth'] = '0'
          body['ctl00$uxContentPlaceHolder$uxToYear'] = '0'
          body['ctl00$uxContentPlaceHolder$uxSelectNewCard'] = 'Go'

          // post form fields
          this.httpPostFormAsp(historyUrl, body).then(
            data => {
              console.log('loaded card history')

              // clear existing card history
              card.transactions = [];

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data.data)

              let historyTable = scraperJquery.find("table#ctl00_uxContentPlaceHolder_uxMykiTxnHistory");

              // set loading state
              card.transactionLoaded = true;

              // check if any transction records existing
              // there is a table row with the CSS class "header"
              if (historyTable.find("tr.Header").length === -1) {
                console.log('no transactions exist')
                return resolve(); // no records exist, early exit
              }

              // loop over each transaction row
              historyTable.find("tr").not(":first").each((index, elem) => {
                var transJquery = $(elem)
                let trans = new Myki.Transaction();

                try {
                  // process date & time
                  let date = transJquery.find("td:nth-child(1)").text().trim()
                  let time = transJquery.find("td:nth-child(2)").text().trim()
                  trans.dateTime = moment(`${date} ${time}`, "DD/MM/YYYY HH:mm:ss").toDate()

                  // type
                  trans.setType(transJquery.find("td:nth-child(3)").text().trim().replace("*", "")) // remove * from transaction type

                  // service
                  trans.setService(transJquery.find("td:nth-child(4)").text().trim())

                  // zone
                  trans.zone = transJquery.find("td:nth-child(5)").text().trim()

                  // description
                  trans.description = transJquery.find("td:nth-child(6)").text().trim()

                  // credit
                  let credit = transJquery.find("td:nth-child(7)").text().trim().replace("-", "").replace("$", "") // remove "-" for empty fields and "$"
                  trans.credit = credit != "" ? parseFloat(credit) : null

                  // debit
                  let debit = transJquery.find("td:nth-child(8)").text().trim().replace("-", "").replace("$", "")
                  trans.debit = debit != "" ? parseFloat(debit) : null

                  // balance
                  let moneyBalance = transJquery.find("td:nth-child(9)").text().trim().replace("$", "")

                  // check if a blank entry which is "-"
                  trans.moneyBalance = moneyBalance != "-" ? parseFloat(moneyBalance) : null
                } catch (e) {
                  // log the transaction that failed
                  console.error('error parsing transaction')
                  console.log((<any>elem).outerHTML);
                  Raven.captureException(e); // don't throw again, we just want to do it silently
                }

                card.transactions.push(trans)
              })

              // sort transactions
              card.sortTransactions();

              // group transactions by date
              card.groupTransactions()

              return resolve();
            },
            error => {
              console.error('error loading card history (POST)')
              return reject();
            }
          )
        },
        error => {
          console.error('error loading card history (GET)')
          console.log(error)
          return reject()
        })
    })
  }

  topupCardLoad(topupOptions: Myki.TopupOptions) {
    console.log('loading top up')

    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { return Promise.resolve() })
    }

    // specify the topup endpoint
    let topupUrl = `${this.apiRoot}Registered/TopUp/ChooseTopUp.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAspWithRetry(topupUrl).then(
        data => {
          // check if we're redirected to error page
          if (data.url === this.errorUrl) {
            console.error('error loading top up (redirected to error page)')
            return reject()
          }

          console.log('POST top up')

          // we need to first do a AJAX call to get the "list" of cards before we can select one
          // set up form fields
          const body = {}
          body['__EVENTTARGET'] = 'ctl00$uxContentPlaceHolder$uxTimer';
          body['ctl00$uxContentPlaceHolder$uxTopup'] = topupOptions.topupType === Myki.TopupType.Money ? 'uxTopUpMoney' : 'uxTopUpPass';
          body['__EVENTARGUMENT'] = ''

          // post form fields
          this.httpPostFormAsp(topupUrl, body).then(
            data => {

              console.log('POST top up with card selected')

              // select our desired card
              // set up form fields
              const body = {}
              body['ctl00$uxContentPlaceHolder$uxCardlist'] = this.activeCard().id
              body['ctl00$uxContentPlaceHolder$uxTopup'] = topupOptions.topupType === Myki.TopupType.Money ? 'uxTopUpMoney' : 'uxTopUpPass'
              body['ctl00$uxContentPlaceHolder$uxSubmit'] = 'Next'
              body['__EVENTTARGET'] = ''
              body['__EVENTARGUMENT'] = ''

              // post form fields
              this.httpPostFormAsp(topupUrl, body).then(
                data => {

                  // sanity check we've got the right card
                  // scrape webpage
                  let scraperJquery = this.jQueryHTML(data.data)
                  let cardId = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxCardnumber").text();
                  if (cardId !== this.activeCard().id)
                    return reject()

                  // extract "cn" token from URL, we need this later
                  let cnToken = (<any>this.parseUrlQuery(data.url)).cn
                  // store "cn" token in topup options (with encoding so it doesn't need to re-encoded)
                  topupOptions.cnToken = encodeURIComponent(cnToken)

                  return resolve()
                },
                error => {
                  return reject();
                }
              )
            },
            error => {
              return reject();
            }
          )
        },
        error => {
          return reject()
        })
    })
  }

  topupCardOrder(options: Myki.TopupOptions): Promise<Myki.TopupOrder> {
    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { return Promise.resolve(this.mockTopupOrder(options)) })
    }

    // specify the topup endpoint
    let topupUrl = options.topupType === Myki.TopupType.Money ? `${this.apiRoot}Registered/TopUp/ChooseMykiMoneyTopUp.aspx` : `${this.apiRoot}Registered/TopUp/ChooseMykiPassTopUp.aspx`;

    // append the "cn" token which is important
    topupUrl += `?cn=${options.cnToken}`

    return new Promise((resolve, reject) => {

      // set up form fields
      const body = {}

      if (options.topupType === Myki.TopupType.Money) {
        body['ctl00$uxContentPlaceHolder$uxSelectedamount'] = ''
        body['ctl00$uxContentPlaceHolder$uxMaxtoopupAmount'] = ''
        body['ctl00$uxContentPlaceHolder$uxAmounts'] = 'Other amount'
        body['ctl00$uxContentPlaceHolder$uxAmountlist'] = parseInt(<any>options.moneyAmount).toString() // the amount we're actually topping up
        body['ctl00$uxContentPlaceHolder$uxSubmit'] = 'Next'
      }

      if (options.topupType === Myki.TopupType.Pass) {
        body['ctl00$uxContentPlaceHolder$uxMaxtoopupAmount'] = '250' // myki expects this value
        body['ctl00$uxContentPlaceHolder$uxSelectedamount'] = ''
        body['ctl00$uxContentPlaceHolder$uxdays'] = parseInt(<any>options.passDuration).toString() // the pass duration we're topping up
        body['ctl00$uxContentPlaceHolder$uxDurationtype'] = '2' // duration is in days (not weeks)
        body['ctl00$uxContentPlaceHolder$uxNumberOfDays'] = '1043'
        body['ctl00$uxContentPlaceHolder$uxExpiryDays'] = ''
        body['ctl00$uxContentPlaceHolder$uxMinDays'] = '0'
        body['ctl00$uxContentPlaceHolder$uxMaxDays'] = '0'
        body['ctl00$uxContentPlaceHolder$uxZonelist'] = (options.zoneFrom + 1).toString() // myki site wants zone with a N+1 index
        body['ctl00$uxContentPlaceHolder$uxZonesTo'] = (options.zoneTo + 1).toString() // myki site wants zone with a N+1 index
        body['ctl00$uxContentPlaceHolder$uxAmounts'] = ''
        body['ctl00$uxContentPlaceHolder$uxAmountlist'] = ''
        body['ctl00$uxContentPlaceHolder$uxNext'] = 'Next'
      }

      // post form fields
      this.httpPostFormAsp(topupUrl, body).then(
        data => {

          // sanity check we've got the right card
          // scrape webpage
          let scraperJquery = this.jQueryHTML(data.data)
          let cardId = scraperJquery.find("#ctl00_uxContentPlaceHolder_pnlCardDetails fieldset:nth-of-type(1) p:nth-of-type(1)").text().replace('myki card number', '').trim()
          if (cardId !== this.activeCard().id)
            return reject()

          let order = new Myki.TopupOrder()

          if (options.topupType === Myki.TopupType.Money) {
            order.description = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxMykimoney td:nth-of-type(1)").text().trim()
            order.amount = parseFloat(scraperJquery.find("#ctl00_uxContentPlaceHolder_uxMykimoney td:nth-of-type(2)").text().trim().replace('$', '').replace(',', '')) // remove $ and commas from value
          }

          if (options.topupType === Myki.TopupType.Pass) {
            order.description = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxMykiPass td:nth-of-type(1)").text().trim()
            order.amount = parseFloat(scraperJquery.find("#ctl00_uxContentPlaceHolder_uxMykiPass td:nth-of-type(2)").text().trim().replace('$', '').replace(',', '')) // remove $ and commas from value
            order.gstAmount = parseFloat(scraperJquery.find("#ctl00_uxContentPlaceHolder_uxGSTAmount td:nth-of-type(2)").text().trim().replace('$', '').replace(',', '')) // remove $ and commas from value
          }

          // update top up reminder options from the page
          options.reminderEmail = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxreminderemail").val().trim()
          options.reminderMobile = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxreminderMobile").val().trim()

          // extract "cn" token from URL, we need this later
          let cnToken = (<any>this.parseUrlQuery(data.url)).cn
          // store "cn" token in topup options
          options.cnToken = cnToken

          return resolve(order)
        },
        error => {
          return reject();
        }
      )
    })
  }

  topupCardPay(options: Myki.TopupOptions): Promise<string> {
    // determine if we're in mock demo models
    if (this.demoMode) {
      return this.mockHttpDelay(() => { return Promise.resolve('123456') })
    }

    // specify the topup endpoint
    let topupUrl = `${this.apiRoot}Registered/TopUp/TopUpReviewPayments.aspx`;

    // append the "cn" token which is important
    topupUrl += `?cn=${options.cnToken}`

    return new Promise((resolve, reject) => {

      // set up form fields
      const body = {}

      let reminderTypeString = ''
      switch (options.reminderType) {
        case Myki.TopupReminderType.Email:
          reminderTypeString = 'uxrdreimderEmail'
          break;
        case Myki.TopupReminderType.Mobile:
          reminderTypeString = 'uxrdreminderPhone'
          break;
        case Myki.TopupReminderType.None:
          reminderTypeString = 'uxrdreminderNone'
          break;
      }

      body['ctl00$uxContentPlaceHolder$uxCreditCardNumber1'] = options.ccNumberNoSpaces().substr(0, 4)
      body['ctl00$uxContentPlaceHolder$uxCreditCardNumber2'] = options.ccNumberNoSpaces().substr(4, 4)
      body['ctl00$uxContentPlaceHolder$uxCreditCardNumber3'] = options.ccNumberNoSpaces().substr(8, 4)
      body['ctl00$uxContentPlaceHolder$uxCreditCardNumber4'] = options.ccNumberNoSpaces().substr(12, 4)
      body['ctl00$uxContentPlaceHolder$uxMonthList'] = options.ccExpiryMonth()
      body['ctl00$uxContentPlaceHolder$uxYearList'] = options.ccExpiryYear()
      body['ctl00$uxContentPlaceHolder$uxSecurityCode'] = options.creditCard.ccCVC
      body['ctl00$uxContentPlaceHolder$reimnder'] = reminderTypeString
      body['ctl00$uxContentPlaceHolder$uxreminderemail'] = options.reminderEmail
      body['ctl00$uxContentPlaceHolder$uxreminderMobile'] = options.reminderMobile
      body['ctl00$uxContentPlaceHolder$uxSubmit'] = 'Next'

      // post form fields
      this.httpPostFormAsp(topupUrl, body).then(
        data => {

          // sanity check we've got the right card
          // scrape webpage
          let scraperJquery = this.jQueryHTML(data.data)
          let cardId = scraperJquery.find("#ctl00_uxContentPlaceHolder_pnlCardDetails fieldset:nth-of-type(1) p:nth-of-type(1)").text().replace('myki card number', '').trim()
          if (cardId !== this.activeCard().id)
            return reject()

          // oh boy the stars are aligning, we're about to submit a top up request for reals now

          // specify the topup endpoint
          let topupConfirmUrl = `${this.apiRoot}Registered/TopUp/TopupReviewConfirmation.aspx`;

          // append the "cn" token which is important
          topupConfirmUrl += `?cn=${options.cnToken}`

          // set up form fields
          const body = {}

          body['ctl00$uxContentPlaceHolder$uxSubmit'] = 'Submit'
          body['ctl00$uxContentPlaceHolder$hdnsubmitMsg'] = 'Your payment is being processed. Please do not resubmit payment, close this window or click the Back button on your browser.'
          body['ctl00$uxHeader$uxSearchTextBox'] = ''
          body['ctl00$uxHeader$hidFontSize'] = ''
          body['ctl00$uxContentPlaceHolder$hdnCardNo'] = ''
          body['ctl00$uxContentPlaceHolder$hdnselectedDate'] = ''

          // post form fields
          this.httpPostFormAsp(topupConfirmUrl, body).then(
            data => {
              // sanity check confirmation URL
              if (data.url !== `${this.apiRoot}Registered/TopUp/TopUpConfirmation.aspx`)
                return reject()

              // HUGE SUCCESS 
              //                           ,:/+/-
              //             /M/              .,-=;//;-
              //        .:/= ;MH/,    ,=/+%$XH@MM#@:
              //       -$##@+$###@H@MMM#######H:.    -/H#
              //  .,H@H@ X######@ -H#####@+-     -+H###@X
              //   .,@##H;      +XM##M/,     =%@###@X;-
              // X%-  :M##########$.    .:%M###@%:
              // M##H,   +H@@@$/-.  ,;$M###@%,          -
              // M####M=,,---,.-%%H####M$:          ,+@##
              // @##################@/.         :%H##@$-
              // M###############H,         ;HM##M$=
              // #################.    .=$M##M$=
              // ################H..;XM##M$=          .:+
              // M###################@%=           =+@MH%
              // @#################M/.         =+H#X%=
              // =+M###############M,      ,/X#H+:,
              //   .;XM###########H=   ,/X#H+:;
              //      .=+HM#######M+/+HM@+=.
              //          ,:/%XM####H/.
              //               ,.:=-.
              // we've successfully topped up

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data.data)
              let transactionReference = scraperJquery.find("#content  fieldset:nth-of-type(1) p:nth-of-type(2) b").text().trim()

              // if we purchased myki money, store how much we have on order
              if (options.topupType === Myki.TopupType.Money)
                this.activeCard().moneyTopUpAppPurchased = (this.activeCard().moneyTopUpAppPurchased || 0) + options.moneyAmount

              return resolve(transactionReference)
            },
            error => {
              return reject();
            })
        },
        error => {
          return reject();
        }
      )
    })
  }

  private httpGetAspWithRetry(url: string): Promise<HTTPResponse> {
    return new Promise((resolve, reject) => {
      // first try http get
      this.httpGetAsp(url).then(
        result => {
          // success
          return resolve(result)
        }
      ).catch(error => {
        if (error === "session") {
          console.log('session error, going to try relogging in')
          // session error
          // we want to try logging in and then retrying
          this.relogin().then(
            result => {
              // retry HTTP GET request
              this.httpGetAsp(url).then(
                result => {
                  return resolve(result)
                }, error => {
                  return reject(error)
                }
              )
            }, error => {
              return reject(error)
            }
          )
        } else {
          // some other error
          return reject(error)
        }
      })
    })
  }

  private httpGetAsp(url: string): Promise<HTTPResponse> {
    // // set up request options
    // const options = new RequestOptions()
    // options.withCredentials = true // set/send cookies

    return new Promise((resolve, reject) => {
      this.http.get(url, {}, {}).then(
        data => {
          // if the page we landed on is not the page we requested
          if (data.url !== url) {
            console.error('error HTTP GET page (redirected to another URL)')
            return reject("session")
          }

          // update the page state
          this.storePageState(data.data);

          return resolve(data);
        }).catch(error => {
          return reject(error);
        })
    })
  }

  private httpPostFormAsp(url: string, body?: Object): Promise<HTTPResponse> {
    // // set up request options
    // const options = new RequestOptions()
    // options.withCredentials = true // set/send cookies
    // options.headers = headers

    // set up POST body
    let data = {};
    data['__VIEWSTATE'] = this.lastViewState;
    data['__EVENTVALIDATION'] = this.lastEventValidation;
    // if we have any supplied body param, add it to our POST body
    if (body != null) {
      Object.assign(data, body)
    }

    return new Promise((resolve, reject) => {
      this.http.post(url, data, {}).then(
        data => {
          // update the page state
          this.storePageState(data.data);

          return resolve(data);
        }).catch(
          error => {
            // if response is a redirect
            if (error.status > 300 && error.status < 400) {
              // get redirect path
              let redirectPath: string = error.headers['location'];

              // fix up some redirect URL with spaces (it should have been urlencoded, but it's not)
              redirectPath = redirectPath.replace(/\s/g, '%20');

              // prepend the domain name
              let redirectUrl = `${this.apiDomain}${redirectPath}`

              this.httpGetAsp(redirectUrl).then(
                data => {
                  return resolve(data);
                }, error => {
                  return reject(error);
                });
            } else {
              return reject(error);
            }
          }
        )
    })
  }

  // parse URL querystrings
  // adapted from http://stackoverflow.com/a/14368860
  private parseUrlQuery(url) {
    // remove any preceding url and split
    url = url.substring(url.indexOf('?') + 1).split('&');
    var params = {}, pair, d = decodeURIComponent;
    // march and parse
    for (var i = url.length - 1; i >= 0; i--) {
      pair = url[i].split('=');
      params[d(pair[0])] = d(pair[1] || '');
    }
    return params
  }

  private jQueryHTML(html: string): JQuery {
    let scraper = (<any>document).implementation.createHTMLDocument()
    scraper.body.innerHTML = html
    return $(scraper.body.children)
  }

  private storePageState(html: string) {
    let scraperJquery = this.jQueryHTML(html)
    let viewState = scraperJquery.find('#__VIEWSTATE').val()
    let eventValidation = scraperJquery.find('#__EVENTVALIDATION').val()

    // only update viewState if there was a response
    if (viewState)
      this.lastViewState = viewState

    this.lastEventValidation = eventValidation

  }

  private findOrInsertCardById(cardId: string): Myki.Card {
    let cards = this.mykiAccount.cards;
    let oldCard = cards.findIndex(x => { return x.id === cardId })

    // if not found, create a new card and return index
    if (oldCard === -1) {
      let newCard = new Myki.Card();
      newCard.id = cardId;
      cards.push(newCard)
      return cards[cards.length - 1]
    }

    // if found, return index of existing card
    return cards[oldCard]
  }

  private setLastActiveCard() {
    // get stored active card id
    this.configProvider.activeCardGet().then(
      cardId => {
        let activeCardFound = false
        // if there is an active card id stored, see if it exists in the current account
        activeCardFound = this.mykiAccount.cards.findIndex(x => x.id === cardId) !== -1

        if (activeCardFound) {
          // set active card to stored active card
          this.setActiveCard(cardId)
        } else {
          // set active card to first card
          this.setActiveCard(this.mykiAccount.cards[0].id)
        }
      }, error => {
        // set active card to first card
        this.setActiveCard(this.mykiAccount.cards[0].id)
      })
  }

  private mockHttpDelay<T>(func) {
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        return resolve(func())
      }, 1000)
    })
  }

  private mockLogin() {
    this.mykiAccount.holder = "Demo account"
    this.loggedIn = true
  }

  private mockAccountDetails() {
    let card1 = this.findOrInsertCardById('308412345678901')
    card1.status = Myki.CardStatus.Active
    card1.holder = this.mykiAccount.holder
    card1.moneyBalance = 70.18
    card1.passActive = "7 days, \n Zone 1-Zone 2,\n valid until " + moment().add(2, 'days').format("D MMM YY") + " 03:00:00 AM"
    card1.passActiveExpiry = moment().add(2, 'days').hours(3).toDate()

    let card2 = this.findOrInsertCardById('308412345678902')
    card2.status = Myki.CardStatus.Active
    card2.holder = this.mykiAccount.holder
    card2.moneyBalance = 0.5

    let card3 = this.findOrInsertCardById('308412345678903')
    card3.status = Myki.CardStatus.Replaced
    card3.holder = this.mykiAccount.holder
    card3.moneyBalance = 0

    this.mykiAccount.loaded = true
    this.setLastActiveCard()
  }

  private mockCardDetails(card: Myki.Card) {
    switch (card.id) {
      case '308412345678901':
        card.loaded = true
        card.passActive = "7 days , Zone 1-Zone 2.Valid to " + moment().add(2, 'days').format("D MMM YYYY") + " 03:00:00 AM"
        card.passInactive = ""
        card.type = "Full Fare"
        card.expiry = new Date("2020-01-04T14:00:00.000Z")
        card.moneyTopupInProgress = 10
        card.moneyTotalBalance = 70.18
        card.lastTransactionDate = new Date("2017-02-14T00:25:47.000Z")
        card.autoTopup = true
        break;
      case '308412345678902':
        card.loaded = true
        card.type = "Children"
        card.status = Myki.CardStatus.Blocked
        card.expiry = new Date("2018-12-21T14:00:00.000Z")
        card.moneyTotalBalance = 0.5
        card.lastTransactionDate = new Date("2017-01-02T23:11:24.000Z")
        break;
      case '308412345678903':
        card.loaded = true
        card.type = "Concession"
        card.moneyTopupInProgress = 0
        break;
      default:
        throw new Error('Invalid card')
    }
  }

  private mockCardHistory(card: Myki.Card) {
    card.transactionLoaded = true

    let stubTransactions: Array<Myki.Transaction> = JSON.parse('[{"dateTime":"2017-02-14T01:25:47.000Z","type":4,"service":5,"zone":"","description":"Springvale Station","credit":6,"debit":null,"moneyBalance":63.21},{"dateTime":"2017-02-14T00:25:47.000Z","type":1,"service":1,"zone":"1/2","description":"Flinders Street Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:43:17.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:43:17.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:31:47.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:31:47.000Z","type":4,"service":1,"zone":"1","description":"Southern Cross Station","credit":2,"debit":null,"moneyBalance":70.18},{"dateTime":"2017-02-13T23:31:47.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T09:12:43.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T00:26:39.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:42:42.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:42:42.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:30:17.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:30:17.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T09:13:35.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:46:31.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:02:37.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:02:37.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-09T08:25:09.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-09T00:34:45.000Z","type":1,"service":1,"zone":"1","description":"Flinders Street Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:41:01.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:41:01.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:30:36.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":4.1,"moneyBalance":70.18},{"dateTime":"2017-02-08T23:30:36.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:30:36.000Z","type":3,"service":5,"zone":"-","description":"7 Days  Zone 1-2 ($41.00)","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T09:05:41.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T00:33:26.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":1.3,"moneyBalance":74.28},{"dateTime":"2017-02-07T23:40:12.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T23:40:12.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":2.8,"moneyBalance":75.58},{"dateTime":"2017-02-07T23:28:41.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T23:28:41.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T09:28:47.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T00:26:07.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:37:58.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:37:58.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:29:04.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:29:04.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T08:35:46.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T00:29:18.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:43:38.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:43:38.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:25:19.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null}]')

    for (let stubTransaction of stubTransactions) {
      let transaction = new Myki.Transaction()
      for (let prop in stubTransaction) {
        if (prop === 'dateTime') {
          transaction.dateTime = new Date(stubTransaction.dateTime)
        }

        transaction[prop] = stubTransaction[prop];
      }
      card.transactions.push(transaction)
    }

    // sort transactions
    card.sortTransactions();

    // group transactions by date
    card.groupTransactions()
  }

  private mockTopupOrder(options: Myki.TopupOptions): Myki.TopupOrder {
    // update myki order 
    options.reminderEmail = 'john@doe.com'
    options.reminderMobile = '0412345678'

    // return data
    return {
      description: "myki pass(7 Days - Zone 1 - Zone 2 )",
      amount: 41,
      gstAmount: 3.73
    }
  }
}
