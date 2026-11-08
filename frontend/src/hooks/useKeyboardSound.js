// Audio objects are created lazily so importing this module has no side effects.
let keyStrokeSounds = null;

const getSounds = () => {
  if (!keyStrokeSounds) {
    keyStrokeSounds = [1, 2, 3, 4].map((n) => new Audio(`/sounds/keystroke${n}.mp3`));
  }
  return keyStrokeSounds;
};

function useKeyboardSound() {
  const playRandomKeyStrokeSound = () => {
    const sounds = getSounds();
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];

    randomSound.currentTime = 0;
    randomSound.play().catch(() => {
      /* autoplay can be blocked until the user interacts: ignore */
    });
  };

  return { playRandomKeyStrokeSound };
}

export default useKeyboardSound;
