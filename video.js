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
      welcome: "video/Sophie_Marche.mp4",
      parler: "video/Sophie_discussion.mp4",
      idle: "video/Sophie_idole.mp4",
    },
    playmobil: {
      welcome: "video/Playmobil_Entrer.mp4",
      parler: "video/Playmobil_discussion.mp4",
      idle: "video/Playmobil_idole.mp4",
    },
    fisher: {
      welcome: "video/Téléphone_Entrer.mp4",
      parler: "video/Téléphone_discussion.mp4",
      idle: "video/Téléphone_Idole.mp4",
    },
  };

  // Précharger les vidéos pour un personnage
  async function preloadVideos(character) {
    if (!animations[character]) return;

    for (const [key, url] of Object.entries(animations[character])) {
      if (!videoCache[url]) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          videoCache[url] = URL.createObjectURL(blob);
          console.log(`Préchargement réussi: ${key} pour ${character}`);
        } catch (error) {
          console.error(
            `Erreur de préchargement: ${key} pour ${character}`,
            error
          );
        }
      }
    }
  }

  // Fonction pour basculer entre les lecteurs vidéo
  function switchVideoPlayers() {
    console.log("video change");
    [currentVideo, nextVideo] = [nextVideo, currentVideo];
    currentVideo.style.opacity = "1";
    nextVideo.style.opacity = "0";
  }

  // Fonction pour jouer une animation en fondu enchaîné
  async function playVideoWithFade(videoPath) {
    const cachedUrl = videoCache[videoPath] || videoPath;
    nextVideo.src = cachedUrl;
    nextVideo.loop = true;

    try {
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
    }
  }

  // Fonction pour identifier le personnage
  function getCharacterFromVideo(videoPath) {
    if (videoPath.includes("sophie")) return "sophie";
    if (videoPath.includes("playmobil")) return "playmobil";
    if (videoPath.includes("fisher")) return "fisher";
    return null;
  }

  // Fonction pour jouer l'audio avec l'animation
  async function playAudioWithAnimation(audioPath, character) {
    if (!character || !animations[character]) return;

    await playVideoWithFade(animations[character].parler);
    audioPlayer.src = audioPath;
    isPlaying = true;

    try {
      await audioPlayer.play();
    } catch (error) {
      console.error("Erreur lecture audio:", error);
      isPlaying = false;
    }
  }

  // Transition vers l'animation idle
  async function switchToIdle(character) {
    console.log("condition non verifié");
    if (!animations[character]) return;
    console.log("condition validé");
    await playVideoWithFade(animations[character].idle);
    console.log("idole lancé");
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

  // Réception des messages du canal
  channel.onmessage = async (event) => {
    // Gestion de la réinitialisation standard
    if (event.data.action === "reset") {
      if (currentCharacter && characterSelected) {
        await switchToIdle(currentCharacter); // Lancer l'animation idle
      } else {
        resetState();
      }
      return;
    }

    // Gestion spécifique du bouton "Question suivante"
    if (event.data.action === "nextQuestion") {
      if (currentCharacter && characterSelected) {
        audioPlayer.pause(); // Arrêter l'audio en cours
        isPlaying = false;
        await switchToIdle(currentCharacter); // Lancer l'animation idle
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

    // Marquer le personnage comme sélectionné lors de la première vidéo
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
    } else if (video.includes("welcome")) {
      nextVideo.loop = false;
      await playVideoWithFade(video);
    } else {
      await playVideoWithFade(video);
    }
  };

  // Gestion de la fin de l'audio
  audioPlayer.addEventListener("ended", () => {
    isPlaying = false;
    console.log("switched not verifie ");
    if (currentCharacter && characterSelected) {
      switchToIdle(currentCharacter);
      console.log("switched to idle");
    }
  });

  // Gestion de la fin des vidéos
  videoPlayer1.addEventListener("ended", () => {
    if (!isPlaying && characterSelected && currentCharacter) {
      switchToIdle(currentCharacter);
    }
  });

  videoPlayer2.addEventListener("ended", () => {
    if (!isPlaying && characterSelected && currentCharacter) {
      switchToIdle(currentCharacter);
    }
  });

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
