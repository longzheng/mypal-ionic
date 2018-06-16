import { Component } from '@angular/core';
import { NavController, NavParams, LoadingController, AlertController } from 'ionic-angular';
import { Http } from '@angular/http';
import { GoogleMaps, GoogleMap, GoogleMapOptions, LatLng, MarkerOptions } from '@ionic-native/google-maps';
import { Firebase } from '@ionic-native/firebase';

@Component({
  selector: 'page-topup-map',
  templateUrl: 'topup-map.html'
})
export class TopupMapPage {

  map: GoogleMap;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private googleMaps: GoogleMaps,
    private http: Http,
    private firebase: Firebase,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController
  ) { }

  ionViewDidLoad() {
    // log event
    this.firebase.logEvent("select_content", {
      "content_type": "view topup map page",
      "item_id": "page_topup_map"
    })

    this.loadMap();
  }

  loadMap() {
    // create a new map by passing HTMLElement
    let element: HTMLElement = document.getElementById('map');

    let options: GoogleMapOptions = {
      'controls': {
        'compass': true,
        'myLocation': true,
        'myLocationButton': true,
      },
      'gestures': {
        'tilt': false,
      },
      'camera': {
        target: {
          lat: -37.8136,
          lng: 144.9631
        },
        zoom: 17
      }
    };

    this.map = this.googleMaps.create(element, options);

    // center on current location
    // wait a second for things to initialize a bit
    setTimeout(() => {
      this.map.getMyLocation().then(
        location => {
          this.map.moveCamera({
            'target': location.latLng,
            'zoom': 17
          })
        }, error => {
          // no op
        });
    }, 1000)

    // start loading
    const loader = this.loadingCtrl.create({
      content: "Loading...",
    });

    loader.present();

    // load myki top up locations
    this.http.get("https://www.ptv.vic.gov.au/tickets/myki/ef1d0f60a/xml-list")
      .map(response => response.text())
      .subscribe(
        data => {
          if (data) {
            let parser = new DOMParser();
            let xmlData = parser.parseFromString(data.trim(), "application/xml");
            let locations = xmlData.getElementsByTagName("d");

            if (locations.length === 0) {
              loader.dismiss();
              this.alertCtrl.create({
                title: "Top up outlets not available",
                message: "The myki top up outlets data from Public Transport Victoria is empty",
                buttons: ['OK']
              }).present();
              return
            }

            // process all markers
            for (var i = 0; i < locations.length; i++) {
              let location = locations[i];
              let locationName = location.getElementsByTagName("N")[0].textContent
              let locationAddress = location.getElementsByTagName("A1")[0].textContent
              let locationNote = this.markerTypeToString(location.getElementsByTagName("F")[0].textContent)
              let locationLat = parseFloat(location.getElementsByTagName("Lt")[0].textContent)
              let locationLng = parseFloat(location.getElementsByTagName("Lg")[0].textContent)
              // create new marker
              let markerOptions: MarkerOptions = {
                position: new LatLng(locationLat, locationLng),
                title: locationName,
                snippet: locationNote + '. \n' + locationAddress
              };
              // add marker to list to be added
              this.map.addMarker(markerOptions);
            }

            loader.dismiss();
          }
        }, error => {
          loader.dismiss();
          this.alertCtrl.create({
            title: "Top up outlets not available",
            message: "Could not load myki top up outlets data from Public Transport Victoria",
            buttons: ['OK']
          }).present();
        });
  }

  private markerTypeToString(type: string) {
    switch (type) {
      case '0':
        return "Top up only";
      case '1':
        return "Top up only (accessible)"
      case '2':
        return "myki machine (top up only)"
      case '3':
        return "Buy a myki visitor pack"
      case '4':
        return "Buy or top up your myki (24 hours)"
      case '5':
        return "myki machine (buy or top up full fare)"
      case '7':
        return "Buy or top up at ticket office or myki machine"
      case '8':
        return "Buy or top up your myki"
      case '9':
        return "Buy or top up your myki (accessible)"
      case '10':
        return "Buy pre-loaded myki cards only"
      default:
        throw new Error("Invalid top up marker type: " + type)
    }
  }

}