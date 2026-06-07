const fs = require("fs");
const { createRequire } = require("module");
const path = require("path");

const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
const {
  AndroidConfig,
  withAndroidColors,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication
} = requireFromApp("@expo/config-plugins");

const CHANNEL_ID = "vyaha_alerts";
const DEFAULT_COLOR = "#0F9D58";
const ICON_RESOURCE = "vyaha_notification_icon";
const COLOR_RESOURCE = "vyaha_notification_color";

const NOTIFICATION_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M2,5h4.55l4.08,9.55L17.45,5H22l-9.23,14h-4.1L2,5z" />
</vector>
`;

const addOrUpdateMetaData = (application, name, attrs) => {
  const metaData = application["meta-data"] || [];
  const existing = metaData.find((item) => item.$?.["android:name"] === name);
  if (existing) {
    existing.$ = { ...existing.$, ...attrs, "android:name": name };
  } else {
    metaData.push({ $: { "android:name": name, ...attrs } });
  }
  application["meta-data"] = metaData;
};

const ensureResources = (projectRoot) => {
  const resPath = path.join(projectRoot, "android", "app", "src", "main", "res");
  const drawablePath = path.join(resPath, "drawable");
  fs.mkdirSync(drawablePath, { recursive: true });
  fs.writeFileSync(path.join(drawablePath, `${ICON_RESOURCE}.xml`), NOTIFICATION_ICON_XML);
};

const addChannelToKotlin = (contents, channelName, channelDescription) => {
  let updated = contents;
  const imports = [
    "import android.app.Notification",
    "import android.app.NotificationChannel",
    "import android.app.NotificationManager",
    "import android.os.Build"
  ];

  for (const importLine of imports) {
    if (!updated.includes(importLine)) {
      updated = updated.replace(/package .+\n/, (match) => `${match}\n${importLine}\n`);
    }
  }

  if (!updated.includes("createVyahaNotificationChannel()")) {
    updated = updated.replace(/super\.onCreate\(\)\n/, "super.onCreate()\n    createVyahaNotificationChannel()\n");
  }

  if (!updated.includes("private fun createVyahaNotificationChannel()")) {
    const method = `
  private fun createVyahaNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        "${CHANNEL_ID}",
        "${channelName}",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "${channelDescription}"
        enableVibration(true)
        setShowBadge(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
  }
`;
    updated = updated.replace(/\n}\s*$/, `${method}\n}`);
  }

  return updated;
};

const addChannelToJava = (contents, channelName, channelDescription) => {
  let updated = contents;
  const imports = [
    "import android.app.Notification;",
    "import android.app.NotificationChannel;",
    "import android.app.NotificationManager;",
    "import android.os.Build;"
  ];

  for (const importLine of imports) {
    if (!updated.includes(importLine)) {
      updated = updated.replace(/package .+;\n/, (match) => `${match}\n${importLine}\n`);
    }
  }

  if (!updated.includes("createVyahaNotificationChannel();")) {
    updated = updated.replace(/super\.onCreate\(\);\n/, "super.onCreate();\n    createVyahaNotificationChannel();\n");
  }

  if (!updated.includes("private void createVyahaNotificationChannel()")) {
    const method = `
  private void createVyahaNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(
        "${CHANNEL_ID}",
        "${channelName}",
        NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("${channelDescription}");
      channel.enableVibration(true);
      channel.setShowBadge(true);
      channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
      getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
  }
`;
    updated = updated.replace(/\n}\s*$/, `${method}\n}`);
  }

  return updated;
};

const withVyahaAndroidNotifications = (config, props = {}) => {
  const color = props.color || DEFAULT_COLOR;
  const channelName = props.channelName || "Vyaha alerts";
  const channelDescription = props.channelDescription || "Important order, job, and account alerts.";

  config = withAndroidColors(config, (androidConfig) => {
    androidConfig.modResults = AndroidConfig.Colors.setColorItem(
      {
        _: color,
        $: { name: COLOR_RESOURCE }
      },
      androidConfig.modResults
    );
    return androidConfig;
  });

  config = withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidConfig.modResults);
    addOrUpdateMetaData(application, "com.google.firebase.messaging.default_notification_icon", {
      "android:resource": `@drawable/${ICON_RESOURCE}`
    });
    addOrUpdateMetaData(application, "com.google.firebase.messaging.default_notification_color", {
      "android:resource": `@color/${COLOR_RESOURCE}`
    });
    addOrUpdateMetaData(application, "com.google.firebase.messaging.default_notification_channel_id", {
      "android:value": CHANNEL_ID
    });
    return androidConfig;
  });

  config = withDangerousMod(config, [
    "android",
    (androidConfig) => {
      ensureResources(androidConfig.modRequest.projectRoot);
      return androidConfig;
    }
  ]);

  config = withMainApplication(config, (androidConfig) => {
    if (androidConfig.modResults.language === "kt") {
      androidConfig.modResults.contents = addChannelToKotlin(
        androidConfig.modResults.contents,
        channelName,
        channelDescription
      );
    } else {
      androidConfig.modResults.contents = addChannelToJava(
        androidConfig.modResults.contents,
        channelName,
        channelDescription
      );
    }
    return androidConfig;
  });

  return config;
};

module.exports = withVyahaAndroidNotifications;
module.exports.CHANNEL_ID = CHANNEL_ID;
