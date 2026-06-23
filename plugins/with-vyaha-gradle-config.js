const { createRequire } = require("module");
const path = require("path");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const { withGradleProperties } = requireFromApp("@expo/config-plugins");

const JVM_ARGS_KEY = "org.gradle.jvmargs";
const JVM_ARGS_VALUE =
  "-Xmx2048m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError";
// expo-build-properties 0.14.x writes android.enableProguardInReleaseBuilds, but
// React Native 0.81 app/build.gradle reads android.enableMinifyInReleaseBuilds.
const MINIFY_KEY = "android.enableMinifyInReleaseBuilds";
const MINIFY_VALUE = "true";

const setGradleProperty = (modResults, key, value) => {
  const existing = modResults.findIndex((item) => item.key === key);
  if (existing >= 0) {
    modResults[existing].value = value;
  } else {
    modResults.push({ type: "property", key, value });
  }
};

const withVyahaGradleConfig = (config, _props = {}) => {
  return withGradleProperties(config, (androidConfig) => {
    setGradleProperty(androidConfig.modResults, JVM_ARGS_KEY, JVM_ARGS_VALUE);
    setGradleProperty(androidConfig.modResults, MINIFY_KEY, MINIFY_VALUE);
    return androidConfig;
  });
};

module.exports = withVyahaGradleConfig;
