// My jankiest code yet.

// favicon.min.js
/* http://mit-license.org */ function e() {
  function f(a) { var b = g.createElement("link"); b.type = "image/x-icon"; b.rel = "icon"; b.href = a; a = h.getElementsByTagName("link"); for (var c = 0; c < a.length; c++)/\bicon\b/i.test(a[c].getAttribute("rel")) && h.removeChild(a[c]); h.appendChild(b) } var g = document, h = g.getElementsByTagName("head")[0], d = null; return {
    defaultPause: 2E3, change: function (a, b) { clearTimeout(d); b && (g.title = b); "" !== a && f(a) }, animate: function (a, b) {
      clearTimeout(d); a.forEach(function (a) { (new Image).src = a }); b = b || this.defaultPause; var c = 0;
      f(a[c]); d = setTimeout(function k() { c = (c + 1) % a.length; f(a[c]); d = setTimeout(k, b) }, b)
    }, stopAnimate: function () { clearTimeout(d) }
  }
} "function" === typeof define && define.amd ? define([], e) : "object" === typeof module && module.exports ? module.exports = e() : ("undefined" !== typeof self ? self : this).favicon = e();
// end favicon.min.js

function makeRequest({ method, url, headers, responseType, params, form, onprogress, uploadonprogress }) {
  // Blatantly adapted from https://stackoverflow.com/a/30008115/10239789.
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    if (responseType)
      xhr.responseType = responseType;
    xhr.onload = function (evt) {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: xhr.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      console.log('error:', xhr.status);
      reject({
        status: xhr.status,
        statusText: xhr.statusText
      });
    };
    if (onprogress)
      xhr.onprogress = onprogress;
    if (uploadonprogress)
      xhr.upload.onprogress = uploadonprogress;
    if (headers) {
      Object.keys(headers).forEach(function (key) {
        xhr.setRequestHeader(key, headers[key]);
      });
    }
    if (params) {
      // We'll need to stringify if we've been given an object
      // If we have a string, this is skipped.
      if (params && typeof params === 'object') {
        params = Object.keys(params).map(function (key) {
          return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
      }
      xhr.send(params);
    } else if (form) {
      xhr.send(form);
    } else {
      xhr.send();
    }
  });
}

// Blatantly adapted from https://codepen.io/pimskie/pen/bGjMdxV.
// Disc-jockeying UX is a bit wonky with two discs, but whatebbs.
const clamp = (x, lo, hi) => Math.max(lo, Math.min(x, hi)),
  centerOf = (i) => {
    const { left: e, top: t, width: s, height: n } = i.getBoundingClientRect(),
      o = e + s / 2,
      a = t + n / 2;
    return { x: o, y: a };
  },
  w = (i, e) => Math.atan2(e.y - i.y, e.x - i.x),
  R = (i, e) => Math.atan2(Math.sin(i - e), Math.cos(i - e)),
  spinRate = 0.75,
  C = spinRate * 60,
  L = C * Math.PI * 2,
  M = L / 60,
  b = M * 0.001,
  rev = Math.PI * 2;

class Disc {
  constructor(elContainer, elDiscs) {
    this.elContainer = elContainer;
    this.elDiscs = elDiscs;
    this._isPoweredOn = false;
    this._playbackSpeed = 1;
    this._duration = 0;
    this._isDragging = false;
    this.centers = this.elDiscs.map(centerOf);
    this.angle = 0;
    this.anglePrevious = 0;
    this.maxAngle = rev;
    this.rafId = null;
    this.timestampPrevious = performance.now();
    this.draggingSpeeds = [];
    this.draggingFrom = {};
    this.isReversed = false;
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragProgress = this.onDragProgress.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.loop = this.loop.bind(this);
    this.callbacks = {
      onDragEnded: () => { },
      onAutoRotate: () => { },
      onStop: () => { },
      onLoop: () => { },
    };
    this.currDragDisc = null;
    this.init();
  }
  init() {
    this.elDiscs.forEach((d, i) => d.addEventListener("pointerdown", e => this.onDragStart(e, i)));
  }
  get playbackSpeed() {
    return this._playbackSpeed;
  }
  set playbackSpeed(e) {
    this.draggingSpeeds.push(e);

    // Get last 10 items.
    this.draggingSpeeds = this.draggingSpeeds.slice(Math.max(0, this.draggingSpeeds.length - 10));

    const summed = this.draggingSpeeds.reduce((e, t) => e + t, 0) / this.draggingSpeeds.length;
    this._playbackSpeed = clamp(summed, -4, 4);
  }
  get secondsPlayed() {
    return this.angle / rev / spinRate;
  }
  get duration() {
    return this._duration;
  }
  set duration(dur) {
    this._duration = dur;
    this.maxAngle = dur * spinRate * rev;
  }
  set isDragging(e) {
    this._isDragging = e;
    this.elDiscs.forEach(d => d.classList.toggle("is-scratching", e));
  }
  get isDragging() {
    return this._isDragging;
  }
  powerOn() {
    this._isPoweredOn = true;
    this._playbackSpeed = 1;
    this.start();
  }
  powerOff() {
    this._isPoweredOn = false;
    this.stop();
  }
  onDragStart(e, i) {
    this.currDragDisc = i;
    document.body.addEventListener("pointermove", this.onDragProgress);
    document.body.addEventListener("pointerup", this.onDragEnd);
    this.centers[i] = centerOf(this.elDiscs[i]);
    this.draggingFrom = { x: e.clientX, y: e.clientY };
    this.isDragging = true;
  }
  onDragProgress(e) {
    e.preventDefault();
    const { clientX: x, clientY: y } = e,
      n = { x, y },
      o = w(this.centers[this.currDragDisc], n),
      a = w(this.centers[this.currDragDisc], this.draggingFrom),
      l = R(a, o);
    this.setAngle(this.angle - l),
      (this.draggingFrom = { ...n }),
      this.setState();
  }
  onDragEnd() {
    document.body.removeEventListener("pointermove", this.onDragProgress);
    document.body.removeEventListener("pointerup", this.onDragEnd);
    this.currDragDisc = null;
    this.isDragging = false;
    this.playbackSpeed = 1;
    this.callbacks.onDragEnded(this.secondsPlayed);
  }
  autoRotate(t) {
    const dt = t - this.timestampPrevious;
    let s = b * dt * this.playbackSpeed;
    s += 0.1;
    s = clamp(s, 0, b * dt);
    this.setAngle(this.angle + s);
  }
  setState() {
    // this.elContainer.style.transform = `rotate(${this.angle}rad)`;
    this.elContainer.style.setProperty("--disc-angle", `${this.angle}rad`);
  }
  setAngle(e) {
    return (this.angle = clamp(e, 0, this.maxAngle)), this.angle;
  }
  start() {
    this.isDragging = false;
    this.isReversed = false;
    this.anglePrevious = this.angle;
    this.timestampPrevious = performance.now();
    this.draggingSpeeds = [1];
    this._playbackSpeed = 1;
    this.loop();
  }
  stop() {
    cancelAnimationFrame(this.rafId);
    this.callbacks.onStop();
  }
  rewind() {
    this.setAngle(0);
  }
  loop() {
    if (!this._isPoweredOn)
      return;

    const t = performance.now();
    this.isDragging || this.autoRotate(t);
    const dt = t - this.timestampPrevious,
      dw = this.angle - this.anglePrevious,
      n = b * dt;
    this.playbackSpeed = (dw / n) || 1;
    this.isReversed = this.angle < this.anglePrevious;
    this.anglePrevious = this.angle;
    this.timestampPrevious = performance.now();
    this.setState();
    const {
      playbackSpeed,
      isReversed,
      secondsPlayed,
      duration,
    } = this;
    this.callbacks.onLoop({
      playbackSpeed,
      isReversed,
      secondsPlayed,
      progress: secondsPlayed / duration,
    });
    this.anglePrevious = this.angle;
    this.rafId = requestAnimationFrame(this.loop);
  }
}
class AudioPlayer {
  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.audioBuffer = null;
    this.audioBufferReversed = null;
    this.audioSource = null;
    this.duration = 0;
    this.speedPrevious = 0;
    this.isReversed = false;
    this.gainNode.connect(this.audioContext.destination);
    this.onended = () => { };
  }
  async getArrayBufferFromUrlWithProgress(url) {
    return await progressRequest.download(url, {
      responseType: "arraybuffer",
    }).then(resp => {
      progressRequest.status = "Loading audio...";
      return resp;
    }, () => { });
  }
  async getArrayBufferFromUrl(url) {
    return await (await fetch(url)).arrayBuffer();
  }
  async getAudioBuffer(url) {
    // const t = await this.getArrayBufferFromUrl(url);
    const t = await this.getArrayBufferFromUrlWithProgress(url);
    return await this.audioContext.decodeAudioData(t);
  }
  async loadTrack(url) {
    this.audioBuffer = await this.getAudioBuffer(url);
    this.audioBufferReversed = this.getReversedAudioBuffer(this.audioBuffer);
    this.duration = this.audioBuffer.duration;
  }
  getReversedAudioBuffer(buf) {
    const revbytes = buf.getChannelData(0).slice().reverse();
    const revbuf = this.audioContext.createBuffer(1, buf.length, buf.sampleRate);
    revbuf.getChannelData(0).set(revbytes);
    return revbuf;
  }
  changeDirection(isReversed, t) {
    this.isReversed = isReversed;
    this.play(t);
  }
  play(t = 0) {
    this.pause();
    const buf = this.isReversed ? this.audioBufferReversed : this.audioBuffer;
    const dur = this.isReversed ? this.duration - t : t;
    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = buf;
    this.audioSource.loop = false;
    this.audioSource.addEventListener("ended", this.onended);
    this.audioSource.connect(this.gainNode);
    this.audioSource.start(0, dur);
  }
  onEnded(callback) {
    this.onended = callback;
  }
  updateSpeed(playbackSpeed, isReversed, secondsPlayed) {
    if (!this.audioSource) return;
    if (isReversed !== this.isReversed) {
      this.changeDirection(isReversed, secondsPlayed);
    }
    const { currentTime } = this.audioContext;
    this.audioSource.playbackRate.cancelScheduledValues(currentTime);
    this.audioSource.playbackRate.linearRampToValueAtTime(
      Math.max(0.001, Math.abs(playbackSpeed)),
      currentTime,
    );
  }
  toggleMute(e) {
    this.gainNode.gain.value = e ? 0 : 1;
  }
  pause() {
    this.audioSource && this.audioSource.stop();
  }
}
class Controller {
  constructor({ toggleButton: e, rewindButton: t }) {
    this.toggleButton = e;
    this.rewindButton = t;
    this.isPlaying = false;
    this.toggleButton.addEventListener("click", (s) => this.toggle(s));
    this.rewindButton.addEventListener("click", (s) => this.rewind(s));
    document.body.addEventListener("keydown", (s) => this.onKeyDown(s));
    document.body.addEventListener("keyup", (s) => this.onKeyUp(s));
    this.callbacks = {
      onIsPlayingChanged: () => { },
      onRewind: () => { },
      onToggleMuted: () => { },
    };
  }
  set label(e) {
    this.toggleButton.textContent = e;
  }
  set isDisabled(e) {
    this.toggleButton.disabled = e;
  }
  onKeyDown({ key, repeat }) {
    repeat || key !== "m" || this.callbacks.onToggleMuted(true);
  }
  onKeyUp({ key }) {
    key === "m" && this.callbacks.onToggleMuted(false);
  }
  toggle() {
    this.isPlaying = !this.isPlaying;
    // this.toggleButton.classList.toggle("is-active", this.isPlaying);
    this.callbacks.onIsPlayingChanged(this.isPlaying);
  }
  rewind() {
    this.callbacks.onRewind();
  }
  stop() {
    if (this.isPlaying)
      this.toggle();
  }
}

class ProgressRequest {
  constructor({ progressBar, statusText }) {
    this.progressBar = progressBar;
    this.statusText = statusText;
    this.busy = false;
  }

  get running() {
    return this.busy;
  }

  upload(url, form) {
    if (this.running)
      throw new Error("upload: ProgressRequest is busy.");
    this.ot = new Date().getTime();
    this.oloaded = 0;

    this.start();
    return makeRequest({ method: "POST", url, form, uploadonprogress: this.onprogress.bind(this) })
      .then(resp => {
        this.finish();
        return resp;
      })
      .catch(({ status, statusText }) => {
        this.finish();
        if (status == 413) {
          // Browsers doesn't take this branch, so the only clue users have is in the console.
          this.status = "Upload file(s) too large!";
        } else {
          this.status = "Upload failed... Try using a smaller file?";
        }
        throw new Error({ status, statusText }); // Throw again to prevent later `then()` resolvers from triggering.
      });
  }

  download(url, { responseType }) {
    if (this.running)
      throw new Error("download: ProgressRequest is busy.");

    this.start();
    return makeRequest({ method: "GET", url, onprogress: this.onprogress.bind(this), responseType })
      .then(resp => {
        this.finish();
        return resp;
      })
      .catch(({ status, statusText }) => {
        this.finish();
        this.status = "Audio download failed.";
        throw new Error({ status, statusText });
      });
  }

  onprogress(evt) {
    if (!evt.lengthComputable) {
      return;
    }

    this.updateBar(Math.round(evt.loaded / evt.total * 100) + "%");

    // var nt = new Date().getTime();
    // var pertime = (nt - this.ot) / 1000;
    // this.ot = new Date().getTime();
    // var perload = evt.loaded - this.oloaded;
    // this.oloaded = evt.loaded;
    // var speed = perload / pertime;
    // var bspeed = speed;
    // var units = 'b/s';
    // if (speed / 1024 > 1) {
    //   speed = speed / 1024;
    //   units = 'k/s';
    // }
    // if (speed / 1024 > 1) {
    //   speed = speed / 1024;
    //   units = 'M/s';
    // }
    // speed = speed.toFixed(1);
    // var resttime = ((evt.total - evt.loaded) / bspeed).toFixed(1);
    // if (bspeed == 0) {
    //   this.status = 'Request stalled.';
    //   this.finish();
    // } else {
    //   this.status = 'Speed: ' + speed + units + ', Remaining Time: ' + resttime + 's';
    // }
  }

  cancel() {
    this.xhr.abort();
    this.finish();
  }

  set status(text) {
    this.statusText.innerText = text;
  }

  get status() {
    return this.statusText.innerText;
  }

  start() {
    this.showBar();
    this.busy = true;
  }

  finish() {
    this.hideBar();
    this.busy = false;
  }

  hideBar() {
    this.progressBar.style.opacity = 0.0;
    this.progressBar.style.setProperty("--progress", "0%");
  }

  showBar() {
    this.progressBar.style.opacity = 1.0;
    this.progressBar.style.setProperty("--progress", "0%");
  }

  updateBar(perc) {
    this.progressBar.style.setProperty("--progress", perc);
  }
}

var progressRequest;

function init() {
  progressRequest = new ProgressRequest({
    progressBar: document.querySelector("#progressBar"),
    statusText: document.querySelector("#statusText")
  });
  const turntable = document.querySelector(".turntable");
  const disc = new Disc(turntable, [...document.querySelectorAll(".disc")]);
  const player = new AudioPlayer();
  const ctrl = new Controller({
      toggleButton: document.querySelector("#playButton"),
      rewindButton: document.querySelector("#rewind"),
    });

  const audioFile = document.getElementById("audioFile");
  const scoreFile = document.getElementById("scoreFile");
  const uploadButton = document.getElementById("uploadButton");
  const playButton = document.getElementById("playButton");
  const playButtonText = document.getElementById("playButton__text");
  const djcat = document.getElementById("djcat");

  const audioLabel = document.getElementById("disc__label__audio");
  const scoreLabel = document.getElementById("disc__label__score");

  var hasAudioFile = false, hasScoreFile = false;

  // player.onEnded(() => { // Reverse doesn't work with this.
  //   ctrl.stop();
  // });

  disc.duration = player.duration;
  disc.callbacks.onDragEnded = () => {
    ctrl.isPlaying && player.play(disc.secondsPlayed);
  };
  disc.callbacks.onStop = () => player.pause();
  disc.callbacks.onLoop = ({
    playbackSpeed,
    isReversed,
    secondsPlayed,
    progress,
  }) => {
    if (progress > 0.9999) {
      ctrl.stop();
      ctrl.rewind();
    }
    player.updateSpeed(playbackSpeed, isReversed, secondsPlayed);
  };

  ctrl.callbacks.onIsPlayingChanged = (playing) => {
    if (playing) {
      disc.powerOn();
      player.play(disc.secondsPlayed);
      playButtonText.innerText = "Stop";
      favicon.change("static/assets/ablobcatdj.webp");
      djcat.classList.add("active");
    } else {
      disc.powerOff();
      playButtonText.innerText = "Play";
      favicon.change("static/assets/ablobcatdjslow.webp");
      djcat.classList.remove("active");
    }
  };
  ctrl.callbacks.onRewind = () => {
    disc.rewind();
  };
  ctrl.callbacks.onToggleMuted = (i) => {
    player.toggleMute(i);
  };

  async function loadAudio(path) {
    await player.loadTrack(path);
    disc.duration = player.duration;
  }

  audioLabel.addEventListener("click", function () {
    audioFile.click();
  });

  scoreLabel.addEventListener("click", function () {
    scoreFile.click();
  });

  function showButtons() {
    if (hasAudioFile && hasScoreFile) {
      uploadButton.removeAttribute("hide");
      playButton.removeAttribute("hide");
      document.querySelector("body").setAttribute("dark", "");

      audioLabel.removeAttribute("active");
      scoreLabel.removeAttribute("active");

      const fbs = document.querySelectorAll(".disc__label__fb");
      fbs.forEach(e => e.setAttribute("active", ""));
    }
  }

  function enableUploadButton() {
    uploadButton.disabled = false;
  }

  function disableUploadButton() {
    uploadButton.disabled = true;
  }

  function enablePlayButton() {
    playButton.disabled = false;
  }

  function disablePlayButton() {
    playButton.disabled = true;
  }

  audioFile.addEventListener("change", function () {
    const bg = document.getElementById("disc__background__audio");
    bg.setAttribute("active", "");
    hasAudioFile = true;
    showButtons();
  });
  scoreFile.addEventListener("change", function () {
    const bg = document.getElementById("disc__background__score");
    bg.setAttribute("active", "");
    hasScoreFile = true;
    showButtons();
  });


  uploadButton.addEventListener("click", function () {
    disableUploadButton();
    disablePlayButton();

    // Stop the music!
    ctrl.stop();
    playButtonText.innerText = "Play";
    progressRequest.status = "Uploading...";

    var form = new FormData(); // FormData object
    form.append("audio", document.getElementById("audioFile").files[0]);
    form.append("score", document.getElementById("scoreFile").files[0]);
    progressRequest.upload("/upload", form).then(resp => {
      progressRequest.status = "Files uploaded!";

      const key = resp;
      // fetchAndUpdateStatus(key);
      progressRequest.status = "...";

      const interval = setInterval(function () {
        fetchAndUpdateStatus(key, interval);
      }, 5000);
    }, () => {
      enableUploadButton();
    });
  });

  function fetchAndUpdateStatus(key, interval) {
    if (!key)
      return;

    fetch("/status?id=" + key).then(async (r) => {
      const status = await r.text();
      if (status === "Done") {
        clearInterval(interval);

        await loadAudio("/audio?id=" + key);
        progressRequest.status = "Audio loaded!";
        disc.rewind();

        enableUploadButton();
        enablePlayButton();

      } else if (status.startsWith("Fail")) {
        progressRequest.status = status;
        clearInterval(interval);

        enableUploadButton();

      } else if (status === "None") {
        progressRequest.status = "Bad Request (maybe?)";
        // progressRequest.status = "Bad Request";
        //   clearInterval(interval);

        //   enableUploadButton();

      } else {
        if (progressRequest.status.startsWith(status)) {
          progressRequest.status += "."; // Append a '.'.
        } else {
          progressRequest.status = status + "...";
        }
      }
    }).catch(err => console.log(err));
  }
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', function () {
    init();
  });
}

