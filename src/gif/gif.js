(() => {
  const gifImg = document.getElementById('gif-img');
  const container = document.getElementById('gif-container');

  // Parse note ID and GIF asset from URL query
  const params = new URLSearchParams(window.location.search);
  const gifAsset = params.get('asset');

  if (gifAsset && gifAsset !== 'null') {
    // We assume the window loads from src/gif/gif.html
    gifImg.src = `../../assets/gif/${gifAsset}`;
  } else {
    // If no gif asset was passed, don't show a broken image
    gifImg.style.display = 'none';
  }

  // Handle click interaction (bounce effect)
  window.addEventListener('mousedown', (e) => {
    // Only bounce on primary left click
    if (e.button === 0) {
      container.classList.add('bounce');
    }
  });

  window.addEventListener('mouseup', () => {
    container.classList.remove('bounce');
  });

  window.addEventListener('mouseleave', () => {
    container.classList.remove('bounce');
  });
})();
