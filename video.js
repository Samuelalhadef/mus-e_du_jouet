document.addEventListener("DOMContentLoaded", () => {
  const videoContainer = document.getElementById("video-container");
  const audioPlayer = document.getElementById("audio-player");
  const startButton = document.getElementById("start-button");
  const channel = new BroadcastChannel("video-channel");

  // Configuration initiale du conteneur vidéo
  videoContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 100vh;
    background: black;
    display: none;
  `;

  // Créer le conteneur d'image de fond
  const backgroundImage = document.createElement("div");
  backgroundImage.id = "background-image";
  backgroundImage.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('images/fond.png');
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 1;
    transition: opacity 0.3s ease;
    z-index: 1;
  `;
  videoContainer.appendChild(backgroundImage);

  // Créer deux éléments vidéo superposés
  const videoPlayer1 = document.createElement("video");
  const videoPlayer2 = document.createElement("video");
  videoPlayer1.id = "video-player-1";
  videoPlayer2.id = "video-player-2";

  // Appliquer les styles pour la superposition
  const videoStyle = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 0.3s ease;
    z-index: 2;
    opacity: 0;
  `;
  videoPlayer1.style.cssText = videoStyle;
  videoPlayer2.style.cssText = videoStyle;

  videoContainer.appendChild(videoPlayer1);
  videoContainer.appendChild(videoPlayer2);

  // Variables d'état
  let currentVideo = videoPlayer1;
  let nextVideo = videoPlayer2;
  let currentCharacter = null;
  let isPlaying = false;
  let characterSelected = false;
  let videoCache = {};

  // Configuration des animations par personnage
  const animations = {
    sophie: {
      welcome: "video/Sophie_marche.mp4",
      parler: "video/Sophie_discussion.mp4",
      idle: "video/Sophie_idole.mp4",
    },
    playmobil: {
      welcome: "video/Playmobil_entrer.mp4",
      parler: "video/Playmobil_discussion.mp4",
      idle: "video/Playmobil_Idole.mp4",
    },
    fisher: {
      welcome: "video/Telephone_entrer.mp4",
      parler: "video/Telephone_discussion.mp4",
      idle: "video/Telephone_idole.mp4",
    },
  };
  // Précharger les vidéos pour un personnage
  async function preloadVideos(character) {
    if (!animations[character]) return;

    for (const [key, url] of Object.entries(animations[character])) {
      if (!videoCache[url]) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const blob = await response.blob();
          videoCache[url] = URL.createObjectURL(blob);
          console.log(`Préchargement réussi: ${key} pour ${character}`);
        } catch (error) {
          console.error(`Erreur de préchargement pour ${url}:`, error);
        }
      }
    }
  }

  // Fonction pour basculer entre les lecteurs vidéo
  function switchVideoPlayers() {
    [currentVideo, nextVideo] = [nextVideo, currentVideo];
    currentVideo.style.opacity = "1";
    nextVideo.style.opacity = "0";
  }

  // Fonction pour jouer une animation en fondu enchaîné
  async function playVideoWithFade(videoPath) {
    console.log("Tentative de lecture:", videoPath);
    const cachedUrl = videoCache[videoPath] || videoPath;

    try {
      nextVideo.src = cachedUrl;
      nextVideo.loop = false;
      await nextVideo.load();
      await nextVideo.play();

      if (characterSelected) {
        backgroundImage.style.opacity = "0";
      }

      nextVideo.style.opacity = "1";
      currentVideo.style.opacity = "0";

      setTimeout(() => {
        switchVideoPlayers();
      }, 300);
    } catch (error) {
      console.error("Erreur lecture vidéo:", error);
      console.log("État de la vidéo:", {
        readyState: nextVideo.readyState,
        networkState: nextVideo.networkState,
        error: nextVideo.error,
        src: nextVideo.src,
      });
    }
  }

  function normalizeString(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Supprime les accents
  }

  function getCharacterFromVideo(videoPath) {
    const normalizedPath = normalizeString(videoPath);
    if (normalizedPath.includes("sophie")) return "sophie";
    if (normalizedPath.includes("playmobil")) return "playmobil";
    // Accepte à la fois "fisher" et "telephone" avec ou sans accent
    if (
      normalizedPath.includes("fisher") ||
      normalizedPath.includes("telephone")
    )
      return "fisher";
    return null;
  }
  // Fonction pour jouer l'audio avec l'animation
  async function playAudioWithAnimation(audioPath, character) {
    if (!character || !animations[character]) return;

    try {
      // Démarrer l'animation de discussion
      nextVideo.src =
        videoCache[animations[character].parler] ||
        animations[character].parler;
      nextVideo.loop = true; // Mettre la vidéo en boucle
      await nextVideo.load();
      await nextVideo.play();

      // Faire le fondu
      nextVideo.style.opacity = "1";
      currentVideo.style.opacity = "0";
      setTimeout(() => {
        switchVideoPlayers();
      }, 300);

      // Jouer l'audio
      audioPlayer.src = audioPath;
      isPlaying = true;
      await audioPlayer.play();
    } catch (error) {
      console.error("Erreur lecture audio:", error);
      isPlaying = false;
    }
  }
  // Transition vers l'animation idle
  async function switchToIdle(character) {
    if (!animations[character]) return;
    console.log("Transition vers idle pour:", character);

    try {
      nextVideo.loop = true;
      await playVideoWithFade(animations[character].idle);
    } catch (error) {
      console.error("Erreur transition idle:", error);
    }
  }

  // Fonction pour réinitialiser l'état
  function resetState() {
    characterSelected = false;
    currentCharacter = null;
    isPlaying = false;
    backgroundImage.style.opacity = "1";
    currentVideo.style.opacity = "0";
    nextVideo.style.opacity = "0";
    currentVideo.pause();
    nextVideo.pause();
    audioPlayer.pause();
  }

  // Événements de fin de vidéo
  videoPlayer1.addEventListener("ended", () => {
    if (currentVideo === videoPlayer1) {
      if (
        currentCharacter &&
        (videoPlayer1.src.toLowerCase().includes("welcome") ||
          videoPlayer1.src.toLowerCase().includes("entrer") ||
          videoPlayer1.src.toLowerCase().includes("marche"))
      ) {
        switchToIdle(currentCharacter);
      } else if (!isPlaying && characterSelected && currentCharacter) {
        switchToIdle(currentCharacter);
      }
    }
  });

  videoPlayer2.addEventListener("ended", () => {
    if (currentVideo === videoPlayer2) {
      if (
        currentCharacter &&
        (videoPlayer2.src.toLowerCase().includes("welcome") ||
          videoPlayer2.src.toLowerCase().includes("entrer") ||
          videoPlayer2.src.toLowerCase().includes("marche"))
      ) {
        switchToIdle(currentCharacter);
      } else if (!isPlaying && characterSelected && currentCharacter) {
        switchToIdle(currentCharacter);
      }
    }
  });

  // Gestion de la fin de l'audio
  audioPlayer.addEventListener("ended", () => {
    isPlaying = false;
    if (currentCharacter && characterSelected) {
      switchToIdle(currentCharacter);
    }
  });

  // Réception des messages du canal
  channel.onmessage = async (event) => {
    // Gestion de la réinitialisation
    if (event.data.action === "reset") {
      if (currentCharacter && characterSelected) {
        await switchToIdle(currentCharacter);
      } else {
        resetState();
      }
      return;
    }

    // Gestion du bouton "Question suivante"
    if (event.data.action === "nextQuestion") {
      if (currentCharacter && characterSelected) {
        audioPlayer.pause();
        isPlaying = false;
        await switchToIdle(currentCharacter);
      }
      return;
    }

    const { video, audio } = event.data;
    if (!video) return;

    startButton.style.display = "none";
    videoContainer.style.display = "block";

    const character = getCharacterFromVideo(video);
    if (!character) {
      console.error("Personnage non reconnu:", video);
      return;
    }

    // Marquer le personnage comme sélectionné
    if (!characterSelected) {
      characterSelected = true;
      backgroundImage.style.opacity = "0";
    }

    // Précharger les vidéos si nécessaire
    if (!currentCharacter || currentCharacter !== character) {
      await preloadVideos(character);
    }

    currentCharacter = character;

    // Gérer la lecture appropriée
    if (audio) {
      await playAudioWithAnimation(audio, character);
    } else if (
      video.includes("welcome") ||
      video.includes("entrer") ||
      video.includes("marche")
    ) {
      nextVideo.loop = false;
      await playVideoWithFade(video);
    } else {
      await playVideoWithFade(video);
    }
  };

  // Activation initiale
  startButton.addEventListener("click", () => {
    startButton.style.display = "none";
    videoContainer.style.display = "block";
    videoPlayer1.muted = false;
    videoPlayer2.muted = false;
    audioPlayer.muted = false;
  });

  // Nettoyage avant fermeture
  window.addEventListener("beforeunload", () => {
    Object.values(videoCache).forEach(URL.revokeObjectURL);
    channel.close();
  });
});
