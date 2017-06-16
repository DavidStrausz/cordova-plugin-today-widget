# Cordova Plugin for adding a Today Widget to an existing iOS Project dynamically

This plugin extends your existing xcode project by parsing and modifying the project.pbxproj file using [cordova-node-xcode](https://github.com/apache/cordova-node-xcode). The today extension will be added to the XCode-Project everytime a `cordova platform add ios` is done.

## Usage

### 1. First of all you have to create a Today Widget yourself using XCode (`Editor > Add target`)

* Name your plugin `<Name of your XCode project> Widget`.
* Add a Bundle identifier: `Targets > Select your widget > General`) and name it: `<Bundle-ID of your host app>.widget` (it has to be prefixed by the host apps bundle id).
* Enable the `App Groups` entitlement (`Targets > Select your widget > Capabilities`) and name your group: `group.<Bundle-ID of your host app>` (you can use the group to share NSUserDefaults between the Widget and the main App).
* Implement your widget using `TodayViewController.swift` and `MainInterface.storyboard` (you should be able to add additional source-files too, but i did not test it).
* When done implementing copy the `<Widget name>` folder from `</platforms/ios>` to `</www>` (it will be copied from here by the plugin).
* Make sure the `.plist` file lists the correct bundle identifier
* If your `MainInterface.storyboard` is listed in a sub-older named `Base.lproj`, pull it out of the folder and delete the folder (I did not handle variant-groups for different languages in the script).
* If you want to use an objective-c bridging header you can add it to the folder, just make sure it is named `Bridging-Header.h`
* Every file that is not a `.swift`, `.h`, `.plist`, `.entitlements` or `.storyboard` file will be added as a resource file to the project

#### Example

* The host project is called: `My awesome app.xcodeproj` and the bundle identifier is: `com.exmaple.myawesomeapp`
* Then the widget must be named: `My awesome app Widget`
* The bundle identifier has to be: `com.example.myawesomeapp.widget`
* The app-group has to be named: `group.com.example.myawesomeapp`
* And the final folder structure in the `/www` folder should look like this:

```plain
project
│   ...
└───www
│   │   ...
│   └───My awesome app Widget
│   │   │   MainInterface.storyboard
│   │   │   My awesome app Widget-Info.plist
│   │   │   My awesome app Widget.entitlements
│   │   │   TodayViewController.swift
│   │   │   [optional] Bridging-Header.h
```

### 2. Install the plugin

* `cordova plugin add https://github.com/DavidStrausz/cordova-plugin-today-widget.git --save-dev`
* This will not modify anything yet because the hooks only run `after_platform_add`
* So delete the `platforms` folder and run `cordova platform add ios`
* The first hook will copy the widget from the `project/www` folder to the ios platform folder
* And the second one does the parsing and modifying of the XCode project

### Infos

* I only tested the plugin with cordova 7.0.1 and cordova-ios 4.4.0 up to now, but it should work with other versions too.
* I used XCode 8.3.2 to create the widget alongside with the plugin.
* You have to add the app group entitlement to your host app too and you have to recreate your provisioning profiles with the app-group entitlement added if you want to use shared user defaults.
* Don't forget to copy the widgets folder from `platforms/ios` to `project/www` everytime you modify it, otherwise your changes will be lost after you remove the platform.

### Acknowledgements

Thanks to [Hernan Zhou](https://github.com/LuckyKat) whos [plugin](https://github.com/LuckyKat/cordova-sticker-pack-extension) was a great inspiration. 