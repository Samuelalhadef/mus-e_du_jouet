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

// Constantes
const CLICK_THRESHOLD = 5;
const CLICK_TIMEOUT = 300;
const STATS_KEY = "appStats";

// Canal de communication pour les vidéos
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

// Stats globales initialisées avec les valeurs par défaut
let globalStats = getDefaultStats();

// Fonctions de gestion du temps
function getCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return now.toLocaleDateString("fr-FR", options);
}

// Charger les stats depuis localStorage
function loadStats() {
  try {
    const savedStats = localStorage.getItem(STATS_KEY);
    if (savedStats) {
      const parsedStats = JSON.parse(savedStats);
      globalStats = {
        ...getDefaultStats(),
        ...parsedStats,
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

// Navigation dans le slider
function navigate(direction) {
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
  if (!slideElement || !currentQuestion?.options) return;

  const index = parseInt(slideElement.getAttribute("data-index"));
  if (isNaN(index)) return;

  const option = currentQuestion.options[index];
  if (!option) return;

  if (index === currentSlideIndex) {
    if (option.video) {
      channel.postMessage({ video: option.video });
      updateStats(option);
    }

    if (option.nextQuestion) {
      showQuestion(option.nextQuestion);
    } else {
      endQuestionnaire();
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

  if (prevBtn) prevBtn.onclick = () => navigate(-1);
  if (nextBtn) nextBtn.onclick = () => navigate(1);
}

// Affichage d'une question
function showQuestion(questionId) {
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

  if (questionText) questionText.textContent = currentQuestion.text;

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
      if (option.video) {
        channel.postMessage({ video: option.video });
        updateStats(option);
      }

      if (option.nextQuestion) {
        showQuestion(option.nextQuestion);
      } else {
        endQuestionnaire();
      }
    };

    container.appendChild(button);
  });
}

// Fin du questionnaire
function endQuestionnaire() {
  const elements = {
    questionText: document.getElementById("question-text"),
    optionsContainer: document.getElementById("options-container"),
    slider: document.querySelector(".slider"),
  };

  if (elements.questionText) {
    elements.questionText.textContent = "Merci d'avoir participé !";
  }
  if (elements.optionsContainer) {
    elements.optionsContainer.innerHTML = "";
  }
  if (elements.slider) {
    elements.slider.style.display = "none";
  }

  endSession(currentSessionIndex);
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
});

// Gestion de la fermeture de la page
window.addEventListener("beforeunload", () => {
  if (currentSessionIndex !== undefined) {
    endSession(currentSessionIndex);
  }
});
