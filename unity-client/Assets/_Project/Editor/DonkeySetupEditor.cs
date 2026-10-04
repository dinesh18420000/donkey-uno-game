using System.IO;
using UnityEngine;
using UnityEditor;

namespace DonkeyUno.Editor
{
    [InitializeOnLoad]
    public static class DonkeySetupEditor
    {
        [MenuItem("Tools/Configure Donkey Sprites")]
        public static void ConfigureSprites()
        {
            string texDir = "Assets/_Project/Textures";
            if (!Directory.Exists(texDir)) return;

            string[] files = Directory.GetFiles(texDir, "*.png");
            foreach (var file in files)
            {
                string assetPath = file.Replace("\\", "/");
                var importer = AssetImporter.GetAtPath(assetPath) as TextureImporter;
                if (importer != null)
                {
                    bool changed = false;
                    if (importer.textureType != TextureImporterType.Sprite)
                    {
                        importer.textureType = TextureImporterType.Sprite;
                        changed = true;
                    }
                    if (importer.spriteImportMode != SpriteImportMode.Single)
                    {
                        importer.spriteImportMode = SpriteImportMode.Single;
                        changed = true;
                    }
                    if (!importer.alphaIsTransparency)
                    {
                        importer.alphaIsTransparency = true;
                        changed = true;
                    }
                    if (changed)
                    {
                        importer.SaveAndReimport();
                    }
                }
            }
            AssetDatabase.Refresh();
            Debug.Log("[DonkeySetupEditor] All Donkey sprites configured successfully!");
        }

        [InitializeOnLoadMethod]
        private static void AutoConfigureOnLoad()
        {
            EditorApplication.delayCall += () =>
            {
                if (!EditorPrefs.GetBool("DonkeyUI_AutoSetup_v3", false))
                {
                    EditorPrefs.SetBool("DonkeyUI_AutoSetup_v3", true);
                    ConfigureSprites();
                    SceneSetupHelper.SetupMainGameScene(false);
                    Debug.Log("[DonkeySetupEditor] Auto-configured Donkey game UI to match mobile screenshots!");
                }
            };
        }

        public static Sprite LoadSprite(string name)
        {
            string path = $"Assets/_Project/Textures/{name}.png";
            return AssetDatabase.LoadAssetAtPath<Sprite>(path);
        }
    }
}
