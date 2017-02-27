![](https://cloud.githubusercontent.com/assets/484912/22861758/f6491d18-f174-11e6-9bec-f6b7e1aaca43.png)
# mypal-ionic
Mobile app to see Myki account details for iOS & Android

## Download links
- Google Play: coming soon
- App Store: coming soon

## Background

I'm making this app because the [Myki site](https://www.mymyki.com.au/NTSWebPortal/Login.aspx) doesn't have a mobile view nor a mobile app, and I wanted to experiment with the [Ionic framework](https://ionicframework.com) to make a hybrid mobile app. This is a spinoff from my abandoned [Eastlink app](https://github.com/longzheng/eastly-ionic/).

## Screenshots
![](https://cloud.githubusercontent.com/assets/484912/23365652/eaec62e2-fd57-11e6-93b0-6996618bd975.jpg)

## Current features
- Log in to Myki online account with username & password
- Show current/archived myki cards
- Shows myki money & myki pass balance
- Shows card information
- Shows recent transactions
- Top up with credit card

## Planned features
- Show top up locations

## Build requirements
Must have Cordova and [Ionic 2 installed](https://ionicframework.com/getting-started/) ```npm install -g cordova ionic```

Install npm packages ```npm install```

When debugging with Chrome, security limitations must be disabled since we're accessing a third-party site without CORS headers
```
OSX from terminal
open -a Google\ Chrome --args --disable-web-security --user-data-dir
  
Windows from cmd
chrome.exe --disable-web-security --user-data-dir
```
