using System;
using UnityEngine;

namespace DonkeyUno.Audio
{
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("Audio Sources")]
        [SerializeField] private AudioSource sfxSource;
        [SerializeField] private AudioSource musicSource;

        [Header("Audio Clips (Optional overrides)")]
        [SerializeField] private AudioClip cardPlayClip;
        [SerializeField] private AudioClip cardDealClip;
        [SerializeField] private AudioClip unoCallClip;
        [SerializeField] private AudioClip unoCatchClip;
        [SerializeField] private AudioClip stackSlamClip;
        [SerializeField] private AudioClip reverseClip;
        [SerializeField] private AudioClip victoryClip;

        public bool IsMuted { get; private set; }

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                IsMuted = PlayerPrefs.GetInt("donkey_uno_muted", 0) == 1;

                if (sfxSource == null)
                {
                    sfxSource = gameObject.AddComponent<AudioSource>();
                }
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void ToggleSound()
        {
            IsMuted = !IsMuted;
            PlayerPrefs.SetInt("donkey_uno_muted", IsMuted ? 1 : 0);
            PlayerPrefs.Save();
        }

        public void PlayCardPlay()
        {
            if (IsMuted) return;
            PlayWithPitch(cardPlayClip, 0.95f, 1.05f);
        }

        public void PlayCardDeal()
        {
            if (IsMuted) return;
            PlayWithPitch(cardDealClip, 0.96f, 1.04f);
        }

        public void PlayUnoCall()
        {
            if (IsMuted) return;
            PlayWithPitch(unoCallClip, 1.0f, 1.0f);
        }

        public void PlayUnoCatch()
        {
            if (IsMuted) return;
            PlayWithPitch(unoCatchClip, 1.0f, 1.0f);
        }

        public void PlayStackSlam()
        {
            if (IsMuted) return;
            PlayWithPitch(stackSlamClip, 0.9f, 1.0f);
        }

        public void PlayReverse()
        {
            if (IsMuted) return;
            PlayWithPitch(reverseClip, 1.0f, 1.0f);
        }

        public void PlayVictory()
        {
            if (IsMuted) return;
            if (victoryClip != null) sfxSource.PlayOneShot(victoryClip);
        }

        private void PlayWithPitch(AudioClip clip, float minPitch, float maxPitch)
        {
            if (clip == null) return;
            sfxSource.pitch = UnityEngine.Random.Range(minPitch, maxPitch);
            sfxSource.PlayOneShot(clip);
            sfxSource.pitch = 1.0f;
        }
    }
}
