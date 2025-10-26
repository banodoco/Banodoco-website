// Arca Gidan Prize video hover functionality
document.addEventListener('DOMContentLoaded', function() {
  const videos = document.querySelectorAll('.arcagidan-video');
  
  videos.forEach(video => {
    // Play video on hover
    video.addEventListener('mouseenter', function() {
      this.play();
    });
    
    // Pause video when hover ends
    video.addEventListener('mouseleave', function() {
      this.pause();
      this.currentTime = 0; // Reset to beginning
    });
  });
});

