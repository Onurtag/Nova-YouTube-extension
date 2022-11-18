// for test
// the adjustment area depends on the video size. Problems are visible at non-standard aspect ratio

window.nova_plugins.push({
   id: 'volume-wheel',
   title: 'Volume',
   'title:zh': '体积',
   'title:ja': '音量',
   'title:ko': '용량',
   // 'title:id': 'Volume',
   'title:es': 'Volumen',
   // 'title:pt': 'Volume',
   'title:fr': 'Le volume',
   // 'title:it': 'Volume',
   'title:tr': 'Hacim',
   'title:de': 'Volumen',
   'title:pl': 'Głośność',
   'title:ua': 'Гучність',
   run_on_pages: 'watch, embed, -mobile',
   section: 'player',
   // desc: 'Use mouse wheel to change volume of video',
   desc: 'With mouse wheel',
   'desc:zh': '带鼠标滚轮',
   'desc:ja': 'マウスホイール付き',
   'desc:ko': '마우스 휠로',
   'desc:id': 'Dengan roda mouse',
   'desc:es': 'Con rueda de ratón',
   'desc:pt': 'Com roda do mouse',
   'desc:fr': 'Avec molette de la souris',
   'desc:it': 'Con rotellina del mouse',
   'desc:tr': 'Fare tekerleği ile',
   'desc:de': 'Mit mausrad',
   'desc:pl': 'Za pomocą kółka myszy',
   'desc:ua': 'З допомогою колеса мишки',
   _runtime: user_settings => {

      NOVA.waitElement('video')
         .then(video => {
            // trigger default indicator
            video.addEventListener('volumechange', function () {
               // bug? demonstration of different values
               // console.debug('volumechange', movie_player.getVolume(), this.volume);
               NOVA.bezelTrigger(movie_player.getVolume() + '%');
               playerVolume.buildVolumeSlider();

               if (user_settings.volume_mute_unsave) {
                  playerVolume.saveInSession(movie_player.getVolume());
               }
            });

            if (user_settings.volume_hotkey) {
               // mousewheel in player area
               document.body.querySelector('.html5-video-container')
                  .addEventListener('wheel', evt => {
                     evt.preventDefault();

                     if (evt[user_settings.volume_hotkey] || (user_settings.volume_hotkey == 'none' && !evt.ctrlKey && !evt.altKey && !evt.shiftKey)) {
                        // console.debug('hotkey caught');
                        if (step = +user_settings.volume_step * Math.sign(evt.wheelDelta)) {
                           playerVolume.adjust(step);
                        }
                     }
                  });
            }
            // init volume_level_default
            if (+user_settings.volume_level_default) {
               playerVolume.set(+user_settings.volume_level_default);
               // (user_settings.volume_unlimit || +user_settings.volume_level_default > 100)
               //    ? playerVolume.unlimit(+user_settings.volume_level_default)
               //    : playerVolume.set(+user_settings.volume_level_default);
            }
         });


      const playerVolume = {
         adjust(delta) {
            const level = movie_player?.getVolume() + +delta;
            return user_settings.volume_unlimit ? this.unlimit(level) : this.set(level);
         },
         // Strategy 1
         set(level = 50) {
            if (typeof movie_player === 'undefined' || !movie_player.hasOwnProperty('getVolume')) return console.error('Error getVolume');

            const newLevel = Math.max(0, Math.min(100, +level));

            // set new volume level
            if (newLevel !== movie_player.getVolume()) {
               movie_player.isMuted() && movie_player.unMute();
               movie_player.setVolume(newLevel); // 0 - 100

               if (newLevel === movie_player.getVolume()) {
                  this.saveInSession(newLevel);
                  // this.buildVolumeSlider();

               } else {
                  console.error('setVolumeLevel error! Different: %s!=%s', newLevel, movie_player.getVolume());
               }
            }
            return newLevel === movie_player.getVolume() && newLevel;
         },

         saveInSession(level = required()) {
            const storageData = {
               creation: Date.now(),
               data: { 'volume': +level, 'muted': (level ? 'false' : 'true') },
               // data: { 'volume': +level, 'muted': ((level || user_settings.volume_mute_unsave) ? 'false' : 'true') },
            };

            try {
               localStorage['yt-player-volume'] = JSON.stringify(
                  Object.assign({ expiration: Date.now() + 2592e6 }, storageData)
               );
               sessionStorage['yt-player-volume'] = JSON.stringify(storageData);
               // console.debug('volume saved', ...arguments);

            } catch (err) {
               console.warn(`${err.name}: save "volume" in sessionStorage failed. It seems that "Block third-party cookies" is enabled`, err.message);
            }
         },

         unlimit(level = 300) {
            if (level > 100) {
               if (!this.audioCtx) {
                  this.audioCtx = new AudioContext();
                  const source = this.audioCtx.createMediaElementSource(NOVA.videoElement);
                  this.node = this.audioCtx.createGain();
                  this.node.gain.value = 1;
                  source.connect(this.node);
                  this.node.connect(this.audioCtx.destination);
               }

               if (this.node.gain.value < 7) this.node.gain.value += 1; // 7(700%) max

               NOVA.bezelTrigger(movie_player.getVolume() * this.node.gain.value + '%');
               // this.buildVolumeSlider();

            } else {
               if (this.audioCtx && this.node.gain.value !== 1) {
                  this.node.gain.value = 1; // reset
               }

               this.set(level);
            }
            // console.debug('unlimit', this.node.gain.value);
         },

         buildVolumeSlider(timeout_ms = 800) {
            if (volumeArea = movie_player?.querySelector('.ytp-volume-area')) {
               // reset hide
               if (typeof this.showTimeout === 'number') clearTimeout(this.showTimeout);
               // show
               volumeArea.dispatchEvent(new Event('mouseover', { bubbles: true }));
               // hide
               this.showTimeout = setTimeout(() =>
                  volumeArea.dispatchEvent(new Event('mouseout', { bubbles: true }))
                  , timeout_ms); // 800ms

               insertToHTML({
                  'text': Math.round(movie_player.getVolume()),
                  'container': volumeArea,
               });
            }

            function insertToHTML({ text = '', container = required() }) {
               // console.debug('insertToHTML', ...arguments);
               if (!(container instanceof HTMLElement)) return console.error('container not HTMLElement:', container);
               const SELECTOR_ID = 'nova-volume-text';

               (document.getElementById(SELECTOR_ID) || (function () {
                  const SELECTOR = '#' + SELECTOR_ID; // for css

                  NOVA.css.push(`
                     ${SELECTOR} {
                        display: none;
                        text-indent: 2px;
                        font-size: 110%;
                        text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
                        cursor: default;
                     }
                     ${SELECTOR}:after { content: '%'; }

                     .ytp-volume-control-hover:not([aria-valuenow="0"])+${SELECTOR} {
                        display: block;
                     }`)

                  // container.insertAdjacentHTML('beforeend', `<span id="${SELECTOR_ID}">${text}</span>`);
                  // return document.getElementById(SELECTOR_ID);
                  const el = document.createElement('span');
                  el.id = SELECTOR_ID;
                  container.insertAdjacentElement('beforeend', el);
                  return el;
               })())
                  .textContent = text;

               container.title = `${text} %`;
            }
         }
      };

   },
   options: {
      volume_level_default: {
         _tagName: 'input',
         // label: 'Level at startup',
         label: 'Default level',
         'label:zh': '默认音量',
         'label:ja': 'デフォルトのボリューム',
         'label:ko': '기본 볼륨',
         'label:id': 'Tingkat default',
         'label:es': 'Volumen predeterminado',
         'label:pt': 'Volume padrão',
         'label:fr': 'Volume par défaut',
         'label:it': 'Livello predefinito',
         'label:tr': 'Varsayılan ses',
         'label:de': 'Standardlautstärke',
         'label:pl': 'Poziom domyślny',
         'label:ua': 'Базовий рівень',
         type: 'number',
         title: '0 - auto',
         placeholder: '%',
         step: 1,
         min: 0,
         max: 100,
         // max: 600,
         value: 100,
      },
      volume_step: {
         _tagName: 'input',
         label: 'Step',
         'label:zh': '步',
         'label:ja': 'ステップ',
         'label:ko': '단계',
         'label:id': 'Melangkah',
         'label:es': 'Paso',
         'label:pt': 'Degrau',
         'label:fr': 'Étape',
         'label:it': 'Fare un passo',
         'label:tr': 'Adım',
         'label:de': 'Schritt',
         'label:pl': 'Krok',
         'label:ua': 'Крок',
         type: 'number',
         title: 'in %',
         placeholder: '%',
         step: 5,
         min: 5,
         max: 30,
         value: 10,
      },
      volume_hotkey: {
         _tagName: 'select',
         label: 'Hotkey',
         'label:zh': '热键',
         'label:ja': 'ホットキー',
         'label:ko': '단축키',
         'label:id': 'Tombol pintas',
         'label:es': 'Tecla de acceso rápido',
         'label:pt': 'Tecla de atalho',
         'label:fr': 'Raccourci',
         'label:it': 'Tasto di scelta rapida',
         'label:tr': 'Kısayol tuşu',
         'label:de': 'Schnelltaste',
         'label:pl': 'Klawisz skrótu',
         'label:ua': 'Гаряча клавіша',
         options: [
            { label: 'wheel', value: 'none', selected: true },
            { label: 'shift+wheel', value: 'shiftKey' },
            { label: 'ctrl+wheel', value: 'ctrlKey' },
            { label: 'alt+wheel', value: 'altKey' },
            { label: 'disable', value: false },
         ],
      },
      volume_unlimit: {
         _tagName: 'input',
         label: 'Allow above 100%',
         'label:zh': '允许超过 100%',
         'label:ja': '100％以上を許可する',
         'label:ko': '100% 이상 허용',
         'label:id': 'Izinkan di atas 100%',
         'label:es': 'Permitir por encima del 100%',
         'label:pt': 'Permitir acima de 100%',
         'label:fr': 'Autoriser au-dessus de 100 %',
         'label:it': 'Consenti oltre il 100%',
         'label:tr': "%100'ün üzerinde izin ver",
         'label:de': 'Über 100 % zulassen',
         'label:pl': 'Zezwól powyżej 100%',
         'label:ua': 'Дозволити більше 100%',
         type: 'checkbox',
         // title: 'allow set volume above 100%',
         // 'title:zh': '允许设定音量高于 100%',
         // 'title:ja': '100％を超える設定ボリュームを許可する',
         // 'title:ko': '100% 이상의 설정 볼륨 허용',
         // 'title:id': 'izinkan volume yang disetel di atas 100%',
         // 'title:es': 'permitir el volumen establecido por encima del 100%',
         // 'title:pt': 'permitir volume definido acima de 100%',
         // 'title:fr': 'autoriser le réglage du volume au-dessus de 100 %',
         // 'title:it': 'consentire volume impostato superiore al 100%',
         // 'title:tr': "%100'ün üzerinde ses ayarına izin ver",
         // 'title:de': 'eingestellte Lautstärke über 100% zulassen',
         // 'title:pl': 'zezwala ustawić powyżej 100%',
         // 'title:ua': 'Дозволити встановити звук більше 100%',
      },
      volume_mute_unsave: {
         _tagName: 'input',
         // Force unmute for videos opened in new tabs while another video is muted
         label: 'Not keep muted state',
         // label: 'disable mute save state',
         // label: 'disable mute memory state',
         'label:zh': '不保存静音模式',
         'label:ja': 'マナーモードを保存しない',
         'label:ko': '무음 모드를 저장하지 않음',
         'label:id': 'Jangan simpan mode senyap',
         'label:es': 'No guarde el modo silencioso',
         'label:pt': 'Não salve o modo silencioso',
         'label:fr': 'Ne pas enregistrer le mode silencieux',
         'label:it': 'Non salvare la modalità silenziosa',
         'label:tr': 'Ne pas enregistrer le mode silencieux',
         'label:de': 'Silent-Modus nicht speichern',
         'label:pl': 'Nie zachowuj wyciszonego stanu',
         'label:ua': 'Не зберігати беззвучний режим',
         type: 'checkbox',
         title: 'Only affects new tabs',
         'title:zh': '只影响新标签',
         'title:ja': '新しいタブにのみ影響します',
         'title:ko': '새 탭에만 영향',
         'title:id': 'Hanya memengaruhi tab baru',
         'title:es': 'Solo afecta a las pestañas nuevas',
         'title:pt': 'Afeta apenas novas guias',
         'title:fr': "N'affecte que les nouveaux onglets",
         'title:it': 'Riguarda solo le nuove schede',
         'title:tr': 'Yalnızca yeni sekmeleri etkiler',
         'title:de': 'Wirkt sich nur auf neue Registerkarten aus',
         'title:pl': 'Dotyczy tylko nowych kart',
         'title:ua': 'Діє лише на нові вкладки',
      },
   }
});
