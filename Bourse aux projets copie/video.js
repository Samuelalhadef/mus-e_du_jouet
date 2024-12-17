document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('video-player');
    const startButton = document.getElementById('start-button');
    const channel = new BroadcastChannel('video-channel');

    // Gestion du bouton pour activer l'audio
    startButton.addEventListener('click', () => {
        videoPlayer.style.display = 'block';
        startButton.style.display = 'none';
        videoPlayer.muted = false;
        videoPlayer.play();
    });

    // Gestion des messages pour les vidéos
    channel.onmessage = (event) => {
        const { video } = event.data;
        if (video) {
            videoPlayer.src = video;
            videoPlayer.play().catch(error => {
                console.error('Erreur de lecture:', error);
            });
        }
    };
});
