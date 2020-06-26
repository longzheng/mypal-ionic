// Fix cordova-sentry issue with App Store build failing validation
// App Store Connect Operation Error
// ERROR ITMS-90087: "Unsupported Architectures. The executable for MyPal.app/Frameworks/Sentry.framework contains unsupported architectures '[x86_64, i386]'."
// ERROR ITMS-90209: "Invalid Segment Alignment. The app binary at 'MyPal.app/Frameworks/Sentry.framework/Sentry' does not have proper segment alignment. Try rebuilding the app with the latest Xcode version."
// ERROR ITMS-90125: "The binary is invalid. The encryption info in the LC_ENCRYPTION_INFO load command is either missing or invalid, or the binary is already encrypted. This binary does not seem to have been built with Apple's linker."
// WARNING ITMS-90080: "The executable 'Payload/MyPal.app/Frameworks/Sentry.framework' is not a Position Independent Executable. Please ensure that your build settings are configured to create PIE executables. For more information refer to Technical Q&A QA1788 - Building a Position Independent Executable in the iOS Developer Library."
// https://github.com/getsentry/sentry-cordova/issues/29

const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

const shellScript = `
APP_PATH="\${TARGET_BUILD_DIR}/\${WRAPPER_NAME}"

# This script loops through the frameworks embedded in the application and
# removes unused architectures.
find "$APP_PATH" -name '*.framework' -type d | while read -r FRAMEWORK
do
FRAMEWORK_EXECUTABLE_NAME=$(defaults read "$FRAMEWORK/Info.plist" CFBundleExecutable)
FRAMEWORK_EXECUTABLE_PATH="$FRAMEWORK/$FRAMEWORK_EXECUTABLE_NAME"
echo "Executable is $FRAMEWORK_EXECUTABLE_PATH"

EXTRACTED_ARCHS=()

for ARCH in $ARCHS
do
echo "Extracting $ARCH from $FRAMEWORK_EXECUTABLE_NAME"
lipo -extract "$ARCH" "$FRAMEWORK_EXECUTABLE_PATH" -o "$FRAMEWORK_EXECUTABLE_PATH-$ARCH"
EXTRACTED_ARCHS+=("$FRAMEWORK_EXECUTABLE_PATH-$ARCH")
done

echo "Merging extracted architectures: \${ARCHS}"
lipo -o "$FRAMEWORK_EXECUTABLE_PATH-merged" -create "\${EXTRACTED_ARCHS[@]}"
rm "\${EXTRACTED_ARCHS[@]}"

echo "Replacing original executable with thinned version"
rm "$FRAMEWORK_EXECUTABLE_PATH"
mv "$FRAMEWORK_EXECUTABLE_PATH-merged" "$FRAMEWORK_EXECUTABLE_PATH"

done
`;

module.exports = context => {
  const projectDir = path.resolve(context.opts.projectRoot, 'platforms/ios')
  const dirContent = fs.readdirSync(projectDir)
  const matchingProjectFiles = dirContent.filter(filePath => /.*\.xcodeproj/gi.test(filePath));
  const projectPath = path.join(projectDir, matchingProjectFiles[0], 'project.pbxproj');

  const project = xcode.project(projectPath)

  project.parse(error => {
    if (error) {
      console.error('Failed to parse project', error);
      process.exit(1);
    }
    const options = {
      shellPath: '/bin/sh',
      shellScript,
      inputPaths: ['"$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)"']
    };
    project.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      'Remove Unused Architectures',
      project.getFirstTarget().uuid,
      options
    );
    fs.writeFileSync(projectPath, project.writeSync());
  })
};