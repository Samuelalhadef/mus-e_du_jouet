// Variables globales pour les graphiques
let optionsChart = null;
let trendsChart = null;

// Liste des jouets spécifiques à suivre
const SPECIFIC_TOYS = [
  "Sophie la girafe",
  "Playmobil",
  "Téléphone Fisher-Price",
];

// Fonction de mise à jour de l'heure
function updateDateTime() {
  const now = new Date();
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

  document.getElementById("current-date").textContent = now.toLocaleDateString(
    "fr-FR",
    dateOptions
  );
  document.getElementById("current-time").textContent = now.toLocaleTimeString(
    "fr-FR",
    timeOptions
  );
}

// Fonction de formatage des statistiques
function formatStatsData(rawData) {
  // Initialisation des jouets avec des valeurs par défaut
  const toySelections = {};
  SPECIFIC_TOYS.forEach((toy) => {
    toySelections[toy] = 0;
  });

  // Ajout d'un log pour voir les données brutes
  console.log("Données brutes des options:", rawData.optionSelections);

  // Mise à jour avec les données réelles
  if (rawData.optionSelections) {
    SPECIFIC_TOYS.forEach((toy) => {
      // Ajoutons un log pour chaque jouet
      console.log(`Recherche de ${toy}:`, rawData.optionSelections[toy]);
      if (rawData.optionSelections[toy] !== undefined) {
        toySelections[toy] = rawData.optionSelections[toy];
      }
    });
  }

  // Log des sélections finales
  console.log("Sélections des jouets après traitement:", toySelections);

  // Le reste de la fonction reste identique...
  const hourlyData = {};
  if (rawData.interactions) {
    rawData.interactions.forEach((interaction) => {
      const date = new Date(interaction.timestamp);
      const hourKey = date.getHours();

      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          visitors: 0,
          videos: 0,
          questions: 0,
        };
      }

      if (interaction.action === "video") {
        hourlyData[hourKey].videos++;
      } else {
        hourlyData[hourKey].questions++;
      }
      hourlyData[hourKey].visitors++;
    });
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const trends = {
    labels: hours.map((hour) => `${hour}h`),
    visitors: hours.map((hour) => hourlyData[hour]?.visitors || 0),
    videos: hours.map((hour) => hourlyData[hour]?.videos || 0),
    questions: hours.map((hour) => hourlyData[hour]?.questions || 0),
  };

  return {
    userCount: rawData.totalUsers || 0,
    videoCount: rawData.totalVideos || 0,
    questionCount: rawData.totalQuestions || 0,
    optionSelections: toySelections,
    trends: trends,
    sessions: rawData.sessions || [],
  };
}

// Fonction de mise à jour des statistiques
function updateStats() {
  const rawData = JSON.parse(localStorage.getItem("appStats") || "{}");
  const data = formatStatsData(rawData);

  // Mise à jour des compteurs
  document.getElementById("user-count").textContent = data.userCount;
  document.getElementById("video-count").textContent = data.videoCount;
  document.getElementById("question-count").textContent = data.questionCount;

  const activeSessions = data.sessions.filter(
    (session) => !session.endTime
  ).length;
  document.getElementById("session-count").textContent = activeSessions;

  // Mise à jour du graphique camembert
  const optionsCtx = document.getElementById("optionsChart").getContext("2d");
  if (optionsChart) {
    optionsChart.destroy();
  }

  optionsChart = new Chart(optionsCtx, {
    type: "pie",
    data: {
      labels: SPECIFIC_TOYS,
      datasets: [
        {
          data: SPECIFIC_TOYS.map((toy) => data.optionSelections[toy]),
          backgroundColor: [
            "#FF6384", // Sophie la Girafe
            "#36A2EB", // Playmobil
            "#FFCE56", // Téléphone Fisher-Price
          ],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Statistiques des jouets",
        },
        legend: {
          position: "bottom",
          labels: {
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              return `${label}: ${value} sélection${value > 1 ? "s" : ""}`;
            },
          },
        },
      },
    },
  });

  // Mise à jour du graphique des tendances
  const trendsCtx = document.getElementById("trendsChart").getContext("2d");
  if (trendsChart) {
    trendsChart.destroy();
  }

  trendsChart = new Chart(trendsCtx, {
    type: "line",
    data: {
      labels: data.trends.labels,
      datasets: [
        {
          label: "Visiteurs",
          data: data.trends.visitors,
          borderColor: "#FF6384",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Vidéos vues",
          data: data.trends.videos,
          borderColor: "#36A2EB",
          tension: 0.3,
          fill: false,
        },
        {
          label: "Questions répondues",
          data: data.trends.questions,
          borderColor: "#4BC0C0",
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Activité par heure",
        },
        legend: {
          position: "bottom",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Nombre d'interactions",
          },
        },
        x: {
          title: {
            display: true,
            text: "Heure de la journée",
          },
        },
      },
    },
  });

  // Mise à jour de la liste des sessions
  updateSessionsList(data.sessions);
}

// Fonction de mise à jour de la liste des sessions
function updateSessionsList(sessions) {
  const container = document.getElementById("recent-sessions");
  container.innerHTML = "";

  const recentSessions = [...sessions]
    .reverse()
    .slice(0, 10)
    .map((session) => {
      const start = new Date(session.startTime);
      const end = session.endTime ? new Date(session.endTime) : null;
      const duration = end
        ? ((end - start) / 1000 / 60).toFixed(1)
        : "En cours";

      return `
                       <div class="session-item">
                           Début: ${start.toLocaleString("fr-FR")}
                           ${
                             end
                               ? `<br>Fin: ${end.toLocaleString("fr-FR")}`
                               : ""
                           }
                           <br>Durée: ${duration} ${end ? "minutes" : ""}
                       </div>
                   `;
    })
    .join("");

  container.innerHTML = recentSessions || "<p>Aucune session récente</p>";
}

// Gestion de l'export des statistiques
document.getElementById("export-stats").addEventListener("click", () => {
  const stats = localStorage.getItem("appStats");
  if (!stats) {
    alert("Aucune statistique à exporter");
    return;
  }

  const blob = new Blob([stats], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stats_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// Gestion de l'import des statistiques
document.getElementById("import-stats").addEventListener("click", () => {
  document.getElementById("import-input").click();
});
document.getElementById("import-input").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      // Lecture et validation du JSON importé
      const stats = JSON.parse(e.target.result);
      localStorage.setItem("appStats", JSON.stringify(stats));

      // Mise à jour de l'interface avec les nouvelles données
      updateStats();
      alert("Statistiques importées avec succès");
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      alert("Erreur lors de l'import des statistiques");
    }
  };
  reader.readAsText(file);
});

// Fonction pour vérifier si une session est active
function isActiveSession(session) {
  if (!session.endTime) return true;
  const end = new Date(session.endTime);
  const now = new Date();
  return end > now;
}

// Fonction pour compter les sessions actives aujourd'hui
function getActiveSessions(sessions) {
  const today = new Date().toISOString().split("T")[0];
  return sessions.filter((session) => {
    const sessionDate = new Date(session.startTime).toISOString().split("T")[0];
    return sessionDate === today && isActiveSession(session);
  }).length;
}

// Fonction pour formater la durée en format lisible
function formatDuration(minutes) {
  if (minutes < 1) return "Moins d'une minute";
  if (minutes < 60)
    return `${Math.floor(minutes)} minute${minutes >= 2 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  let duration = `${hours} heure${hours >= 2 ? "s" : ""}`;
  if (remainingMinutes > 0) {
    duration += ` et ${remainingMinutes} minute${
      remainingMinutes >= 2 ? "s" : ""
    }`;
  }
  return duration;
}

// Fonction pour démarrer les mises à jour en temps réel
function startRealTimeUpdates() {
  // Mise à jour de l'heure chaque seconde
  setInterval(updateDateTime, 1000);

  // Mise à jour des statistiques toutes les 30 secondes
  setInterval(updateStats, 30000);

  // Vérification des sessions actives chaque minute
  setInterval(() => {
    const rawData = JSON.parse(localStorage.getItem("appStats") || "{}");
    if (rawData.sessions) {
      const activeCount = getActiveSessions(rawData.sessions);
      document.getElementById("session-count").textContent = activeCount;
    }
  }, 60000);
}

// Fonction d'initialisation du dashboard
function initializeDashboard() {
  // Première mise à jour de l'heure
  updateDateTime();

  // Première mise à jour des statistiques
  updateStats();

  // Démarrage des mises à jour automatiques
  startRealTimeUpdates();
}

// Démarrage de l'application au chargement de la page
document.addEventListener("DOMContentLoaded", initializeDashboard);

// Gestion des erreurs globales
window.addEventListener("error", (event) => {
  console.error("Erreur globale:", event.error);
  // On pourrait ajouter ici une notification visuelle pour l'administrateur
});
