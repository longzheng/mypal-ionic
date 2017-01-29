import { Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptionsArgs, URLSearchParams, RequestOptions } from '@angular/http';
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
    public http: Http
  ) {
  }

  activeCard() {
    if (this.activeCardId === '')
      return new Myki.Card;

    return this.mykiAccount.cards.find(x => x.id === this.activeCardId)
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

    // set loading
    this.mykiAccount.loading = true;

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

              let cardIds = []

              // scrape active cards
              let activeCards = scraperJquery.find("#tabs-1 table tr").not(":first")

              // get card ids of active cards
              activeCards.each((index, elem) => {
                var cardJquery = $(elem)
                let cardId = cardJquery.find("td:nth-child(1)").text().trim();
                cardIds.push(cardId)
              })

              // scrape ianctive cards
              let inactiveCards = scraperJquery.find("#tabs-2 table tr").not(":first")

              // get card ids of active cards
              inactiveCards.each((index, elem) => {
                var cardJquery = $(elem)
                let cardId = cardJquery.find("td:nth-child(1)").text().trim();
                cardIds.push(cardId)
              })

              // loop through card IDs
              for (let cardId of cardIds) {
                let card = this.findOrInsertCardById(cardId)
                this.getCardDetails(card);
              }

              // set active card to first active card
              this.activeCardId = cardIds[0];

              this.mykiAccount.loading = false;

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

  getCardDetails(card: Myki.Card): Promise<Myki.Card> {
    // specify the login endpoint
    let cardUrl = `${this.apiRoot}Registered/ManageMyCard.aspx`;

    // set loading state
    card.loading = true;

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
              card.moneyBalance = parseFloat(cardTable.find("tr:nth-child(5) td:nth-child(2)").text().trim().substr(1));
              card.moneyTopupInProgress = parseFloat(cardTable.find("tr:nth-child(6) td:nth-child(2)").text().trim().substr(1));
              card.moneyTotalBalance = parseFloat(cardTable.find("tr:nth-child(7) td:nth-child(2)").text().trim().substr(1));

              // process pass
              let passActive = cardTable.find("tr:nth-child(8) td:nth-child(2)").text().trim();
              if (passActive !== '-')
                card.passActive = passActive

              let passInactive = cardTable.find("tr:nth-child(9) td:nth-child(2)").text().trim();
              if (passInactive !== '-')
                card.passInactive = passInactive

              card.lastTransactionDate = moment(cardTable.find("tr:nth-child(3) td:nth-child(2)").text().trim(), "D MMM YYYY hh:mm:ss A").toDate();

              // set loading state
              card.loading = false;

              return resolve(card);
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
