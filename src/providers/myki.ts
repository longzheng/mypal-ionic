import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptionsArgs, URLSearchParams, RequestOptions } from '@angular/http';
import { ConfigProvider } from './config';
import { Observable } from 'rxjs/Rx';
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
      this.getCardDetails(this.activeCard(), true)

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

    // clear current state
    this.mykiAccount = new Myki.Account()
  }

  // log in to myki account
  login(username: string, password: string): Promise<Response> {
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
  relogin() {
    this.login(this.username, this.password)
  }

  getAccountDetails() {
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
          body.set('__ASYNCPOST', 'true')

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
                  card.passActiveEnabled = true
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
    // specify the login endpoint
    let cardUrl = `${this.apiRoot}Registered/ManageMyCard.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(cardUrl).then(
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
              card.setType(cardTable.find("tr:nth-child(2) td:nth-child(2)").text().trim());
              card.expiry = moment(cardTable.find("tr:nth-child(3) td:nth-child(2)").text().trim(), "D MMM YYYY").toDate();
              card.status = Myki.CardStatus[cardTable.find("tr:nth-child(4) td:nth-child(2)").text().trim()];
              card.moneyBalance = parseFloat(cardTable.find("tr:nth-child(5) td:nth-child(2)").text().trim().replace("$", ""));
              card.moneyTopupInProgress = parseFloat(cardTable.find("tr:nth-child(6) td:nth-child(2)").text().trim().replace("$", ""));
              card.moneyTotalBalance = parseFloat(cardTable.find("tr:nth-child(7) td:nth-child(2)").text().trim().replace("$", ""));

              // process pass
              let passActive = cardTable.find("tr:nth-child(8) td:nth-child(2)").text().trim();
              if (passActive !== '-') {
                card.passActive = passActive
                card.passActiveEnabled = true
                card.passActiveExpiry = moment(passActive.split('Valid to ')[1], "D MMM YYYY").toDate()
              }

              let passInactive = cardTable.find("tr:nth-child(9) td:nth-child(2)").text().trim();
              if (passInactive !== '-')
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
    // specify the login endpoint
    let historyUrl = `${this.apiRoot}Registered/MYTransactionsInfo.aspx`;

    return new Promise((resolve, reject) => {
      // do a GET first to get the viewstate
      this.httpGetAsp(historyUrl).then(
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
                trans.credit = parseFloat(transJquery.find("td:nth-child(7)").text().trim().replace("-", "").replace("$", "")) // remove "-" for empty fields and "$"

                // debit
                trans.debit = parseFloat(transJquery.find("td:nth-child(8)").text().trim().replace("-", "").replace("$", ""))

                // balance
                trans.moneyBalance = parseFloat(transJquery.find("td:nth-child(9)").text().trim().replace("-", "").replace("$", ""))

                card.transactions.push(trans)
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

  private httpGetAsp(url: string): Promise<Response> {
    // set up request options
    const options = new RequestOptions()
    options.withCredentials = true // set/send cookies

    return new Promise((resolve, reject) => {
      this.http.get(url, options).subscribe(
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

  private jQueryHTML(data: any): JQuery {
    let scraper = (<any>document).implementation.createHTMLDocument()
    scraper.body.innerHTML = data._body
    return $(scraper.body.children)
  }

  private storePageState(data: any) {
    let scraperJquery = this.jQueryHTML(data)
    this.lastViewState = scraperJquery.find('#__VIEWSTATE').val()
    this.lastEventValidation = scraperJquery.find('#__EVENTVALIDATION').val()
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

}
