Generate notification icons from http://romannurik.github.io/AndroidAssetStudio/icons-notification.html

Copy directory/files to ```/platforms/android/res/```

Add to ```/platforms/android/AndroidManifest.xml```

```
<application>
    ...
    <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/notification_icon" />
</application>
```