import { Injectable } from '@angular/core';
import { Http, Response, Headers, URLSearchParams, RequestOptions } from '@angular/http';
import { ConfigProvider } from './config';
import 'rxjs/add/operator/map';
import { Myki } from '../models/myki';
import { CustomURLEncoder } from '../models/customUrlEncoder';
import * as $ from "jquery";
import * as moment from 'moment';

@Injectable()
export class MykiProvider {

  // APi root for all requests
  apiRoot = "https://www.mymyki.com.au/NTSWebPortal/"
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

  constructor(
    public http: Http,
    public configProvider: ConfigProvider
  ) {
  }

  setActiveCard(id: string) {
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
    if (this.activeCardId === '')
      return new Myki.Card;

    return this.mykiAccount.cards.find(x => x.id === this.activeCardId)
  }

  logout() {
    // clear saved login
    this.configProvider.loginForget()
  }

  reset() {
    // clear current state
    this.mykiAccount = new Myki.Account()
  }

  // log in to myki account
  login(username: string, password: string): Promise<Response> {
    // determine if we're in mock demo models
    if (username === 'demo' && password === 'demo') {
      this.demoMode = true;
      return this.mockHttpDelay(() => { this.mockLogin() })
    }

    // specify the login endpoint
    let loginUrl = `${this.apiRoot}login.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(loginUrl).then(
        data => {
          // set up form fields
          const body = new URLSearchParams()
          body.set('ctl00$uxContentPlaceHolder$uxUsername', username)
          body.set('ctl00$uxContentPlaceHolder$uxPassword', password)
          body.set('ctl00$uxContentPlaceHolder$uxLogin', 'Login')

          // post form fields
          this.httpPostFormAsp(loginUrl, body).then(
            data => {
              // verify if we are actually logged in
              // successful login redirects us to the "Login-Services.aspx" page
              if (data.url !== `${this.apiRoot}Registered/MyMykiAccount.aspx?menu=My%20myki%20account`)
                return reject()

              // store the last username/password
              this.username = username;
              this.password = password;

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data)

              // scrape account holder
              this.mykiAccount.holder = scraperJquery.find('#ctl00_uxContentPlaceHolder_uxUserName').text()

              return resolve();
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

  // re-login
  // the myki session might have expired
  relogin(): Promise<Response> {
    return new Promise((resolve, reject) => {
      // try logging in
      this.login(this.username, this.password).then(
        result => {
          // for some reason we have to get the account details after logging in before we can do anything else
          this.getAccountDetails().then(
            result => {
              return resolve()
            }, error => {
              return reject(error)
            }
          )
        }, error => {
          return reject(error)
        })
    })
  }

  getAccountDetails(): Promise<Response> {
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
          if (data.url === this.errorUrl)
            return reject()

          // set up form fields
          const body = new URLSearchParams()
          body.set('ctl00$uxContentPlaceHolder$uxTimer', '')

          // post form fields
          this.httpPostFormAsp(accountUrl, body).then(
            data => {
              // scrape webpage
              let scraperJquery = this.jQueryHTML(data)

              // scrape active cards
              let activeCards = scraperJquery.find("#tabs-1 table tr").not(":first")

              // get card ids of active cards
              activeCards.each((index, elem) => {
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
                if (passActive !== '') {
                  card.passActive = passActive
                  card.passActiveExpiry = moment(passActive.split('valid until ')[1], "D MMM YY").toDate()
                }
              })

              // scrape ianctive cards
              let inactiveCards = scraperJquery.find("#tabs-2 table tr").not(":first")

              // get card ids of active cards
              inactiveCards.each((index, elem) => {
                var cardJquery = $(elem)
                let cardId = cardJquery.find("td:nth-child(1)").text().trim();

                // create or update card
                let card = this.findOrInsertCardById(cardId)

                card.status = Myki.CardStatus.Replaced;
                card.holder = cardJquery.find("td:nth-child(2)").text().trim();
              })

              return resolve();
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

  getCardDetails(card: Myki.Card, loadHistory: boolean = false) {
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
          if (data.url === this.errorUrl)
            return reject()

          // set up form fields
          const body = new URLSearchParams()
          body.set('ctl00$uxContentPlaceHolder$uxCardList', card.id)
          body.set('ctl00$uxContentPlaceHolder$uxGo', 'Go')

          // post form fields
          this.httpPostFormAsp(cardUrl, body).then(
            data => {
              // scrape webpage
              let scraperJquery = this.jQueryHTML(data)
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
              if (passInactive !== '' && passInactive !== '-')
                card.passInactive = passInactive

              card.lastTransactionDate = moment(cardTable.find("tr:nth-child(10) td:nth-child(2)").text().trim(), "D MMM YYYY hh:mm:ss A").toDate();

              card.autoTopup = cardTable.find("tr:nth-child(11) td:nth-child(2) li#ctl00_uxContentPlaceHolder_ModifyAutoload").length > 0;

              // load card history?
              if (loadHistory)
                this.getCardHistory(card);

              // set loading state
              card.loaded = true;

              return resolve();
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

  getCardHistory(card: Myki.Card) {
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
          if (data.url === this.errorUrl)
            return reject()

          // set up form fields
          const body = new URLSearchParams()
          body.set('ctl00$uxContentPlaceHolder$uxCardList', card.id)
          body.set('ctl00$uxContentPlaceHolder$uxPageSize', '40')
          body.set('ctl00$uxContentPlaceHolder$uxFromDay', '0')
          body.set('ctl00$uxContentPlaceHolder$uxFromMonth', '0')
          body.set('ctl00$uxContentPlaceHolder$uxFromYear', '0')
          body.set('ctl00$uxContentPlaceHolder$uxToDay', '0')
          body.set('ctl00$uxContentPlaceHolder$uxToMonth', '0')
          body.set('ctl00$uxContentPlaceHolder$uxToYear', '0')
          body.set('ctl00$uxContentPlaceHolder$uxSelectNewCard', 'Go')

          // post form fields
          this.httpPostFormAsp(historyUrl, body).then(
            data => {
              // clear existing card history
              card.transactions = [];

              // scrape webpage
              let scraperJquery = this.jQueryHTML(data)

              let historyTable = scraperJquery.find("table#ctl00_uxContentPlaceHolder_uxMykiTxnHistory");

              // set loading state
              card.transactionLoaded = true;

              // check if any transction records existing
              // there is a table row with the CSS class "header"
              if (historyTable.find("tr.Header").length === -1)
                return resolve(); // no records exist, early exit

              // loop over each transaction row
              historyTable.find("tr").not(":first").each((index, elem) => {
                var transJquery = $(elem)
                let trans = new Myki.Transaction();

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
                let moneyBalance = transJquery.find("td:nth-child(9)").text().trim().replace("-", "").replace("$", "")
                trans.moneyBalance = moneyBalance != "" ? parseFloat(moneyBalance) : null

                card.transactions.push(trans)
              })

              // sort transactions
              card.sortTransactions();

              // group transactions by date
              card.groupTransactions()

              return resolve();
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

  topupCardLoad(topupOptions: Myki.TopupOptions) {
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
          if (data.url === this.errorUrl)
            return reject()

          // we need to first do a AJAX call to get the "list" of cards before we can select one
          // set up form fields
          const body = new URLSearchParams()
          body.set('__EVENTTARGET', 'ctl00$uxContentPlaceHolder$uxTimer')
          body.set('ctl00$uxContentPlaceHolder$uxTopup', topupOptions.topupType === Myki.TopupType.Money ? 'uxTopUpMoney' : 'uxTopUpPass')
          body.set('__EVENTARGUMENT', '')

          // post form fields
          this.httpPostFormAsp(topupUrl, body).then(
            data => {

              // select our desired card
              // set up form fields
              const body = new URLSearchParams()
              body.set('ctl00$uxContentPlaceHolder$uxCardlist', this.activeCard().id)
              body.set('ctl00$uxContentPlaceHolder$uxTopup', topupOptions.topupType === Myki.TopupType.Money ? 'uxTopUpMoney' : 'uxTopUpPass')
              body.set('ctl00$uxContentPlaceHolder$uxSubmit', 'Next')
              body.set('__EVENTTARGET', '')
              body.set('__EVENTARGUMENT', '')

              // post form fields
              this.httpPostFormAsp(topupUrl, body).then(
                data => {

                  // sanity check we've got the right card
                  // scrape webpage
                  let scraperJquery = this.jQueryHTML(data)
                  let cardId = scraperJquery.find("#ctl00_uxContentPlaceHolder_uxCardnumber").text();
                  if (cardId !== this.activeCard().id)
                    return reject()

                  // extract "cn" token from URL, we need this later
                  let cnToken = (<any>this.parseUrlQuery(data.url)).cn
                  // store "cn" token in topup options
                  topupOptions.cnToken = cnToken

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
      const body = new URLSearchParams()

      if (options.topupType === Myki.TopupType.Money) {
        body.set('ctl00$uxContentPlaceHolder$uxSelectedamount', '')
        body.set('ctl00$uxContentPlaceHolder$uxMaxtoopupAmount', '')
        body.set('ctl00$uxContentPlaceHolder$uxAmounts', 'Other amount')
        body.set('ctl00$uxContentPlaceHolder$uxAmountlist', parseInt(<any>options.moneyAmount).toString()) // the amount we're actually topping up
        body.set('ctl00$uxContentPlaceHolder$uxSubmit', 'Next')
      }

      if (options.topupType === Myki.TopupType.Pass) {
        body.set('ctl00$uxContentPlaceHolder$uxMaxtoopupAmount', '250') // myki expects this value
        body.set('ctl00$uxContentPlaceHolder$uxSelectedamount', '')
        body.set('ctl00$uxContentPlaceHolder$uxdays', parseInt(<any>options.passDuration).toString()) // the pass duration we're topping up
        body.set('ctl00$uxContentPlaceHolder$uxDurationtype', '2') // duration is in days (not weeks)
        body.set('ctl00$uxContentPlaceHolder$uxNumberOfDays', '1043')
        body.set('ctl00$uxContentPlaceHolder$uxExpiryDays', '')
        body.set('ctl00$uxContentPlaceHolder$uxMinDays', '0')
        body.set('ctl00$uxContentPlaceHolder$uxMaxDays', '0')
        body.set('ctl00$uxContentPlaceHolder$uxZonelist', (options.zoneFrom + 1).toString()) // myki site wants zone with a N+1 index
        body.set('ctl00$uxContentPlaceHolder$uxZonesTo', (options.zoneTo + 1).toString()) // myki site wants zone with a N+1 index
        body.set('ctl00$uxContentPlaceHolder$uxAmounts', '')
        body.set('ctl00$uxContentPlaceHolder$uxAmountlist', '')
        body.set('ctl00$uxContentPlaceHolder$uxNext', 'Next')
      }

      // post form fields
      this.httpPostFormAsp(topupUrl, body).then(
        data => {

          // sanity check we've got the right card
          // scrape webpage
          let scraperJquery = this.jQueryHTML(data)
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
      const body = new URLSearchParams()

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

      body.set('ctl00$uxContentPlaceHolder$uxCreditCardNumber1', options.ccNumberNoSpaces().substr(0, 4))
      body.set('ctl00$uxContentPlaceHolder$uxCreditCardNumber2', options.ccNumberNoSpaces().substr(4, 4))
      body.set('ctl00$uxContentPlaceHolder$uxCreditCardNumber3', options.ccNumberNoSpaces().substr(8, 4))
      body.set('ctl00$uxContentPlaceHolder$uxCreditCardNumber4', options.ccNumberNoSpaces().substr(12, 4))
      body.set('ctl00$uxContentPlaceHolder$uxMonthList', options.ccExpiryMonth())
      body.set('ctl00$uxContentPlaceHolder$uxYearList', options.ccExpiryYear())
      body.set('ctl00$uxContentPlaceHolder$uxSecurityCode', options.ccCVC)
      body.set('ctl00$uxContentPlaceHolder$reimnder', reminderTypeString)
      body.set('ctl00$uxContentPlaceHolder$uxreminderemail', options.reminderEmail)
      body.set('ctl00$uxContentPlaceHolder$uxreminderMobile', options.reminderMobile)
      body.set('ctl00$uxContentPlaceHolder$uxSubmit', 'Next')

      // post form fields
      this.httpPostFormAsp(topupUrl, body).then(
        data => {

          // sanity check we've got the right card
          // scrape webpage
          let scraperJquery = this.jQueryHTML(data)
          let cardId = scraperJquery.find("#ctl00_uxContentPlaceHolder_pnlCardDetails fieldset:nth-of-type(1) p:nth-of-type(1)").text().replace('myki card number', '').trim()
          if (cardId !== this.activeCard().id)
            return reject()

          // oh boy the stars are aligning, we're about to submit a top up request for reals now

          // specify the topup endpoint
          let topupConfirmUrl = `${this.apiRoot}Registered/TopUp/TopupReviewConfirmation.aspx`;

          // append the "cn" token which is important
          topupConfirmUrl += `?cn=${options.cnToken}`

          // set up form fields
          const body = new URLSearchParams()

          body.set('ctl00$uxContentPlaceHolder$uxSubmit', 'Submit')
          body.set('ctl00$uxContentPlaceHolder$hdnsubmitMsg', 'Your payment is being processed. Please do not resubmit payment, close this window or click the Back button on your browser.')
          body.set('ctl00$uxHeader$uxSearchTextBox', '')
          body.set('ctl00$uxHeader$hidFontSize', '')
          body.set('ctl00$uxContentPlaceHolder$hdnCardNo', '')
          body.set('ctl00$uxContentPlaceHolder$hdnselectedDate', '')

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
              let scraperJquery = this.jQueryHTML(data)
              let transactionReference = scraperJquery.find("#content  fieldset:nth-of-type(1) p:nth-of-type(2) b").text().trim()

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

  private httpGetAspWithRetry(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      // first try http get
      this.httpGetAsp(url).then(
        result => {
          // success
          return resolve(result)
        }
      ).catch(error => {
        if (error === "session") {
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

  private httpGetAsp(url: string): Promise<Response> {
    // set up request options
    const options = new RequestOptions()
    options.withCredentials = true // set/send cookies

    return new Promise((resolve, reject) => {
      this.http.get(url, options).subscribe(
        data => {
          // if the page we landed on is not the page we requested
          if (data.url !== url)
            return reject("session")

          // update the page state
          this.storePageState(data);

          return resolve(data);
        },
        error => {
          return reject(error);
        }
      )
    })
  }

  private httpPostFormAsp(url: string, body?: URLSearchParams): Promise<Response> {
    // set up request headers
    let headers = new Headers()
    headers.append('Content-Type', 'application/x-www-form-urlencoded') // we're going to submit form data

    // set up request options
    const options = new RequestOptions()
    options.withCredentials = true // set/send cookies
    options.headers = headers

    // set up POST body
    const postBody = new URLSearchParams('', new CustomURLEncoder())
    postBody.set('__VIEWSTATE', this.lastViewState)
    postBody.set('__EVENTVALIDATION', this.lastEventValidation)
    // if we have any supplied body param, add it to our POST body
    if (body != null) {
      postBody.setAll(body)
    }

    return new Promise((resolve, reject) => {
      this.http.post(url, postBody.toString(), options).subscribe(
        data => {
          // update the page state
          this.storePageState(data);

          return resolve(data);
        },
        error => {
          return reject(error);
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

  private jQueryHTML(data: any): JQuery {
    let scraper = (<any>document).implementation.createHTMLDocument()
    scraper.body.innerHTML = data._body
    return $(scraper.body.children)
  }

  private storePageState(data: any) {
    let scraperJquery = this.jQueryHTML(data)
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

  private mockHttpDelay(func) {
    return new Promise((resolve) => {
      setTimeout(() => {
        return resolve(func())
      }, 1000)
    })
  }

  private mockLogin() {
    this.mykiAccount.holder = "Demo account"
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
  }

  private mockCardDetails(card: Myki.Card) {
    switch (card.id) {
      case '308412345678901':
        card.loaded = true
        card.passActive = "7 days , Zone 1-Zone 2.Valid to " + moment().add(2, 'days').format("D MMM YYYY") + " 03:00:00 AM"
        card.passInactive = ""
        card.type = "Full Fare"
        card.expiry = new Date("2020-01-04T14:00:00.000Z")
        card.moneyTopupInProgress = 0
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
        card.lastTransactionDate = new Date("2016-01-01T16:12:02.000Z")
        break;
      default:
        throw new Error('Invalid card')
    }
  }

  private mockCardHistory(card: Myki.Card) {
    card.transactionLoaded = true

    let stubTransactions: Array<Myki.Transaction> = JSON.parse('[{"dateTime":"2017-02-14T09:12:29.000Z","type":4,"service":1,"zone":"1","description":"Southern Cross Station","credit":2,"debit":null,"moneyBalance":70.18},{"dateTime":"2017-02-14T00:25:47.000Z","type":1,"service":1,"zone":"1/2","description":"Flinders Street Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:43:17.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:43:17.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:31:47.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T23:31:47.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T09:12:43.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-13T00:26:39.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:42:42.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:42:42.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:30:17.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-12T23:30:17.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T09:13:35.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:46:31.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:02:37.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-10T00:02:37.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-09T08:25:09.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-09T00:34:45.000Z","type":1,"service":1,"zone":"1","description":"Flinders Street Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:41:01.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:41:01.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:30:36.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":4.1,"moneyBalance":70.18},{"dateTime":"2017-02-08T23:30:36.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T23:30:36.000Z","type":3,"service":5,"zone":"-","description":"7 Days  Zone 1-2 ($41.00)","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T09:05:41.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-08T00:33:26.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":1.3,"moneyBalance":74.28},{"dateTime":"2017-02-07T23:40:12.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T23:40:12.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":2.8,"moneyBalance":75.58},{"dateTime":"2017-02-07T23:28:41.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T23:28:41.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T09:28:47.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-07T00:26:07.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:37:58.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:37:58.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:29:04.000Z","type":2,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T23:29:04.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T08:35:46.000Z","type":0,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-06T00:29:18.000Z","type":1,"service":1,"zone":"1","description":"Southern Cross Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:43:38.000Z","type":0,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:43:38.000Z","type":2,"service":1,"zone":"2","description":"Springvale Station","credit":null,"debit":null,"moneyBalance":null},{"dateTime":"2017-02-05T23:25:19.000Z","type":0,"service":0,"zone":"2","description":"Mulgrave,Route 813in","credit":null,"debit":null,"moneyBalance":null}]')

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
