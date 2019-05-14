// @ts-check

var fs = require('fs');
var path = require('path');
var plist = require('plist');
var xcode = require('xcode');
var Q = require('q');
var elementTree = require('elementtree');

function log(logString, type) {
  var prefix;
  var postfix = '';
  switch (type) {
    case 'error':
      prefix = '\x1b[1m' + '\x1b[31m' + '💥 😨 '; // bold, red
      throw new Error(prefix + logString + 'x1b[0m'); // reset
    case 'info':
      prefix =
        '\x1b[40m' +
        '\x1b[37m' +
        '\x1b[2m' +
        '☝️ [INFO] ' +
        '\x1b[0m\x1b[40m' +
        '\x1b[33m'; // fgWhite, dim, reset, bgBlack, fgYellow
      break;
    case 'start':
      prefix = '\x1b[40m' + '\x1b[36m'; // bgBlack, fgCyan
      break;
    case 'success':
      prefix = '\x1b[40m' + '\x1b[32m' + '✔ '; // bgBlack, fgGreen
      postfix = ' 🦄  🎉  🤘';
      break;
  }

  console.log(prefix + logString + postfix);
}

function getPreferenceValue (config, name) {
  var value = config.match(new RegExp('name="' + name + '" value="(.*?)"', "i"));
  if(value && value[1]) {
    return value[1];
  } else {
    return null;
  }
}

function replacePlaceholdersInPlist(plistPath, placeHolderValues) {
    var plistContents = fs.readFileSync(plistPath, 'utf8');
    for (var i = 0; i < placeHolderValues.length; i++) {
        var placeHolderValue = placeHolderValues[i],
            regexp = new RegExp(placeHolderValue.placeHolder, "g");
        plistContents = plistContents.replace(regexp, placeHolderValue.value);
    }
    fs.writeFileSync(plistPath, plistContents);
}

function getCordovaParameter(variableName, contents) {
  var variable;
  if(process.argv.join("|").indexOf(variableName + "=") > -1) {
    var re = new RegExp(variableName + '=(.*?)(\||$))', 'g');
    variable = process.argv.join("|").match(re)[1];
  } else {
    variable = getPreferenceValue(contents, variableName);
  }
  return variable;
}

console.log('\x1b[40m');
log(
  'Running addTargetToXcodeProject hook, patching xcode project 🦄 ',
  'start'
);

module.exports = function (context) {
  var deferral = new Q.defer();

  if (context.opts.cordova.platforms.indexOf('ios') < 0) {
    log('You have to add the ios platform before adding this plugin!', 'error');
  }

  var contents = fs.readFileSync(
    path.join(context.opts.projectRoot, 'config.xml'),
    'utf-8'
  );

  // Get the plugin variables from the parameters or the config file
  var WIDGET_NAME = getCordovaParameter("WIDGET_NAME", contents);
  var WIDGET_BUNDLE_SUFFIX = getCordovaParameter("WIDGET_BUNDLE_SUFFIX", contents);
  var ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = getCordovaParameter("ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", contents);

  if (contents) {
    contents = contents.substring(contents.indexOf('<'));
  }

  // Get the bundle-id from config.xml
  var etree = elementTree.parse(contents);
  var bundleId = etree.getroot().get('id');
  log('Bundle id of your host app: ' + bundleId, 'info');

  var iosFolder = context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
  log('Folder containing your iOS project: ' + iosFolder, 'info');

  fs.readdir(iosFolder, function (err, data) {
    var projectFolder;
    var projectName;
    var run = function () {
      var pbxProject;
      var projectPath;
      projectPath = path.join(projectFolder, 'project.pbxproj');

      log(
        'Parsing existing project at location: ' + projectPath + ' ...',
        'info'
      );
      if (context.opts.cordova.project) {
        pbxProject = context.opts.cordova.project.parseProjectFile(
          context.opts.projectRoot
        ).xcode;
      } else {
        pbxProject = xcode.project(projectPath);
        pbxProject.parseSync();
      }

      var widgetName = WIDGET_NAME || projectName + ' Widget';
      log('Your widget will be named: ' + widgetName, 'info');

      var widgetBundleId = WIDGET_BUNDLE_SUFFIX || 'widget';
      log('Your widget bundle id will be: ' + bundleId + '.' + widgetBundleId, 'info');

      var widgetFolder = path.join(iosFolder, widgetName);
      var sourceFiles = [];
      var resourceFiles = [];
      var configFiles = [];
      var projectContainsSwiftFiles = false;
      var addBridgingHeader = false;
      var bridgingHeaderName;
      var addXcconfig = false;
      var xcconfigFileName;
      var xcconfigReference;
      var addEntitlementsFile = false;
      var entitlementsFileName;
      var projectPlistPath = path.join(iosFolder, projectName, projectName + '-Info.plist');
      var projectPlistJson = plist.parse(fs.readFileSync(projectPlistPath, 'utf8'));
      var placeHolderValues = [
        {
          placeHolder: '__DISPLAY_NAME__',
          value: projectName
        },
        {
          placeHolder: '__APP_IDENTIFIER__',
          value: bundleId
        },
        {
          placeHolder: '__BUNDLE_SUFFIX__',
          value: widgetBundleId
        },
        {
          placeHolder: '__BUNDLE_SHORT_VERSION_STRING__',
          value: projectPlistJson['CFBundleShortVersionString']
        },
        {
          placeHolder: '__BUNDLE_VERSION__',
          value: projectPlistJson['CFBundleVersion']
        }
      ];

      fs.readdirSync(widgetFolder).forEach(file => {
        if (!/^\..*/.test(file)) {
          // Ignore junk files like .DS_Store
          var fileExtension = path.extname(file);
          switch (fileExtension) {
            // Swift and Objective-C source files which need to be compiled
            case '.swift':
              projectContainsSwiftFiles = true;
              sourceFiles.push(file);
              break;
            case '.h':
            case '.m':
              if (file === 'Bridging-Header.h' || file === 'Header.h') {
                addBridgingHeader = true;
                bridgingHeaderName = file;
              }
              sourceFiles.push(file);
              break;
            // Configuration files
            case '.plist':
            case '.entitlements':
            case '.xcconfig':
              replacePlaceholdersInPlist(path.join(widgetFolder, file), placeHolderValues);
              if (fileExtension === '.xcconfig') {
                addXcconfig = true;
                xcconfigFileName = file;
              }
              if (fileExtension === '.entitlements') {
                addEntitlementsFile = true;
                entitlementsFileName = file;
              }
              configFiles.push(file);
              break;
            // Resources like storyboards, images, fonts, etc.
            default:
              resourceFiles.push(file);
              break;
          }
        }
      });

      log('Found following files in your widget folder:', 'info');
      console.log('Source-files: ');
      sourceFiles.forEach(file => {
        console.log(' - ', file);
      });

      console.log('Config-files: ');
      configFiles.forEach(file => {
        console.log(' - ', file);
      });

      console.log('Resource-files: ');
      resourceFiles.forEach(file => {
        console.log(' - ', file);
      });

      // Add PBXNativeTarget to the project
      var target = pbxProject.addTarget(
        widgetName,
        'app_extension',
        widgetName
      );
      if (target) {
        log('Successfully added PBXNativeTarget!', 'info');
      }

      // Create a separate PBXGroup for the widgets files, name has to be unique and path must be in quotation marks
      var pbxGroupKey = pbxProject.pbxCreateGroup(
        'Widget',
        '"' + widgetName + '"'
      );
      if (pbxGroupKey) {
        log(
          'Successfully created empty PbxGroup for folder: ' +
          widgetName +
          ' with alias: Widget',
          'info'
        );
      }

      // Add the PbxGroup to cordovas "CustomTemplate"-group
      var customTemplateKey = pbxProject.findPBXGroupKey({
        name: 'CustomTemplate',
      });
      pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
      log(
        'Successfully added the widgets PbxGroup to cordovas CustomTemplate!',
        'info'
      );

      // Add files which are not part of any build phase (config)
      configFiles.forEach(configFile => {
        var file = pbxProject.addFile(configFile, pbxGroupKey);
        // We need the reference to add the xcconfig to the XCBuildConfiguration as baseConfigurationReference
        if (path.extname(configFile) == '.xcconfig') {
          xcconfigReference = file.fileRef;
        }
      });
      log(
        'Successfully added ' + configFiles.length + ' configuration files!',
        'info'
      );

      // Add a new PBXSourcesBuildPhase for our TodayViewController (we can't add it to the existing one because a today extension is kind of an extra app)
      var sourcesBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXSourcesBuildPhase',
        'Sources',
        target.uuid
      );
      if (sourcesBuildPhase) {
        log('Successfully added PBXSourcesBuildPhase!', 'info');
      }

      // Add a new source file and add it to our PbxGroup and our newly created PBXSourcesBuildPhase
      sourceFiles.forEach(sourcefile => {
        pbxProject.addSourceFile(
          sourcefile,
          { target: target.uuid },
          pbxGroupKey
        );
      });

      log(
        'Successfully added ' +
        sourceFiles.length +
        ' source files to PbxGroup and PBXSourcesBuildPhase!',
        'info'
      );

      // Add a new PBXFrameworksBuildPhase for the Frameworks used by the widget (NotificationCenter.framework, libCordova.a)
      var frameworksBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXFrameworksBuildPhase',
        'Frameworks',
        target.uuid
      );
      if (frameworksBuildPhase) {
        log('Successfully added PBXFrameworksBuildPhase!', 'info');
      }

      // Add the frameworks needed by our widget, add them to the existing Frameworks PbxGroup and PBXFrameworksBuildPhase
      var frameworkFile1 = pbxProject.addFramework(
        'NotificationCenter.framework',
        { target: target.uuid }
      );
      var frameworkFile2 = pbxProject.addFramework('libCordova.a', {
        target: target.uuid,
      }); // seems to work because the first target is built before the second one
      if (frameworkFile1 && frameworkFile2) {
        log('Successfully added frameworks needed by the widget!', 'info');
      }

      // Add a new PBXResourcesBuildPhase for the Resources used by the widget (MainInterface.storyboard)
      var resourcesBuildPhase = pbxProject.addBuildPhase(
        [],
        'PBXResourcesBuildPhase',
        'Resources',
        target.uuid
      );
      if (resourcesBuildPhase) {
        log('Successfully added PBXResourcesBuildPhase!', 'info');
      }

      //  Add the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
      resourceFiles.forEach(resourcefile => {
        pbxProject.addResourceFile(
          resourcefile,
          { target: target.uuid },
          pbxGroupKey
        );
      });

      log(
        'Successfully added ' + resourceFiles.length + ' resource files!',
        'info'
      );

      // Add build settings for Swift support, bridging header and xcconfig files
      var configurations = pbxProject.pbxXCBuildConfigurationSection();
      for (var key in configurations) {
        if (typeof configurations[key].buildSettings !== 'undefined') {
          var buildSettingsObj = configurations[key].buildSettings;
          if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
            var productName = buildSettingsObj['PRODUCT_NAME'];
            if (productName.indexOf('Widget') >= 0) {
              if (addXcconfig) {
                configurations[key].baseConfigurationReference =
                  xcconfigReference + ' /* ' + xcconfigFileName + ' */';
                log('Added xcconfig file reference to build settings!', 'info');
              }
              if (addEntitlementsFile) {
                buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"' + widgetName + '/' + entitlementsFileName + '"';
                log('Added entitlements file reference to build settings!', 'info');
              }
              if (projectContainsSwiftFiles) {
                buildSettingsObj['SWIFT_VERSION'] = '4.2';
                buildSettingsObj['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES || 'YES';
                log('Added build settings for swift support!', 'info');
              }
              if (addBridgingHeader) {
                buildSettingsObj['SWIFT_OBJC_BRIDGING_HEADER'] =
                  '"$(PROJECT_DIR)/' +
                  widgetName +
                  '/' +
                  bridgingHeaderName +
                  '"';
                log('Added bridging header reference to build settings!', 'info');
              }
            }
          }
        }
      }

      // Write the modified project back to disc
      log('Writing the modified project back to disk ...', 'info');
      fs.writeFileSync(projectPath, pbxProject.writeSync());
      log(
        'Added app extension to ' + projectName + ' xcode project',
        'success'
      );
      console.log('\x1b[0m'); // reset

      deferral.resolve();
    };

    if (err) {
      log(err, 'error');
    }

    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function (folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder, folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      log('Could not find an *.xcodeproj folder in: ' + iosFolder, 'error');
    }

    run();
  });

  return deferral.promise;
};
