const fs = require('fs');
const path = require('path');

exports.default = function(context) {
  if (context.electronPlatformName !== 'linux') return;
  const appOutDir = context.appOutDir;
  // The executable name is usually the productName or executableName from package.json
  const executableName = context.packager.appInfo.productFilename || 'kawaii-sticky-notes';
  
  // Note: AppImage build actually creates the linux-unpacked folder and renames it or uses it
  const execPath = path.join(appOutDir, executableName);
  
  // If the executable doesn't exist under this name, try 'kawaii-sticky-notes'
  let finalExecPath = execPath;
  if (!fs.existsSync(finalExecPath)) {
    finalExecPath = path.join(appOutDir, 'kawaii-sticky-notes');
  }
  
  if (!fs.existsSync(finalExecPath)) {
    console.log('afterPack wrapper: Executable not found at', finalExecPath);
    return;
  }

  const realExecPath = finalExecPath + '-bin';
  
  // Rename the actual binary
  fs.renameSync(finalExecPath, realExecPath);
  
  // Write a bash wrapper script that includes --no-sandbox
  const wrapperScript = `#!/bin/bash
"\${BASH_SOURCE%/*}/${path.basename(realExecPath)}" --no-sandbox "$@"
`;
  
  fs.writeFileSync(finalExecPath, wrapperScript);
  fs.chmodSync(finalExecPath, '755');
  console.log('afterPack wrapper: Successfully injected --no-sandbox wrapper script for Linux.');
};
