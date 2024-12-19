function startApplication() {
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  window.open(
    "questions.html",
    "questions",
    `width=${screenWidth / 2},height=${screenHeight},left=0,top=0`
  );
  window.open(
    "videos.html",
    "videos",
    `width=${screenWidth / 2},height=${screenHeight},left=${
      screenWidth / 2
    },top=0`
  );
}

function openAdmin() {
  const code = prompt("Veuillez entrer le code d'accès :");
  const correctCode = "151515"; // Vous pouvez changer ce code selon vos besoins

  if (code === correctCode) {
    window.open("admin.html", "admin", "width=800,height=600");
  } else if (code !== null) {
    // Si l'utilisateur n'a pas cliqué sur "Annuler"
    alert("Code incorrect. Accès refusé.");
  }
}
