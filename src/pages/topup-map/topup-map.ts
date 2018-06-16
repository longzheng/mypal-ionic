import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Http } from '@angular/http';
import { GoogleMaps, GoogleMap, GoogleMapsEvent, LatLng, MarkerOptions } from '@ionic-native/google-maps';
import { Firebase } from '@ionic-native/firebase';

@Component({
  selector: 'page-topup-map',
  templateUrl: 'topup-map.html'
})
export class TopupMapPage {

  loading: boolean = false;
  map: GoogleMap
  mapLicense: string
  mapError: boolean = false;
  locationsError: boolean = false;
  locations: Array<MarkerOptions> = [];
  locationsLoaded: number = 0

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private googleMaps: GoogleMaps,
    private http: Http,
    private firebase: Firebase,
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

    this.map = this.googleMaps.create(element, {
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
    });

    // listen to MAP_READY event
    // You must wait for this event to fire before adding something to the map or modifying it in anyway
    this.map.one(GoogleMapsEvent.MAP_READY).then(() => {

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
      this.loading = true

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
              this.locationsError = true
              this.loading = false
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
              this.locations.push(markerOptions);
            }

            this.addMarker(0);
          }
        }, error => {
          // no op
        });
    });
  }

  // We're adding thousands of markers
  // iOS seems to have a problem if location service is disabled then adding markers will freeze the whole app
  // We throttle adding markers one by one in a timeout (without delay) seems to work
  addMarker(i) {
    setTimeout(() => {
      // add marker to map
      this.map.addMarker(this.locations[i]);
      // update progress in %
      this.locationsLoaded = Math.ceil(i / this.locations.length * 100)
      i++;
      if (i < this.locations.length) {
        // if still markers to add
        this.addMarker(i);
      } else {
        // hide loading
        this.loading = false
      }
    }, 0)
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