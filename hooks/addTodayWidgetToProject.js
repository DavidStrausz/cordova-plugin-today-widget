// @ts-check

var xcode = require('xcode');
var fs = require('fs');
var path = require('path');

function log(logString, type) {
    var prefix;
    var postfix = '';
    switch (type) {
        case 'error':
            prefix = '\x1b[1m' + '\x1b[31m' + '💥 😨 '; // bold, red
            throw new Error(prefix + logString + 'x1b[0m'); // reset
        case 'info':
            prefix = '\x1b[40m' + '\x1b[37m' + '\x1b[2m' + '☝️ [INFO] ' + '\x1b[0m\x1b[40m' + '\x1b[33m'; // fgWhite, dim, reset, bgBlack, fgYellow
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

console.log('\x1b[40m');
log('Running addTargetToXcodeProject hook, patching xcode project 🦄 ', 'start');

module.exports = function (context) {
    var Q = context.requireCordovaModule('q');
    var deferral = new Q.defer();

    if (context.opts.cordova.platforms.indexOf('ios') < 0) {
        log('You have to add the ios platform before adding this plugin!', 'error');
    }

    // Get the bundle-id from config.xml
    var contents = fs.readFileSync(path.join(context.opts.projectRoot, 'config.xml'), 'utf-8');
    if (contents) {
        contents = contents.substring(contents.indexOf('<'));
    }
    var elementTree = context.requireCordovaModule('elementtree');
    var etree = elementTree.parse(contents);
    var bundleId = etree.getroot().get('id');
    log('Bundle id of your host app: ' + bundleId, 'info');

    var iosFolder = context.opts.cordova.project ? context.opts.cordova.project.root : path.join(context.opts.projectRoot, 'platforms/ios/');
    log('Folder containing your iOS project: ' + iosFolder, 'info');

    fs.readdir(iosFolder, function (err, data) {
        var projectFolder;
        var projectName;
        var run = function () {
            var pbxProject;
            var projectPath;
            projectPath = path.join(projectFolder, 'project.pbxproj');

            log('Parsing existing project at location: ' + projectPath + ' ...', 'info');
            if (context.opts.cordova.project) {
                pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
            } else {
                pbxProject = xcode.project(projectPath);
                pbxProject.parseSync();
            }

            var widgetName = projectName + ' Widget';
            log('Your widget will be named: ' + widgetName, 'info');

            // Add PBXNativeTarget to the project
            var target = pbxProject.addTarget(widgetName, "app_extension", widgetName);
            if (target) {
                log('Successfully added PBXNativeTarget!', 'info');
            }

            // Create a separate PBXGroup for the widgets files, name has to be unique and path must be in quotation marks
            var pbxGroupKey = pbxProject.pbxCreateGroup('Widget', '"' + widgetName + '"');
            if (pbxGroupKey) {
                log('Successfully created empty PbxGroup for folder: ' + widgetName + ' with alias: Widget', 'info');
            }

            // Add the PbxGroup to cordovas "CustomTemplate"-group
            var customTemplateKey = pbxProject.findPBXGroupKey({ name: 'CustomTemplate' });
            pbxProject.addToPbxGroup(pbxGroupKey, customTemplateKey);
            log('Successfully added the widgets PbxGroup to cordovas CustomTemplate!', 'info');

            // Add files which are not part of any build phase
            var plistFile = pbxProject.addFile(widgetName + '-Info.plist', pbxGroupKey);
            var entitlementsFile = pbxProject.addFile(widgetName + '.entitlements', pbxGroupKey);
            if (plistFile && entitlementsFile) {
                log('Successfully added the plist and entitlements configuration files!', 'info');
            }

            // Add a new PBXSourcesBuildPhase for our TodayViewController (we can't add it to the existing one because a today extension is kind of an extra app)
            var sourcesBuildPhase = pbxProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid);
            if (sourcesBuildPhase) {
                log('Successfully added PBXSourcesBuildPhase!', 'info');
            }

            // Add a new source file and add it to our PbxGroup and our newly created PBXSourcesBuildPhase
            var sourceFile = pbxProject.addSourceFile('TodayViewController.swift', { target: target.uuid }, pbxGroupKey);
            if (sourceFile) {
                log('Successfully added source file to PbxGroup and PBXSourcesBuildPhases!', 'info');
            }

            // Add a new PBXFrameworksBuildPhase for the Frameworks used by the widget (NotificationCenter.framework, libCordova.a)
            var frameworksBuildPhase = pbxProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
            if (frameworksBuildPhase) {
                log('Successfully added PBXFrameworksBuildPhase!', 'info');
            }

            // Add the frameworks needed by our widget, add them to the existing Frameworks PbxGroup and PBXFrameworksBuildPhase
            var frameworkFile1 = pbxProject.addFramework('NotificationCenter.framework', { target: target.uuid });
            var frameworkFile2 = pbxProject.addFramework('libCordova.a', { target: target.uuid }); // seems to work because the first target is built before the second one
            if (frameworkFile1 && frameworkFile2) {
                log('Successfully added frameworks needed by the widget!', 'info');
            }

            // Add a new PBXResourcesBuildPhase for the Resources used by the widget (MainInterface.storyboard)
            var resourcesBuildPhase = pbxProject.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);
            if (resourcesBuildPhase) {
                log('Successfully added PBXResourcesBuildPhase!', 'info');
            }

            //  Add the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
            var resource = pbxProject.addResourceFile('MainInterface.storyboard', { target: target.uuid }, pbxGroupKey);
            if (resource) {
                log('Successfully added MainInterface.storyboard as a resource!', 'info');
            }

            // Add build settings to support Swift just for the widget
            var configurations = pbxProject.pbxXCBuildConfigurationSection();
            for (var key in configurations) {
                if (typeof configurations[key].buildSettings !== 'undefined') {
                    var buildSettingsObj = configurations[key].buildSettings;
                    if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
                        var productName = buildSettingsObj['PRODUCT_NAME'];
                        if (productName.indexOf('Widget') >= 0) {
                            buildSettingsObj['SWIFT_VERSION'] = '3.0';
                            buildSettingsObj['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES';
                        }
                    }
                }
            }
            log('Successfully added build settings for swift support!', 'info');

            // Write the modified project back to disc
            log('Writing the modified project back to disk ...', 'info');
            fs.writeFileSync(projectPath, pbxProject.writeSync());
            log('Added app extension to ' + projectName + ' xcode project', 'success');
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