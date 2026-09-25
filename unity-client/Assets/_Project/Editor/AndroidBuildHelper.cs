using System;
using System.IO;
using UnityEngine;
using UnityEditor;
using UnityEditor.Build;

namespace DonkeyUno.Editor
{
    public static class AndroidBuildHelper
    {
        public const string PackageIdentifier = "com.familygames.donkeyuno";
        public const string AppName = "Donkey Master & Uno No Mercy";
        public const string Company = "FamilyGames";

        [MenuItem("Tools/Android/1. Check Android Build Setup")]
        public static void CheckSetup()
        {
            bool isAndroidSupported = BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Android, BuildTarget.Android);

            if (!isAndroidSupported)
            {
                EditorUtility.DisplayDialog("Android Module Not Installed",
                    "Unity cannot build Android APKs yet because 'Android Build Support' is not installed for Unity 6 (6000.6.3f1).\n\n" +
                    "To install it in 2 minutes:\n" +
                    "1. Open Unity Hub\n" +
                    "2. Click 'Installs' tab on the left\n" +
                    "3. Click the ⚙️ Gear icon on 'Unity 6 (6000.6.3f1)'\n" +
                    "4. Select 'Add modules'\n" +
                    "5. Check 'Android Build Support' (ensure Android SDK & NDK and OpenJDK are checked)\n" +
                    "6. Click Install & restart Unity Editor.\n\n" +
                    "Once done, come back here and click 'Export Android APK'!", "Understood");
                return;
            }

            ConfigureAndroidSettings();

            EditorUtility.DisplayDialog("Android Setup Ready! 🚀",
                "✓ Android Build Support is installed!\n" +
                "✓ Package Name set: " + PackageIdentifier + "\n" +
                "✓ App Name set: " + AppName + "\n" +
                "✓ Internet Permission enabled (Connects to Cloud / Local Server)\n" +
                "✓ APK Mode configured (Ready to install on any Android phone)\n\n" +
                "You can now click:\n'Tools > Android > 2. Export Android APK (1-Click)'", "Great!");
        }

        [MenuItem("Tools/Android/2. Export Android APK (1-Click)")]
        public static void BuildAndroidApk()
        {
            bool isAndroidSupported = BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.Android, BuildTarget.Android);

            if (!isAndroidSupported)
            {
                CheckSetup();
                return;
            }

            ConfigureAndroidSettings();

            // Ensure MainGame.unity scene exists
            string scenePath = "Assets/_Project/Scenes/MainGame.unity";
            if (!File.Exists(scenePath))
            {
                EditorUtility.DisplayDialog("Scene Missing",
                    "MainGame.unity scene was not found. Please click 'Tools > Setup Game Scene (Auto-Configure)' first!", "OK");
                return;
            }

            // Create Builds folder
            string buildsDir = Path.Combine(Directory.GetCurrentDirectory(), "Builds");
            if (!Directory.Exists(buildsDir))
            {
                Directory.CreateDirectory(buildsDir);
            }

            string apkOutputPath = Path.Combine(buildsDir, "DonkeyMaster_Unity.apk");

            // Switch to Android build target if needed
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.Android)
            {
                bool switched = EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
                if (!switched)
                {
                    EditorUtility.DisplayDialog("Switch Platform Failed",
                        "Could not switch platform to Android. Please check Console for details.", "OK");
                    return;
                }
            }

            BuildPlayerOptions options = new BuildPlayerOptions
            {
                scenes = new[] { scenePath },
                locationPathName = apkOutputPath,
                target = BuildTarget.Android,
                targetGroup = BuildTargetGroup.Android,
                options = BuildOptions.None
            };

            Debug.Log("[AndroidBuildHelper] Starting Android APK build to: " + apkOutputPath);
            var report = BuildPipeline.BuildPlayer(options);

            if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                long fileSizeBytes = new FileInfo(apkOutputPath).Length;
                double sizeMb = fileSizeBytes / (1024.0 * 1024.0);

                EditorUtility.DisplayDialog("Build Succeeded! 🎉",
                    $"Your Unity Android APK was successfully exported!\n\n" +
                    $"File: {apkOutputPath}\n" +
                    $"Size: {sizeMb:F1} MB\n\n" +
                    "How to install:\n" +
                    "1. Copy 'DonkeyMaster_Unity.apk' to your Android phone (via USB, Google Drive, WhatsApp, or email)\n" +
                    "2. Tap the APK on your phone and choose 'Install'\n" +
                    "3. Open the game and join the Family Table!\n\n" +
                    "Opening the folder now...", "Open Folder");

                EditorUtility.RevealInFinder(apkOutputPath);
            }
            else
            {
                EditorUtility.DisplayDialog("Build Failed",
                    $"The build ended with status: {report.summary.result}.\n" +
                    $"Total errors: {report.summary.totalErrors}\n\n" +
                    "Check the Unity Console window (Ctrl+Shift+C) for the exact error messages.", "OK");
            }
        }

        public static void ConfigureAndroidSettings()
        {
            PlayerSettings.productName = AppName;
            PlayerSettings.companyName = Company;

            // Set package identifier (e.g. com.familygames.donkeyuno)
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, PackageIdentifier);

            // Configure APK output rather than AAB bundle
            EditorUserBuildSettings.buildAppBundle = false;

            // Target Android 8.0 (API 26) min for modern features
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel26;
            PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto;

            // Ensure Internet access permission is added
            PlayerSettings.Android.forceInternetPermission = true;

            // Set orientations: Auto-rotate or landscape/portrait
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;

            AssetDatabase.SaveAssets();
        }
    }
}
