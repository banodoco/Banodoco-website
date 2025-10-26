// Arca Gidan Prize GIF animation functionality
document.addEventListener('DOMContentLoaded', function() {
  const gifs = document.querySelectorAll('.arcagidan-gif');
  
  gifs.forEach(gif => {
    let isAnimating = false;
    
    // Desktop: Show animated GIF on hover
    gif.addEventListener('mouseenter', function() {
      this.src = this.dataset.animated;
      isAnimating = true;
    });
    
    // Desktop: Show static poster when hover ends
    gif.addEventListener('mouseleave', function() {
      this.src = this.dataset.static;
      isAnimating = false;
    });
    
    // Mobile: Toggle between static and animated on tap
    gif.addEventListener('touchstart', function(e) {
      e.preventDefault();
      if (isAnimating) {
        this.src = this.dataset.static;
        isAnimating = false;
      } else {
        this.src = this.dataset.animated;
        isAnimating = true;
      }
    });
  });
});
