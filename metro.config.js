const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// ─── Firebase module resolution for React Native ─────────────────────────────
//
// Problem: Firebase ships ESM and CJS builds. Metro can resolve different
// @firebase/* packages to different builds (ESM vs CJS), which creates
// SEPARATE module instances with separate _components registries. When
// registerAuth('ReactNative') runs in one instance but initializeAuth runs
// in another, you get "Component auth has not been registered yet".
//
// Fix:
//   1. firebase/auth + @firebase/auth → always the RN-specific build
//      (the only build that calls registerAuth('ReactNative'))
//   2. All other @firebase/* packages → their CJS build
//      (ensures a single _components/_apps registry singleton)
// ─────────────────────────────────────────────────────────────────────────────

const firebaseAuthRN = path.resolve(
  __dirname,
  'node_modules/firebase/node_modules/@firebase/auth/dist/rn/index.js'
);

// Resolve a @firebase/* package to its CJS build.
function getFirebaseCJS(pkgName) {
  try {
    const pkgDir = path.resolve(__dirname, 'node_modules', pkgName);
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    const cjs = pkg.main;
    if (cjs) return path.join(pkgDir, cjs);
  } catch (_) {
    // package not found — fall through
  }
  return null;
}

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'ios' || platform === 'android') {
    // Auth: use the RN build so registerAuth('ReactNative') is always called
    if (moduleName === 'firebase/auth' || moduleName === '@firebase/auth') {
      return { filePath: firebaseAuthRN, type: 'sourceFile' };
    }

    // All other @firebase/* packages: pin to CJS to guarantee a single registry
    if (moduleName.startsWith('@firebase/') && moduleName !== '@firebase/auth') {
      const cjsPath = getFirebaseCJS(moduleName);
      if (cjsPath && fs.existsSync(cjsPath)) {
        return { filePath: cjsPath, type: 'sourceFile' };
      }
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
