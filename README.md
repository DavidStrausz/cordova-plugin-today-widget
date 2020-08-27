# Cordova Plugin for adding a Today Widget to an existing iOS Project dynamically

This plugin extends your existing xcode project by parsing and modifying the project.pbxproj file using [cordova-node-xcode](https://github.com/apache/cordova-node-xcode). The today extension will be added to the XCode-Project everytime a `cordova platform add ios` is done.

## Usage

### 1. First of all you have to create a Today Widget yourself using XCode (`Editor > Add target > Today Extension`)

* Fill in the fields, making note of the following:
 * Remember the name of the widget
 * Remember the last part of the bundle identifier (the suffix)
* Enable the `App Groups` entitlement (`Targets > Select your widget > Capabilities`) and name your group: `group.<Bundle-ID of your host app>` (you can use the group to share NSUserDefaults between the Widget and the main App). _Note that you have to add this to your provisioning profile_
* Implement your widget using `TodayViewController.swift` and `MainInterface.storyboard` (you can add additional source-files too).
* When done implementing copy the `<Widget name>` folder from `</platforms/ios>` to anywhere tracked by your repository.
* If your `MainInterface.storyboard` is listed in a sub-older named `Base.lproj`, pull it out of the folder and delete the folder. (there is no handling of variant-groups for different languages)
* If you want to use an objective-c bridging header you can add it to the folder, just make sure it is named `Header.h` (`Bridging-Header.h` works too but the file won't be listed in XCode because the cordova bridging header has the same name and node-xcode thinks's it's the same file because it's checking the name and not the UUID)
* If you need to add custom build settings you can use a xcconfig file, the script will add it to the project
* Every file that is not a `.swift`, `.h`, `.m`, `.plist`, `.entitlements`, `.xcconfig` or `.storyboard` file will be added as a resource file to the project (images, fonts, etc.)

### 2. Install the plugin
* `cordova plugin add https://github.com/DavidStrausz/cordova-plugin-today-widget.git --save`
* This will not modify anything yet because the hooks only run `after_platform_add`
* You can add variables to your `config.xml` in order to change some of the settings:

| Variable | Default | Description |
|-|-|-|
|WIDGET_PATH| `/www` | Path to the folder that contains your widget folder relative to the project root |
|WIDGET_NAME| <Name of main project> Widget | Name of your widget |
|WIDGET_BUNDLE_SUFFIX| widget | The last part of the widget bundle id |
|ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES| YES | You might have to turn this off (change to NO) if you use other swift based plugins (such as cordova-plugin-geofence) |
|SWIFT_VERSION| '3.0' | The version of Swift that your widget uses |

This can be done either manually in the config.xml after installing the plugin, or be done through the CLI.

#### Example:

In the config.xml

```
<plugin name="cordova-plugin-today-widget" spec="https://github.com/Triggi/cordova-plugin-today-widget.git">
  <variable name="WIDGET_NAME" value="NowWidget" />
  <variable name="ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES" value="NO" />
</plugin>
```

Directly through CLI:

```
cordova plugin add cordova-plugin-today-widget --variable WIDGET_NAME="NowWidget" --variable ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES="NO"
```

### 3. Parametrization
Especially for automated builds, parametrization is an important part. The following parameters are available:

| Variable | Example | Description |
|-|-|-|
|\_\_DISPLAY_NAME__| AppName | Name of the original app |
|\_\_APP_IDENTIFIER__| com.company.app | Bundle ID of the main app |
|\_\_BUNDLE_SUFFIX__| widget | Bundle ID suffix for the widget |
|\_\_BUNDLE_SHORT_VERSION_STRING__| 1.0.0 | The version of the main app in form MAJOR.MINOR.PATCH |
|\_\_BUNDLE_VERSION__| 1234 | The build number of the main app

These parameters are available in available in any `.plist` or `.entitlements` files.

#### Examples for usage:
To keep the app and widget in sync use the following settings

`Widget-Info.plist`:
* Bundle display name: \_\_DISPLAY_NAME__
* Bundle identifier: \_\_APP\_IDENTIFIER__.\_\_BUNDLE\_SUFFIX__
* Bundle version string, short: \_\_BUNDLE_SHORT_VERSION_STRING__
* Bundle version: \_\_BUNDLE_VERSION__

`Widget.entitlements`:
* App Groups -> Item 0: group.\_\_APP_IDENTIFIER__

### Infos
* I only tested the plugin with cordova 7.0.1 and cordova-ios 4.4.0 up to now, but it should work with other versions too.
* I used XCode 8.3.2 to create the widget alongside with the plugin.
* You have to add the app group entitlement to your host app too and you have to recreate your provisioning profiles with the app-group entitlement added if you want to use shared user defaults.
* Don't forget to copy the widgets folder from `platforms/ios` to your source folder every time you modify it, otherwise your changes will be lost after you remove the platform.

### Acknowledgements

Thanks to [Remy Kabel](https://github.com/RomanovX) who parametrized the build and made it possible for it to be fully automated.
Thanks to [Hernan Zhou](https://github.com/LuckyKat) whos [plugin](https://github.com/LuckyKat/cordova-sticker-pack-extension) was a great inspiration.
