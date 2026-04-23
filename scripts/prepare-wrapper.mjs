import { cpSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const variants = {
  client: {
    appId: 'com.amerytech.amerymedportal',
    appName: 'AmeryMed Portal',
    serverUrl: 'https://amerymed-portal.vercel.app/client/app-login',
    xcodeDisplayName: 'AmeryMed Portal',
    appStoreRole: 'Client',
    generatedIosConfigPath: 'ios/App/App/capacitor.config.json',
    iosOpenPath: 'ios/App/App.xcodeproj',
  },
  admin: {
    appId: 'com.amerytech.amerymedadmin',
    appName: 'AmeryMed Admin',
    serverUrl: 'https://amerymed-portal.vercel.app/admin/login',
    xcodeDisplayName: 'AmeryMed Admin',
    appStoreRole: 'Admin',
    generatedIosConfigPath: 'ios/AdminApp/App/capacitor.config.json',
    iosOpenPath: 'ios/AdminApp/AdminApp.xcodeproj',
  },
};

const generatedClientIosRoot = resolve('ios/App/App');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runCapacitorCommand(capCommand, env) {
  const result = spawnSync('npx', ['cap', ...capCommand], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function validateGeneratedConfig(expected) {
  const generatedConfigPath = resolve(expected.generatedIosConfigPath);

  if (!existsSync(generatedConfigPath)) {
    fail(
      `Expected generated Capacitor config at ${generatedConfigPath}, but it was not found. Run "npm run cap:add:ios" first.`
    );
  }

  const generatedConfig = JSON.parse(readFileSync(generatedConfigPath, 'utf8'));
  const mismatches = [];

  if (generatedConfig.appId !== expected.appId) {
    mismatches.push(`appId expected ${expected.appId} but found ${generatedConfig.appId}`);
  }

  if (generatedConfig.appName !== expected.appName) {
    mismatches.push(`appName expected ${expected.appName} but found ${generatedConfig.appName}`);
  }

  if (generatedConfig.server?.url !== expected.serverUrl) {
    mismatches.push(`server.url expected ${expected.serverUrl} but found ${generatedConfig.server?.url}`);
  }

  if (mismatches.length > 0) {
    fail(`Generated iOS wrapper does not match the requested variant:\n- ${mismatches.join('\n- ')}`);
  }
}

function mirrorGeneratedIosWrapper(variant) {
  if (variant.generatedIosConfigPath === 'ios/App/App/capacitor.config.json') {
    return;
  }

  const adminIosRoot = resolve('ios/AdminApp/App');

  cpSync(resolve(generatedClientIosRoot, 'public'), resolve(adminIosRoot, 'public'), {
    recursive: true,
    force: true,
  });
  cpSync(resolve(generatedClientIosRoot, 'capacitor.config.json'), resolve(adminIosRoot, 'capacitor.config.json'));
  cpSync(resolve(generatedClientIosRoot, 'config.xml'), resolve(adminIosRoot, 'config.xml'));
}

function restoreClientWrapper() {
  runCapacitorCommand(['sync'], {
    CAPACITOR_APP_ID: variants.client.appId,
    CAPACITOR_APP_NAME: variants.client.appName,
    CAPACITOR_SERVER_URL: variants.client.serverUrl,
  });
}

function openXcodeProject(projectPath) {
  const result = spawnSync('open', [projectPath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printSummary(variantName, variant, commandName) {
  console.log('');
  console.log(`${variant.appStoreRole} wrapper is prepared.`);
  console.log(`Variant: ${variantName}`);
  console.log(`Bundle ID: ${variant.appId}`);
  console.log(`App Name: ${variant.appName}`);
  console.log(`Start URL: ${variant.serverUrl}`);

  if (commandName === 'sync') {
    console.log('');
    console.log('Next in Xcode:');
    console.log(`1. Open ${variant.iosOpenPath} or run "npm run cap:open:ios:${variantName}"`);
    console.log(`2. Confirm display name is "${variant.xcodeDisplayName}"`);
    console.log(`3. Confirm bundle identifier is "${variant.appId}"`);
    console.log('4. Clean build folder before reinstalling on iPhone');
    console.log('5. Archive only after the variant behaves correctly on the device');
  }
}

const [, , rawVariant, rawCommand = 'sync'] = process.argv;
const variantName = rawVariant?.toLowerCase();
const commandName = rawCommand.toLowerCase();
const variant = variants[variantName];

if (!variant) {
  fail(`Unknown wrapper variant "${rawVariant}". Use "client" or "admin".`);
}

if (!['sync', 'open-ios', 'print'].includes(commandName)) {
  fail(`Unknown wrapper command "${rawCommand}". Use "sync", "open-ios", or "print".`);
}

const env = {
  CAPACITOR_APP_ID: variant.appId,
  CAPACITOR_APP_NAME: variant.appName,
  CAPACITOR_SERVER_URL: variant.serverUrl,
};

if (commandName === 'sync') {
  runCapacitorCommand(['sync'], env);
  mirrorGeneratedIosWrapper(variant);
  if (variantName === 'admin') {
    restoreClientWrapper();
  }
  validateGeneratedConfig(variant);
  printSummary(variantName, variant, commandName);
  process.exit(0);
}

if (commandName === 'open-ios') {
  validateGeneratedConfig(variant);
  openXcodeProject(variant.iosOpenPath);
  process.exit(0);
}

printSummary(variantName, variant, commandName);
