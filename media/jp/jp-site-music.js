(function (window, document) {
  var SRC = 'media/jp/sublime-piano-instrumental.mp3';
  var STORAGE_KEY = 'jp_site_music_muted';
  var VOLUME = 0.38;
  var audio = null;
  var toggle = null;
  var playing = false;
  var unlocked = false;

  function readMuted() {
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function writeMuted(muted) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch (e) {}
  }

  function iconPlaying() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V6l10 6-10 6z" fill="currentColor"/><path d="M5 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function iconMuted() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/><path d="M16 9l4 4M20 9l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function setToggleState(isPlaying) {
    if (!toggle) return;
    playing = isPlaying;
    toggle.classList.toggle('jp-site-music-toggle--playing', isPlaying);
    toggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      isPlaying ? 'Silenciar música' : 'Ativar música'
    );
    toggle.innerHTML = isPlaying ? iconPlaying() : iconMuted();
  }

  function tryPlay() {
    if (!audio || readMuted()) {
      setToggleState(false);
      return;
    }
    audio.volume = VOLUME;
    var promise = audio.play();
    if (promise && promise.then) {
      promise
        .then(function () {
          setToggleState(true);
        })
        .catch(function () {
          setToggleState(false);
        });
      return;
    }
    setToggleState(!audio.paused);
  }

  function bindUnlock() {
    if (unlocked) return;
    var run = function () {
      unlocked = true;
      tryPlay();
    };
    [
      'touchstart',
      'touchend',
      'pointerdown',
      'click',
      'scroll',
      'keydown',
      'pageshow',
    ].forEach(function (eventName) {
      document.addEventListener(eventName, run, true);
    });
    window.addEventListener('pageshow', run);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !readMuted()) tryPlay();
    });
  }

  function onToggleClick() {
    if (!audio) return;
    if (audio.paused) {
      writeMuted(false);
      tryPlay();
      return;
    }
    audio.pause();
    writeMuted(true);
    setToggleState(false);
  }

  function mount() {
    audio = document.createElement('audio');
    audio.id = 'jp-site-music';
    audio.src = SRC;
    audio.preload = 'auto';
    audio.loop = true;
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'playsinline');
    document.body.appendChild(audio);

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'jp-site-music-toggle';
    toggle.className = 'jp-site-music-toggle';
    toggle.hidden = false;
    toggle.addEventListener('click', onToggleClick);
    document.body.appendChild(toggle);

    audio.addEventListener('play', function () {
      setToggleState(true);
    });
    audio.addEventListener('pause', function () {
      setToggleState(false);
    });

    setToggleState(false);
    bindUnlock();
    tryPlay();
    window.setTimeout(tryPlay, 400);
    window.setTimeout(tryPlay, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.addEventListener('load', tryPlay);
})(window, document);
