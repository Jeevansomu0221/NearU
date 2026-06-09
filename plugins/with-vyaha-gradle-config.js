const { createRequire } = require("module");
const path = require("path");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const { withGradleProperties } = requireFromApp("@expo/config-plugins");

const JVM_ARGS_KEY = "org.gradle.jvmargs";
const JVM_ARGS_VALUE =
  "-Xmx2048m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError";

const withVyahaGradleConfig = (config, _props = {}) => {
  return withGradleProperties(config, (androidConfig) => {
    const existing = androidConfig.modResults.findIndex(
      (item) => item.key === JVM_ARGS_KEY
    );
    if (existing >= 0) {
      androidConfig.modResults[existing].value = JVM_ARGS_VALUE;
    } else {
      androidConfig.modResults.push({
        type: "property",
        key: JVM_ARGS_KEY,
        value: JVM_ARGS_VALUE,
      });
    }
    return androidConfig;
  });
};

module.exports = withVyahaGradleConfig;
