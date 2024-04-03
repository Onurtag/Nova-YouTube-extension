// for test:
// https://www.youtube.com/watch?v=Cm9YQVPNdB8 - 1:45
// https://www.youtube.com/watch?v=9xp1XWmJ_Wo - 1:00

window.nova_plugins.push({
   id: 'auto-buffer',
   title: 'Video preloading/buffering',
   // 'title:zh': '',
   // 'title:ja': '',
   // 'title:ko': '',
   // 'title:vi': '',
   // 'title:id': '',
   // 'title:es': '',
   // 'title:pt': '',
   // 'title:fr': '',
   // 'title:it': '',
   // 'title:tr': '',
   // 'title:de': '',
   // 'title:pl': '',
   // 'title:ua': '',
   run_on_pages: 'watch, embed',
   section: 'player',
   desc: 'Working while video is paused',
   // 'desc:zh': '',
   // 'desc:ja': '',
   // 'desc:ko': '',
   // 'desc:vi': '',
   // 'desc:id': '',
   // 'desc:es': '',
   // 'desc:pt': '',
   // 'desc:fr': '',
   // 'desc:it': '',
   // 'desc:tr': '',
   // 'desc:de': '',
   // 'desc:pl': '',
   // 'desc:ua': '',
   _runtime: user_settings => {

      const maxBufferSec = (+user_settings.auto_buffer_sec || 60); // 60sec

      const SELECTOR_CLASS_NAME = 'buffered';

      NOVA.css.push(
         `.${SELECTOR_CLASS_NAME} .ytp-swatch-background-color {
            background-color: ${user_settings.auto_buffer_color || '#ffa000'} !important;
         }`);

      let stopPreload = true;
      let saveCurrentTime = false;

      NOVA.waitSelector('#movie_player video')
         .then(video => {
            let isLive;

            // reset saveCurrentTime
            video.addEventListener('loadeddata', () => {
               saveCurrentTime = false;
               isLive = movie_player.getVideoData().isLive;
            });

            video.addEventListener('playing', function () {
               if (!this.paused && saveCurrentTime !== false) {
                  // console.debug('play', saveCurrentTime);
                  // console.debug('restore currentTime', saveCurrentTime);
                  this.currentTime = saveCurrentTime;
                  saveCurrentTime = false;
                  movie_player.classList.remove(SELECTOR_CLASS_NAME);
               }
            });

            // seek by hotkey
            // document.addEventListener('keyup', evt => {
            document.addEventListener('keydown', evt => {
               if (!video.paused || !saveCurrentTime) return;

               if (NOVA.currentPage != 'watch' && NOVA.currentPage != 'embed') return;

               // movie_player.contains(document.activeElement) // don't use! stay overline
               if (['input', 'textarea', 'select'].includes(evt.target.localName) || evt.target.isContentEditable) return;
               // if (evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;

               if (evt.code == 'ArrowLeft' || evt.code == 'ArrowRight') reSaveTime();
            });

            // seek by mouse
            document.addEventListener('click', evt => {
               if (evt.isTrusted
                  && video.paused && saveCurrentTime
                  && evt.target.closest('.ytp-progress-bar')
               ) {
                  reSaveTime();
               }
            });

            function reSaveTime() {
               movie_player.classList.add(SELECTOR_CLASS_NAME);
               // if (video.paused && saveCurrentTime) {
               saveCurrentTime = video.currentTime;
               // }
            }

            // video.addEventListener('seeked', function () {
            //    if (this.paused
            //       && saveCurrentTime
            //       // && (this.currentTime > (saveCurrentTime + maxBufferSec))
            //       // && (this.currentTime < saveCurrentTime)
            //    ) {
            //       movie_player.classList.add(SELECTOR_CLASS_NAME);
            //       // console.debug('seeking');
            //       // saveCurrentTime = false;
            //    }
            // });

            // prevent update progressbar
            // video.addEventListener('timeupdate', function (evt) {
            //    console.debug('timeupdate', this.paused, saveCurrentTime);
            //    // save
            //    if (saveCurrentTime !== false) {
            //       if (el = document.body.querySelector('.ytp-chrome-bottom .ytp-swatch-background-color')) {
            //          // el.classList.add('a332');
            //          // restore
            //          // Object.assign(el.style, {
            //          //    position: 'absolute',
            //          //    left: 0,
            //          //    bottom: 0,
            //          //    width: '100%',
            //          //    height: '100%',
            //          //    'transform-origin': '0 0',
            //          //    'z-index': 34,
            //          // });
            //          el.classList.remove('ytp-play-progress');
            //          console.debug('saveCurrentTime / this.duration', saveCurrentTime / this.duration);
            //          // el.style.transform = `scaleX(${saveCurrentTime / this.duration})`;
            //       }
            //    }
            //    // restore
            //    else if (this.paused
            //       && saveCurrentTime === false
            //       // && document.body.querySelector('.ytp-play-progress').classList.contains('a332')
            //    ) {
            //       document.body.querySelector('.ytp-chrome-bottom .ytp-swatch-background-color[style]').classList.add('ytp-play-progress');
            //    }
            // });

            video.addEventListener('pause', recordBuffer.bind(video));
            video.addEventListener('progress', recordBuffer.bind(video));

            // autoBuffer
            function recordBuffer() {
               if (!this.paused || !this.buffered?.length) return; // not start buffered yet

               if (stopPreload) return;

               // Strategy 1
               // for (let i = 0; i < this.buffered.length; i++) {
               //    if (this.currentTime > this.buffered.start(i)) {
               //       bufferedEnd = this.buffered.start(i);
               //       bufferedSeconds = this.currentTime - bufferedEnd;
               //       break;
               //    }
               // }
               // Strategy 2
               const bufferedSeconds = this.buffered.end(this.buffered.length - 1);
               // const duration = player.getDuration();
               // movie_player.getVideoLoadedFraction() === (movie_player.getVideoBytesLoaded() / movie_player.getVideoBytesTotal());

               // save saveCurrentTime
               if (saveCurrentTime === false) {
                  movie_player.classList.add(SELECTOR_CLASS_NAME);
                  // movie_player.seekTo(bufferedSeconds);
                  // movie_player.pauseVideo();
                  // saveCurrentTime = movie_player.getCurrentTime();
                  saveCurrentTime = this.currentTime;
                  // console.debug('recordBuffer:', saveCurrentTime);
               }

               // buffered done
               if (saveCurrentTime && ((bufferedSeconds - saveCurrentTime) > maxBufferSec)) {
                  this.currentTime = saveCurrentTime;
                  movie_player.classList.remove(SELECTOR_CLASS_NAME);
                  return;
               }

               // duration aviable. Check max
               if (!isLive || !isNaN(this.duration)) {
                  // const bufferedPercent = movie_player.getDuration() * movie_player.getVideoLoadedFraction();
                  const bufferedPercent = bufferedSeconds / this.duration;
                  // percent = Math.min(1, Math.max(0, bufferedPercent) * 100;

                  // stop hit 90%
                  if (bufferedPercent > .9) {
                     movie_player.classList.remove(SELECTOR_CLASS_NAME); return;
                  }
               }

               this.currentTime = bufferedSeconds;
               // movie_player.seekTo(movie_player.getVideoLoadedFraction());

               // currentTime = this.currentTime;
               // bufferEl.style.transform = `scaleX(${this.buffered.end(i) / this.duration})`;
               // bufferEl.style.transform = `scaleX(${movie_player.getVideoLoadedFraction()})`;
               // }
            }
         });

      // insert button
      NOVA.waitSelector('#movie_player .ytp-left-controls .ytp-play-button')
         .then(container => {
            const
               SELECTOR_CLASS = 'nova-right-custom-button', // same class in "player-buttons-custom" plugin
               btn = document.createElement('button');

            btn.className = `ytp-button ${SELECTOR_CLASS}`;
            // btn.style.opacity = .5;
            // btn.style.minWidth = getComputedStyle(container).width || '48px'; // fix if has chapters
            // el.style.cssText = '';
            Object.assign(btn.style, {
               padding: '0 12px',
               opacity: .5,
               'min-width': getComputedStyle(container).width || '48px', // fix if has chapters
            });
            btn.title = 'Preload video';
            // btnPopup.setAttribute('aria-label','');
            btn.innerHTML =
               `<svg viewBox="0 0 465 465" height="100%" width="100%">
                  <g fill="currentColor">
                  <path d="M279.591,423.714c-3.836,0.956-7.747,1.805-11.629,2.52c-10.148,1.887-16.857,11.647-14.98,21.804 c0.927,4.997,3.765,9.159,7.618,11.876c3.971,2.795,9.025,4.057,14.175,3.099c4.623-0.858,9.282-1.867,13.854-3.008 c10.021-2.494,16.126-12.646,13.626-22.662C299.761,427.318,289.618,421.218,279.591,423.714z"/>
                  <path d="M417.887,173.047c1.31,3.948,3.811,7.171,6.97,9.398c4.684,3.299,10.813,4.409,16.662,2.475 c9.806-3.256,15.119-13.83,11.875-23.631c-1.478-4.468-3.118-8.95-4.865-13.314c-3.836-9.59-14.714-14.259-24.309-10.423 c-9.585,3.834-14.256,14.715-10.417,24.308C415.271,165.528,416.646,169.293,417.887,173.047z"/>
                  <path d="M340.36,397.013c-3.299,2.178-6.704,4.286-10.134,6.261c-8.949,5.162-12.014,16.601-6.854,25.546 c1.401,2.433,3.267,4.422,5.416,5.942c5.769,4.059,13.604,4.667,20.127,0.909c4.078-2.352,8.133-4.854,12.062-7.452 c8.614-5.691,10.985-17.294,5.291-25.912C360.575,393.686,348.977,391.318,340.36,397.013z"/>
                  <path d="M465.022,225.279c-0.407-10.322-9.101-18.356-19.426-17.953c-10.312,0.407-18.352,9.104-17.947,19.422 c0.155,3.945,0.195,7.949,0.104,11.89c-0.145,6.473,3.021,12.243,7.941,15.711c2.931,2.064,6.488,3.313,10.345,3.401 c10.322,0.229,18.876-7.958,19.105-18.285C465.247,234.756,465.208,229.985,465.022,225.279z"/>
                  <path d="M414.835,347.816c-8.277-6.21-19.987-4.524-26.186,3.738c-2.374,3.164-4.874,6.289-7.434,9.298 c-6.69,7.86-5.745,19.666,2.115,26.361c0.448,0.38,0.901,0.729,1.371,1.057c7.814,5.509,18.674,4.243,24.992-3.171 c3.057-3.59,6.037-7.323,8.874-11.102C424.767,365.735,423.089,354.017,414.835,347.816z"/>
                  <path d="M442.325,280.213c-9.855-3.09-20.35,2.396-23.438,12.251c-1.182,3.765-2.492,7.548-3.906,11.253 c-3.105,8.156-0.13,17.13,6.69,21.939c1.251,0.879,2.629,1.624,4.126,2.19c9.649,3.682,20.454-1.159,24.132-10.812 c1.679-4.405,3.237-8.906,4.646-13.382C457.66,293.795,452.178,283.303,442.325,280.213z"/>
                  <path d="M197.999,426.402c-16.72-3.002-32.759-8.114-47.968-15.244c-0.18-0.094-0.341-0.201-0.53-0.287 c-3.584-1.687-7.162-3.494-10.63-5.382c-0.012-0.014-0.034-0.023-0.053-0.031c-6.363-3.504-12.573-7.381-18.606-11.628 C32.24,331.86,11.088,209.872,73.062,121.901c13.476-19.122,29.784-35.075,47.965-47.719c0.224-0.156,0.448-0.311,0.67-0.468 c64.067-44.144,151.06-47.119,219.089-1.757l-14.611,21.111c-4.062,5.876-1.563,10.158,5.548,9.518l63.467-5.682 c7.12-0.64,11.378-6.799,9.463-13.675L387.61,21.823c-1.908-6.884-6.793-7.708-10.859-1.833l-14.645,21.161 C312.182,7.638,252.303-5.141,192.87,5.165c-5.986,1.036-11.888,2.304-17.709,3.78c-0.045,0.008-0.081,0.013-0.117,0.021 c-0.225,0.055-0.453,0.128-0.672,0.189C123.122,22.316,78.407,52.207,46.5,94.855c-0.269,0.319-0.546,0.631-0.8,0.978 c-1.061,1.429-2.114,2.891-3.145,4.353c-1.686,2.396-3.348,4.852-4.938,7.308c-0.199,0.296-0.351,0.597-0.525,0.896 C10.762,149.191-1.938,196.361,0.24,244.383c0.005,0.158-0.004,0.317,0,0.479c0.211,4.691,0.583,9.447,1.088,14.129 c0.027,0.302,0.094,0.588,0.145,0.89c0.522,4.708,1.177,9.427,1.998,14.145c8.344,48.138,31.052,91.455,65.079,125.16 c0.079,0.079,0.161,0.165,0.241,0.247c0.028,0.031,0.059,0.047,0.086,0.076c9.142,9.017,19.086,17.357,29.793,24.898 c28.02,19.744,59.221,32.795,92.729,38.808c10.167,1.827,19.879-4.941,21.703-15.103 C214.925,437.943,208.163,428.223,197.999,426.402z"/>
                  <path d="M221.124,83.198c-8.363,0-15.137,6.78-15.137,15.131v150.747l137.87,71.271c2.219,1.149,4.595,1.69,6.933,1.69 c5.476,0,10.765-2.982,13.454-8.185c3.835-7.426,0.933-16.549-6.493-20.384l-121.507-62.818V98.329 C236.243,89.978,229.477,83.198,221.124,83.198z"/>
                  </g>
               </svg>`;
            // `<svg viewBox="0 0 256 256" height="100%" width="100%">
            //    <g fill="currentColor">
            //       <path d="M128,10C62.8,10,10,62.8,10,128c0,65.2,52.8,118,118,118c65.2,0,118-52.8,118-118C246,62.8,193.2,10,128,10z M128,223.2c-52.5,0-95.2-42.7-95.2-95.2c0-52.5,42.7-95.2,95.2-95.2c52.5,0,95.2,42.7,95.2,95.2C223.2,180.5,180.5,223.2,128,223.2z" style="stroke-dasharray: 1340, 1340; stroke-dashoffset: 0;" />
            //       <path d="M50.1,118.5h26.6v19H50.1V118.5z M97.8,206.7l-6.6-3.8l10.1-17.4l6.6,3.8L97.8,206.7z M64.1,175.8l-3.8-6.6l17.5-10.1l3.8,6.6L64.1,175.8z M77.7,96.9L60.3,86.8l3.8-6.6l17.5,10.1L77.7,96.9z M101.4,70.6L91.3,53.2l6.6-3.8l10.1,17.4L101.4,70.6z M180.7,118c-0.8,2.4-1.2,6-1.2,11c0,4.7,0.4,8.3,1.2,10.8c0.8,2.5,2.4,3.8,4.8,3.8c2.4,0,4-1.3,4.7-3.8s1.1-6.1,1.1-10.8c0-4.9-0.4-8.6-1.1-11c-0.7-2.4-2.3-3.6-4.7-3.6C183,114.5,181.4,115.6,180.7,118z" style="stroke-dasharray: 384, 384; stroke-dashoffset: 0;" />
            //       <path d="M126.4,42.6V128v85.4c47.2,0,85.4-38.2,85.4-85.4C211.7,80.8,173.5,42.6,126.4,42.6z M163.5,146.2c-2.4,2.6-6,4-10.7,4c-5.8,0-9.8-1.9-12.1-5.7c-0.7-1.2-1.2-2.6-1.5-4.2c-0.4-2.1,1.3-3.8,3.4-3.8h0.3c2.1,0,3.8,0.9,4,2.1c0.1,0.7,0.3,1.4,0.6,2c1,2,2.8,3,5.3,3c1.6,0,3-0.6,4.1-1.6c1.2-1.1,1.8-2.6,1.8-4.7c0-2.7-1.1-4.5-3.3-5.4c-0.7-0.3-1.7-0.5-2.9-0.6c-1.6-0.2-3-1.4-3-3c0-1.6,1.3-2.9,2.8-3c1.2-0.1,2.1-0.3,2.7-0.6c1.8-0.8,2.7-2.4,2.7-4.8c0-1.6-0.5-2.8-1.4-3.8c-0.9-1-2.2-1.5-3.9-1.5c-1.9,0-3.3,0.6-4.2,1.8c-0.5,0.7-0.8,1.4-1,2.3c-0.3,1.4-1.9,2.5-4,2.5c-2.1,0-3.7-1.3-3.5-2.9c0.2-1,0.4-1.9,0.7-2.9c0.7-1.6,1.7-3.1,3.1-4.5c1.1-1,2.3-1.7,3.8-2.2c1.5-0.5,3.2-0.8,5.3-0.8c3.9,0,7.1,1,9.5,3c2.4,2,3.6,4.7,3.6,8.2c0,2.4-0.7,4.5-2.1,6.1c-0.4,0.5-0.8,0.9-1.3,1.2c-0.8,0.6-0.7,1,0.2,1.6c0.4,0.3,0.9,0.7,1.4,1.2c2,1.9,3.1,4.5,3.1,7.8C167.1,140.5,165.9,143.6,163.5,146.2z M196.4,113.3c2.1,3.7,3.2,8.9,3.2,15.7c0,6.8-1,12-3.2,15.7c-2.1,3.7-5.8,5.5-11,5.5c-5.2,0-8.9-1.8-11-5.5c-2.1-3.7-3.2-8.9-3.2-15.7c0-6.8,1-12,3.2-15.7c2.1-3.7,5.8-5.5,11-5.5C190.6,107.8,194.3,109.6,196.4,113.3z" style="stroke-dasharray: 738, 738; stroke-dashoffset: 0; "/>
            //    </g>
            // </svg>`;
            // `<svg viewBox="0 0 485 485" height="100%" width="100%">
            //    <g fill="currentColor">
            //       <path d="M311.409,251.414c5.32-1.537,17.778-5.145,23.569-22.177l11.931-35.086l4.799,1.63c2.197,0.748,4.605-0.438,5.353-2.635 l6.401-18.824c0.748-2.197-0.438-4.604-2.637-5.351l-154.671-52.592c-2.196-0.747-4.606,0.44-5.353,2.636l-6.401,18.823 c-0.746,2.196,0.441,4.604,2.636,5.352l4.799,1.632l-12.145,35.725c-5.735,16.865-1.941,22.56,5.255,31.179l31.299,37.48 l-3.489,10.26c-11.976,2.599-43.272,9.418-47.485,10.635c-5.319,1.539-17.78,5.143-23.572,22.177l-10.271,30.21l-4.8-1.631 c-2.195-0.747-4.606,0.438-5.354,2.635l-6.398,18.823c-0.748,2.197,0.439,4.604,2.636,5.353l154.672,52.593 c2.194,0.746,4.604-0.44,5.352-2.638l6.397-18.82c0.749-2.197-0.437-4.606-2.636-5.354l-4.797-1.632l10.486-30.849 c5.735-16.863,1.944-22.561-5.254-31.176l-31.297-37.481l3.486-10.26C275.897,259.453,307.193,252.635,311.409,251.414z M246.043,278.771l34.035,40.753c2.611,3.127,3.994,4.834,4.369,6.397c0.451,1.877-0.152,5.201-1.838,10.156l-10.488,30.851 l-116.316-39.55l10.269-30.209c3.243-9.535,9.122-11.237,13.413-12.479c3.356-0.97,32.146-7.282,50.679-11.291 c2.604-0.563,4.725-2.454,5.583-4.978l6.245-18.365c0.851-2.508,0.337-5.277-1.36-7.31l-33.932-40.631l-0.103-0.125 c-2.612-3.127-3.995-4.834-4.369-6.398c-0.45-1.877,0.15-5.198,1.837-10.156l12.146-35.725l116.319,39.55L320.6,224.348 c-3.241,9.537-9.118,11.237-13.41,12.479c-3.354,0.971-32.145,7.285-50.676,11.291c-2.605,0.564-4.728,2.453-5.587,4.979 l-6.243,18.363C243.831,273.969,244.348,276.736,246.043,278.771z"/>
            //       <path d="M337.935,423.581c-3.395,1.924-6.896,3.766-10.399,5.474c-0.567,0.277-1.114,0.58-1.643,0.907 c-0.562,0.195-1.121,0.422-1.676,0.68c-15.206,7.09-31.062,12.082-47.396,14.977c-0.209,0.03-0.418,0.042-0.629,0.08 c-3.851,0.681-7.77,1.248-11.646,1.692c-0.042,0.007-0.085,0.017-0.127,0.022c-7.118,0.785-14.316,1.186-21.589,1.186 c-83.862,0-155.381-53.81-181.88-128.71c-0.399-1.143-0.801-2.283-1.18-3.428c-6.352-19.101-9.802-39.515-9.802-60.722 c0-21.251,3.465-41.71,9.844-60.846c0.139-0.418,0.273-0.833,0.414-1.252c0.381-1.114,0.775-2.224,1.177-3.331 c0.187-0.52,0.376-1.037,0.568-1.553c22.02-59.268,72.388-104.863,134.541-120.242c0.039-0.009,0.079-0.012,0.118-0.021 c0.919-0.228,1.845-0.45,2.772-0.664c0.104-0.023,0.204-0.061,0.304-0.086c13.559-3.108,27.658-4.779,42.126-4.853l0.167,19.829 c0.051,6.156,3.938,7.934,8.632,3.955l41.886-35.504c4.693-3.979,4.643-10.43-0.123-14.33L249.92,2.045 c-4.762-3.899-8.616-2.056-8.564,4.099l0.167,19.79c-60.9,0.337-118.103,24.199-161.204,67.298 c-4.246,4.246-8.298,8.632-12.165,13.141c-0.023,0.026-0.047,0.047-0.071,0.075c-0.143,0.166-0.278,0.339-0.419,0.505 c-33.925,39.809-53.051,89.425-54.552,142.061c-0.037,0.409-0.081,0.815-0.091,1.233c-0.041,1.756-0.062,3.541-0.062,5.306 c0,2.894,0.059,5.827,0.168,8.72c0.012,0.339,0.056,0.67,0.089,1.003c1.944,47.958,18.527,93.3,47.621,130.856 c0.099,0.129,0.178,0.267,0.278,0.396c2.842,3.668,5.847,7.302,8.92,10.798c0.198,0.225,0.415,0.42,0.619,0.634 c3.111,3.508,6.323,6.944,9.666,10.286c34.123,34.124,77.088,56.187,123.726,64.068c0.142,0.026,0.285,0.054,0.427,0.08 c0.106,0.016,0.211,0.023,0.315,0.039c12.455,2.062,25.167,3.129,38.042,3.129c33.881,0,66.517-7.209,97.004-21.42 c0.657-0.306,1.281-0.657,1.882-1.028c0.683-0.235,1.354-0.514,2.016-0.837c4.183-2.042,8.361-4.236,12.412-6.529 c8.882-5.03,12.008-16.306,6.979-25.188C358.092,421.677,346.815,418.555,337.935,423.581z"/>
            //       <path d="M402.976,148.173c3.567,5.309,9.407,8.174,15.354,8.174c3.544,0,7.13-1.017,10.292-3.143 c8.471-5.693,10.723-17.174,5.03-25.646c-2.599-3.865-5.345-7.698-8.176-11.391c-6.2-8.108-17.798-9.65-25.905-3.45 c-8.106,6.202-9.65,17.802-3.446,25.907C398.496,141.725,400.801,144.938,402.976,148.173z"/>
            //       <path d="M426.446,196.708c1.188,3.711,2.279,7.516,3.247,11.311c2.131,8.36,9.648,13.921,17.896,13.921 c1.509,0,3.047-0.187,4.577-0.577c9.891-2.52,15.866-12.583,13.345-22.472c-1.15-4.513-2.45-9.04-3.866-13.456 c-3.11-9.72-13.514-15.079-23.233-11.965C428.69,176.584,423.333,186.988,426.446,196.708z"/>
            //       <path d="M414.674,380.14c-7.724-6.675-19.391-5.828-26.067,1.892c-2.556,2.956-5.232,5.869-7.958,8.657 c-7.134,7.301-6.998,19.001,0.304,26.136c3.595,3.513,8.257,5.263,12.913,5.263c4.803,0,9.602-1.862,13.221-5.566 c3.246-3.323,6.438-6.792,9.479-10.313C423.239,398.486,422.393,386.815,414.674,380.14z"/>
            //       <path d="M454.675,243.736c-10.219-0.307-18.722,7.719-19.024,17.92c-0.115,3.907-0.356,7.859-0.714,11.745 c-0.933,10.163,6.551,19.16,16.715,20.093c0.574,0.053,1.144,0.078,1.711,0.078c9.44,0,17.503-7.203,18.381-16.792 c0.426-4.639,0.714-9.354,0.852-14.019C472.897,252.562,464.878,244.041,454.675,243.736z"/>
            //       <path d="M446.456,315.401c-9.509-3.723-20.228,0.966-23.949,10.472c-1.423,3.635-2.978,7.28-4.623,10.828 c-4.29,9.26-0.261,20.244,9,24.535c2.517,1.166,5.157,1.717,7.758,1.717c6.978,0,13.654-3.97,16.78-10.716 c1.956-4.224,3.81-8.559,5.503-12.889C460.647,329.845,455.959,319.123,446.456,315.401z"/>
            //       <path d="M383.518,96.938c6.075-8.204,4.35-19.777-3.854-25.851c-3.735-2.767-7.608-5.454-11.51-7.992 c-8.557-5.563-20.004-3.139-25.567,5.418c-5.562,8.556-3.139,20.002,5.416,25.567c3.279,2.13,6.529,4.389,9.668,6.713 c3.306,2.447,7.161,3.629,10.984,3.629C374.311,104.422,379.895,101.833,383.518,96.938z"/>
            //    </g>
            // </svg>`;
            // `<svg viewBox="0 0 512 406.6" height="100%" width="100%"  shape-rendering="geometricPrecision" text-rendering="geometricPrecision"
            // image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd">
            //    <g fill="currentColor">
            //       <path d="M334.1 1.64a202.504 202.504 0 0 1 135.16 77.02c68.84 88.6 52.82 216.19-35.78 285.03-.08.05-.14.11-.22.18-88.57 68.82-216.15 52.81-284.97-35.76-.04-.06-.09-.12-.14-.17A204.822 204.822 0 0 1 125.31 291a168.69 168.69 0 0 0 37.79-5.42 172.61 172.61 0 0 0 13.55 20.29c56.7 72.81 161.67 85.86 234.46 29.15 72.8-56.69 85.84-161.66 29.15-234.46-40.28-51.71-107.08-75.09-170.82-59.79a171.08 171.08 0 0 0-21.88-31.29c2.46-.8 4.95-1.51 7.46-2.21 25.77-7.13 52.69-9.03 79.19-5.63h-.11zM0 129.16v-15.4C3.97 50.8 56.26.95 120.21.92h.05c66.58-.01 120.55 53.93 120.59 120.51.03 66.58-53.93 120.56-120.51 120.59C56.33 242.04 3.97 192.17 0 129.16zm99.37-57.37c-.05-6.21-.64-10.65 7.07-10.54l24.98.3c8.05-.05 10.19 2.51 10.09 10.05v28.8h28.6c6.2-.05 10.65-.62 10.54 7.09l-.31 24.96c.05 8.06-2.5 10.21-10.04 10.11h-28.79v28.77c.1 7.55-2.04 10.11-10.09 10.06l-24.98.3c-7.71.12-7.12-4.33-7.07-10.54v-28.59h-28.8c-7.56.1-10.12-2.05-10.07-10.11l-.28-24.96c-.13-7.71 4.31-7.14 10.52-7.09h28.63V71.79zm198.25 32.72c1.24-9.88 10.24-16.88 20.09-15.64h.04c9.82 1.32 16.73 10.32 15.46 20.13l-11.7 94.09 65.06 50.55c7.85 6.1 9.3 17.4 3.2 25.28a18.011 18.011 0 0 1-11.95 6.82c-4.73.62-9.51-.68-13.26-3.62l-72.82-56.61a17.818 17.818 0 0 1-5.79-7.08 18.336 18.336 0 0 1-1.46-9.67l13.13-104.2v-.05z" />
            //    </g>
            // </svg>`;
            btn.addEventListener('click', toggleLoop);

            container.after(btn);

            // update the next video
            NOVA.waitSelector('#movie_player video')
               .then(video => {
                  video.addEventListener('loadeddata', ({ target }) => {
                     // upd  state
                     stopPreload = movie_player.classList.contains('ad-showing') || !Boolean(user_settings.auto_buffer_default);
                     btn.style.opacity = stopPreload ? .5 : 1;
                  });
               });

            function toggleLoop() {
               stopPreload = !stopPreload;

               btn.style.opacity = stopPreload ? .5 : 1;
               NOVA.showOSD('Preload is ' + Boolean(stopPreload));

               if (stopPreload) {
                  NOVA.videoElement.currentTime = saveCurrentTime;
                  movie_player.classList.remove(SELECTOR_CLASS_NAME);
               }
            }

            // NOVA.runOnPageLoad(async () => {
            //    if (NOVA.currentPage != 'watch') return;
            // });

         });

   },
   options: {
      auto_buffer_sec: {
         _tagName: 'input',
         label: 'Sec',
         // 'label:zh': '',
         // 'label:ja': '',
         // 'label:ko': '',
         // 'label:vi': '',
         // 'label:id': '',
         // 'label:es': '',
         // 'label:pt': '',
         // 'label:fr': '',
         // 'label:it': '',
         // 'label:tr': '',
         // 'label:de': '',
         // 'label:pl': '',
         // 'label:ua': '',
         type: 'number',
         title: 'buffer time',
         // 'title:zh': '',
         // 'title:ja': '',
         // 'title:ko': '',
         // 'title:vi': '',
         // 'title:id': '',
         // 'title:es': '',
         // 'title:pt': '',
         // 'title:fr': '',
         // 'title:it': '',
         // 'title:tr': '',
         // 'title:de': '',
         // 'title:pl': '',
         // 'title:ua': '',
         placeholder: '10-300',
         step: 5,
         min: 30,
         max: 300, // 5min
         value: 60,
      },
      auto_buffer_default: {
         _tagName: 'select',
         label: 'Default state',
         'label:zh': '默认状态',
         'label:ja': 'デフォルト状態',
         // 'label:ko': '기본 상태',
         // 'label:vi': '',
         // 'label:id': 'Status default',
         // 'label:es': 'Estado predeterminado',
         // 'label:pt': 'Estado padrão',
         // 'label:fr': 'État par défaut',
         // 'label:it': 'Stato predefinito',
         // 'label:tr': 'Varsayılan',
         // 'label:de': 'Standardzustand',
         'label:pl': 'Stan domyślny',
         // 'label:ua': 'Cтан за замовчуваням',
         options: [
            {
               label: 'on', value: true, selected: true,
               // 'label:zh': '',
               // 'label:ja': '',
               // 'label:ko': '',
               // 'label:vi': '',
               // 'label:id': '',
               // 'label:es': '',
               // 'label:pt': '',
               // 'label:fr': '',
               // 'label:it': '',
               // 'label:tr': '',
               // 'label:de': '',
               // 'label:pl': '',
               // 'label:ua': 'грати',
            },
            {
               label: 'off', value: false,
               // 'label:zh': '',
               // 'label:ja': '',
               // 'label:ko': '',
               // 'label:vi': '',
               // 'label:id': '',
               // 'label:es': '',
               // 'label:pt': '',
               // 'label:fr': '',
               // 'label:it': '',
               // 'label:tr': '',
               // 'label:de': '',
               // 'label:pl': '',
               // 'label:ua': 'зупинити',
            },
         ],
      },
      auto_buffer_color: {
         _tagName: 'input',
         type: 'color',
         value: '#ffa000',
         label: 'Color',
         'label:zh': '颜色',
         'label:ja': '色',
         // 'label:ko': '색깔',
         // 'label:vi': '',
         // 'label:id': 'Warna',
         // 'label:es': 'Color',
         // 'label:pt': 'Cor',
         // 'label:fr': 'Couleur',
         // 'label:it': 'Colore',
         // 'label:tr': 'Renk',
         // 'label:de': 'Farbe',
         'label:pl': 'Kolor',
         // 'label:ua': 'Колір',
         // title: 'default - #ff0000',
      },
   }
});
