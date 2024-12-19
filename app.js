// Variables globales
let questions;
let currentQuestion;
let currentSlideIndex = 0;
let isTransitioning = false;
let startX = 0;
let isDragging = false;
let clickStartX = 0;
let clickStartTime = 0;
let currentSessionIndex;
let inactivityTimer;
let backgroundMusic;
let isMusicPlaying = false;

// Constantes
const CLICK_THRESHOLD = 5;
const CLICK_TIMEOUT = 10000;
const STATS_KEY = "appStats";
const INACTIVITY_TIMEOUT = 180000; // 3 minutes

// Canal de communication pour les médias
const channel = new BroadcastChannel("video-channel");

// Fonction pour obtenir les statistiques par défaut
function getDefaultStats() {
  return {
    totalUsers: 0,
    totalVideos: 0,
    totalQuestions: 0,
    interactions: [],
    optionSelections: {},
    daily: {},
    monthly: {},
    sessions: [],
  };
}

// Fonction pour initialiser la musique de fond
function initBackgroundMusic() {
  backgroundMusic = new Audio("audio/Son_fond.mp3"); // Remplacez par le chemin de votre fichier audio
  backgroundMusic.loop = true;
  backgroundMusic.volume = 0.05; // Volume à 30%

  // Gérer la lecture automatique
  document.addEventListener(
    "click",
    function startMusic() {
      if (!isMusicPlaying) {
        backgroundMusic
          .play()
          .then(() => {
            isMusicPlaying = true;
            document.removeEventListener("click", startMusic);
          })
          .catch((error) => console.error("Erreur de lecture audio:", error));
      }
    },
    { once: true }
  );
}

// Fonction pour mettre en pause/reprendre la musique
function toggleBackgroundMusic() {
  if (backgroundMusic.paused) {
    backgroundMusic.play();
    isMusicPlaying = true;
  } else {
    backgroundMusic.pause();
    isMusicPlaying = false;
  }
}

// Ajouter un bouton de contrôle de la musique
function addMusicControls() {
  const musicBtn = document.createElement("button");
  musicBtn.className = "music-control";
  musicBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
    </svg>
  `;
  musicBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    border: none;
    cursor: pointer;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;

  musicBtn.onclick = toggleBackgroundMusic;
  document.body.appendChild(musicBtn);
}

// Modifier la fonction window.addEventListener("load") existante
window.addEventListener("load", () => {
  loadStats();
  globalStats.totalUsers++;
  currentSessionIndex = startNewSession();
  saveStats();
  loadQuestions();
  resetInactivityTimer();

  // Initialiser la musique de fond
  initBackgroundMusic();
  addMusicControls();

  ["mousedown", "mousemove", "keypress", "touchstart", "scroll"].forEach(
    (event) => {
      document.addEventListener(event, resetInactivityTimer);
    }
  );
});

// Ajouter à la gestion de la visibilité de la page
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(inactivityTimer);
    if (isMusicPlaying) {
      backgroundMusic.pause();
    }
  } else {
    resetInactivityTimer();
    if (isMusicPlaying) {
      backgroundMusic.play();
    }
  }
});

// Stats globales initialisées avec les valeurs par défaut
let globalStats = getDefaultStats();

// Gestion de la section texte
function showTextSection(option) {
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const slider = document.querySelector(".slider");
  const textSection = document.createElement("div");

  textSection.id = "text-section";
  textSection.className = "text-section";
  textSection.innerHTML = `
    <div class="text-content">
      <h2>${option.text}</h2>
      <p>${option.description}</p>
      <button id="next-question-btn" class="next-question-button">
        Question suivante
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14m-7-7 7 7-7 7"/>
        </svg>
      </button>
    </div>
  `;

  textSection.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, #ff9800, #ffc107, #ff5722);
    background-size: 300% 300%;
    animation: gradientAnimation 8s ease infinite;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  document.body.appendChild(textSection);

  // Masquer les éléments de question
  if (questionText) questionText.style.display = "none";
  if (optionsContainer) optionsContainer.style.display = "none";
  if (slider) slider.style.display = "none";

  // Afficher la section texte avec animation
  requestAnimationFrame(() => {
    textSection.style.opacity = "1";
  });

  // Ajouter l'événement click au bouton
  const nextButton = document.getElementById("next-question-btn");
  nextButton.addEventListener("click", () => {
    hideTextSection();

    // Envoyer un message spécifique pour le passage à la question suivante
    channel.postMessage({ action: "nextQuestion" });

    setTimeout(() => {
      const questionText = document.getElementById("question-text");
      if (questionText) questionText.style.display = "block";

      if (option.nextQuestion) {
        showQuestion(option.nextQuestion);
      } else {
        endQuestionnaire();
      }
    }, 300);
  });
}

function hideTextSection() {
  const textSection = document.getElementById("text-section");
  if (textSection) {
    textSection.style.opacity = "0";
    setTimeout(() => {
      textSection.remove();
    }, 300);
  }
}

// Fonction pour réinitialiser le timer d'inactivité
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    returnToFirstQuestion();
  }, INACTIVITY_TIMEOUT);
}

// Fonction pour retourner à la première question
function returnToFirstQuestion() {
  clearTimeout(inactivityTimer);
  hideTextSection();
  if (questions && questions.length > 0) {
    currentSlideIndex = 0;
    showQuestion(questions[0].id);
    channel.postMessage({ action: "reset" });
  }
  resetInactivityTimer();
}

// Charger les stats depuis localStorage
function loadStats() {
  try {
    const savedStats = localStorage.getItem(STATS_KEY);
    if (savedStats) {
      globalStats = {
        ...getDefaultStats(),
        ...JSON.parse(savedStats),
      };
    }
  } catch (error) {
    console.error("Erreur lors du chargement des stats:", error);
    globalStats = getDefaultStats();
  }
}

// Sauvegarder les stats dans localStorage
function saveStats() {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(globalStats));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des stats:", error);
  }
}

// Gestion des sessions
function startNewSession() {
  const session = {
    startTime: new Date().toISOString(),
    endTime: null,
  };
  globalStats.sessions.push(session);
  saveStats();
  return globalStats.sessions.length - 1;
}

function endSession(sessionIndex) {
  if (globalStats.sessions[sessionIndex]) {
    globalStats.sessions[sessionIndex].endTime = new Date().toISOString();
    saveStats();
  }
}

// Charger les questions
async function loadQuestions() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    questions = data.questions;

    if (questions && questions.length > 0) {
      currentQuestion = questions[0];
      document.getElementById("question-text").textContent =
        currentQuestion.text;
      setupInitialSlider(questions[0].options);
    }
  } catch (error) {
    console.error("Erreur de chargement:", error);
    document.getElementById("question-text").textContent =
      "Erreur de chargement des questions";
  }
}

// Configuration du slider
function setupInitialSlider(options) {
  if (!options?.length) return;
  setupSlider(options);
  const slider = document.querySelector(".slider");
  if (slider) slider.style.display = "flex";
}

function setupSlider(options) {
  if (!options?.length) return;

  const slidesContainer = document.querySelector(".slides");
  if (!slidesContainer) return;

  slidesContainer.innerHTML = "";

  options.forEach((option, index) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.setAttribute("data-index", index);

    slide.innerHTML = `
      <div class="slide__inner">
        <img class="slide--image" src="${option.image}" alt="${option.text}" />
        <div class="slide-info">
          <div class="slide-info--text" data-title>${option.text}</div>
          ${
            option.subtitle
              ? `<div class="slide-subtitle">${option.subtitle}</div>`
              : ""
          }
        </div>
      </div>
    `;

    slide.addEventListener("touchstart", handleTouchStart, { passive: false });
    slide.addEventListener("touchmove", handleTouchMove, { passive: false });
    slide.addEventListener("touchend", handleTouchEnd);
    slide.addEventListener("mousedown", handleMouseDown);

    slidesContainer.appendChild(slide);
  });

  setupSliderNavigation();
  updateSlidePositions();
}

// Gestion des événements tactiles
function handleTouchStart(e) {
  resetInactivityTimer();
  startX = e.touches[0].clientX;
  clickStartX = e.touches[0].clientX;
  clickStartTime = Date.now();
  isDragging = true;
}

function handleTouchMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const currentX = e.touches[0].clientX;
  const diff = startX - currentX;

  if (Math.abs(diff) > 50) {
    const direction = diff > 0 ? 1 : -1;
    navigate(direction);
    isDragging = false;
  }
}

function handleTouchEnd(e) {
  resetInactivityTimer();
  if (!isDragging) return;

  const touch = e.changedTouches[0];
  const diffX = Math.abs(touch.clientX - clickStartX);
  const diffTime = Date.now() - clickStartTime;

  if (diffX < CLICK_THRESHOLD && diffTime < CLICK_TIMEOUT) {
    handleSlideClick(e.target.closest(".slide"));
  }

  isDragging = false;
}

// Gestion des événements souris
function handleMouseDown(e) {
  resetInactivityTimer();
  startX = e.clientX;
  clickStartX = e.clientX;
  clickStartTime = Date.now();
  isDragging = true;

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function handleMouseMove(e) {
  if (!isDragging) return;

  const diff = startX - e.clientX;
  if (Math.abs(diff) > 50) {
    const direction = diff > 0 ? 1 : -1;
    navigate(direction);
    isDragging = false;
  }
}

function handleMouseUp(e) {
  resetInactivityTimer();
  if (!isDragging) return;

  const diffX = Math.abs(e.clientX - clickStartX);
  const diffTime = Date.now() - clickStartTime;

  if (diffX < CLICK_THRESHOLD && diffTime < CLICK_TIMEOUT) {
    handleSlideClick(e.target.closest(".slide"));
  }

  isDragging = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
}

// Navigation du slider
function navigate(direction) {
  resetInactivityTimer();
  if (isTransitioning || !currentQuestion?.options) return;

  const totalSlides = currentQuestion.options.length;
  currentSlideIndex =
    (currentSlideIndex + direction + totalSlides) % totalSlides;

  isTransitioning = true;
  updateSlidePositions();

  setTimeout(() => {
    isTransitioning = false;
  }, 500);
}

// Mise à jour des positions des slides
function updateSlidePositions() {
  const slides = document.querySelectorAll(".slide");
  if (!slides.length) return;

  slides.forEach((slide, index) => {
    slide.removeAttribute("data-previous");
    slide.removeAttribute("data-current");
    slide.removeAttribute("data-next");

    const position =
      (index - currentSlideIndex + slides.length) % slides.length;

    if (position === 0) {
      slide.setAttribute("data-current", "");
    } else if (position === slides.length - 1) {
      slide.setAttribute("data-previous", "");
    } else if (position === 1) {
      slide.setAttribute("data-next", "");
    }
  });
}

// Gestion des clics sur les slides
function handleSlideClick(slideElement) {
  resetInactivityTimer();
  if (!slideElement || !currentQuestion?.options) return;

  const index = parseInt(slideElement.getAttribute("data-index"));
  if (isNaN(index)) return;

  const option = currentQuestion.options[index];
  if (!option) return;

  if (index === currentSlideIndex) {
    if (option.video || option.audio) {
      showTextSection(option);

      channel.postMessage({
        video: option.video,
        audio: option.audio,
      });
      updateStats(option);

      const audioEndListener = (event) => {
        if (event.data.action === "audioEnded") {
          hideTextSection();

          setTimeout(() => {
            const questionText = document.getElementById("question-text");
            if (questionText) questionText.style.display = "block";

            if (option.nextQuestion) {
              showQuestion(option.nextQuestion);
            } else {
              endQuestionnaire();
            }
          }, 300);

          channel.removeEventListener("message", audioEndListener);
        }
      };

      channel.addEventListener("message", audioEndListener);
    }
  } else {
    const direction = index > currentSlideIndex ? 1 : -1;
    navigate(direction);
  }
}

// Configuration des boutons de navigation
function setupSliderNavigation() {
  const prevBtn = document.querySelector(".slider--btn.prev");
  const nextBtn = document.querySelector(".slider--btn.next");

  if (prevBtn) {
    prevBtn.onclick = () => {
      resetInactivityTimer();
      navigate(-1);
    };
  }
  if (nextBtn) {
    nextBtn.onclick = () => {
      resetInactivityTimer();
      navigate(1);
    };
  }
}

// Affichage d'une question
function showQuestion(questionId) {
  resetInactivityTimer();
  const newQuestion = questions?.find((q) => q.id === questionId);
  if (!newQuestion) {
    endQuestionnaire();
    return;
  }

  currentQuestion = newQuestion;
  currentSlideIndex = 0;

  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const slider = document.querySelector(".slider");

  if (questionText) {
    questionText.style.display = "block";
    questionText.textContent = currentQuestion.text;
  }

  if (currentQuestion.useSlider) {
    setupSlider(currentQuestion.options);
    if (optionsContainer) optionsContainer.style.display = "none";
    if (slider) slider.style.display = "flex";
  } else {
    setupOptionsAsButtons(currentQuestion.options);
    if (slider) slider.style.display = "none";
    if (optionsContainer) optionsContainer.style.display = "flex";
  }
}

// Configuration des options comme boutons
function setupOptionsAsButtons(options) {
  if (!options?.length) return;

  const container = document.getElementById("options-container");
  if (!container) return;

  container.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "option-button";
    button.textContent = option.text;

    button.onclick = () => {
      resetInactivityTimer();

      if (option.video || option.audio) {
        showTextSection(option);

        channel.postMessage({
          video: option.video,
          audio: option.audio,
        });
        updateStats(option);

        const audioEndListener = (event) => {
          if (event.data.action === "audioEnded") {
            hideTextSection();

            setTimeout(() => {
              if (option.nextQuestion) {
                showQuestion(option.nextQuestion);
              } else {
                endQuestionnaire();
              }
            }, 300);

            channel.removeEventListener("message", audioEndListener);
          }
        };

        channel.addEventListener("message", audioEndListener);
      }
    };

    container.appendChild(button);
  });
}

// Fin du questionnaire
function endQuestionnaire() {
  clearTimeout(inactivityTimer);
  const elements = {
    questionText: document.getElementById("question-text"),
    optionsContainer: document.getElementById("options-container"),
    slider: document.querySelector(".slider"),
  };

  if (elements.questionText) {
    elements.questionText.innerHTML = `
      Merci d'avoir participé !<br>
      <span style="font-size: 0.8em; display: block; margin-top: 1em;">
        Merci à l'IIM digital school et à<br>
        D'ANDURAIN Xavier, DA COSTA FERNANDES Julie, DARAICHE Vladimir,<br>
        RASINGER Elise, ROBERT Camille, HOUAT Sofiane,<br>
        GODEFROY Célestin, ALHADEF Samuel, PARONE Raphaël
      </span>`;
  }
  if (elements.optionsContainer) {
    elements.optionsContainer.innerHTML = "";
  }
  if (elements.slider) {
    elements.slider.style.display = "none";
  }

  endSession(currentSessionIndex);

  setTimeout(() => {
    returnToFirstQuestion();
  }, 3000);
}

// Mise à jour des statistiques
function updateStats(option) {
  if (!option || !currentQuestion) return;

  const timestamp = new Date();

  globalStats.interactions.push({
    timestamp: timestamp.toISOString(),
    action: option.video ? "video" : "question",
    optionSelected: option.text,
    questionId: currentQuestion.id,
  });

  if (option.video) globalStats.totalVideos++;
  globalStats.totalQuestions++;
  globalStats.optionSelections[option.text] =
    (globalStats.optionSelections[option.text] || 0) + 1;

  const dateKey = timestamp.toISOString().split("T")[0];
  const monthKey = timestamp.toISOString().slice(0, 7);

  if (!globalStats.daily[dateKey]) {
    globalStats.daily[dateKey] = { visitors: 0, videos: 0, questions: 0 };
  }
  if (!globalStats.monthly[monthKey]) {
    globalStats.monthly[monthKey] = { visitors: 0, videos: 0, questions: 0 };
  }

  if (option.video) {
    globalStats.daily[dateKey].videos++;
    globalStats.monthly[monthKey].videos++;
  }
  globalStats.daily[dateKey].questions++;
  globalStats.monthly[monthKey].questions++;

  saveStats();
}

// Initialisation
window.addEventListener("load", () => {
  loadStats();
  globalStats.totalUsers++;
  currentSessionIndex = startNewSession();
  saveStats();
  loadQuestions();
  resetInactivityTimer();

  // Ajouter les écouteurs d'événements pour réinitialiser le timer
  ["mousedown", "mousemove", "keypress", "touchstart", "scroll"].forEach(
    (event) => {
      document.addEventListener(event, resetInactivityTimer);
    }
  );
});

// Gestion de la fermeture de la page
window.addEventListener("beforeunload", () => {
  if (currentSessionIndex !== undefined) {
    endSession(currentSessionIndex);
  }
  // Nettoyer le canal de communication
  channel.close();
});

// Gestion de la visibilité de la page
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(inactivityTimer);
  } else {
    resetInactivityTimer();
  }
});

// Fonction helper pour vérifier si un élément est visible
function isElementVisible(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Gestion du redimensionnement de la fenêtre
window.addEventListener("resize", () => {
  if (currentQuestion?.useSlider) {
    updateSlidePositions();
  }
});
