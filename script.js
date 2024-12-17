function startApplication() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    window.open('questions.html', 'questions', `width=${screenWidth / 2},height=${screenHeight},left=0,top=0`);

    window.open('videos.html', 'videos', `width=${screenWidth / 2},height=${screenHeight},left=${screenWidth / 2},top=0`);
}

function openAdmin() {
    window.open('admin.html', 'admin', 'width=800,height=600');
}
