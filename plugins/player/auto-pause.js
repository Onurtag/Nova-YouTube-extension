window.nova_plugins.push({
   id: 'video-autopause',
   title: 'Video autopause',
   'title:zh': '视频自动暂停',
   'title:ja': 'ビデオの自動一時停止',
   'title:ko': '비디오 자동 일시 중지',
   'title:id': 'Jeda otomatis video',
   'title:es': 'Pausa automática de video',
   // 'title:pt': 'Pausa automática de vídeo',
   // 'title:fr': 'Pause automatique de la vidéo',
   'title:it': 'Pausa automatica del video',
   // 'title:tr': 'Video otomatik duraklatma',
   // 'title:de': 'Automatische Pause des Videos',
   'title:pl': 'Automatyczne zatrzymanie wideo',
   // 'title:ua': 'Автопауза',
   run_on_pages: 'watch, embed',
   // restart_on_location_change: true,
   section: 'player',
   desc: 'Disable autoplay',
   'desc:zh': '禁用自动播放',
   'desc:ja': '自動再生を無効にする',
   'desc:ko': '자동 재생 비활성화',
   'desc:it': 'Nonaktifkan putar otomatis',
   'desc:es': 'Deshabilitar reproducción automática',
   // 'desc:pt': 'Desativar reprodução automática',
   // 'desc:fr': 'Désactiver la lecture automatique',
   'desc:it': 'Disabilita la riproduzione automatica',
   // 'desc:tr': 'Otomatik oynatmayı devre dışı bırak',
   // 'desc:de': 'Deaktiviere Autoplay',
   'desc:pl': 'Wyłącz autoodtwarzanie',
   // 'desc:ua': 'Вимкнути автовідтворення',
   'data-conflict': 'video-autostop',
   _runtime: user_settings => {

      // alt - https://greasyfork.org/en/scripts/370504-youtube-stop-automatic-video-playback

      // better use this flag when launching the chrome/imum:
      //  --autoplay-policy=user-gesture-required

      if (user_settings['video-stop-preload'] && !user_settings.stop_preload_embed) return; // fix conflict with [video-stop-preload] plugin

      // conflict with plugin [user_settings.player_buttons_custom_items?.indexOf('popup')], [embed-redirect-popup]
      if (NOVA.queryURL.has('popup')) return;

      if (user_settings.video_autopause_embed && NOVA.currentPage != 'embed'
         // for video_autopause_comment_link
         && (!user_settings.video_autopause_comment_link
            || (user_settings.video_autopause_comment_link && !NOVA.queryURL.has('lc')) //!location.search.includes('$lc=')
         )
      ) {
         return;
      }

      // skip stoped embed - https://www.youtube.com/embed/668nUCeBHyY?autoplay=1
      if (NOVA.currentPage == 'embed'
         && window.self !== window.top// window.frameElement // is iframe?
         && ['0', 'false'].includes(NOVA.queryURL.get('autoplay'))
      ) {
         return;
      }

      // Solution 1
      NOVA.waitSelector('#movie_player video')
         .then(video => {
            if (!user_settings.video_autostop_comment_link || (user_settings.video_autostop_comment_link && !NOVA.queryURL.has('lc'))) {
               if (user_settings.video_autopause_ignore_live && movie_player.getVideoData().isLive) return;
            }

            pauseVideo.apply(video); // init
            // video.addEventListener('canplay', pauseVideo, { capture: true, once: true }); // update

            // unsuccessful part of the code responsible for the experiment of adding stopPlayer
            // video.addEventListener('loadeddata', pauseVideo); // update
            // document.addEventListener('yt-navigate-start', pauseVideo);
            // document.addEventListener('yt-navigate-finish', () => {
            //    video.addEventListener('canplay', pauseVideo, { capture: true, once: true });
            // });

            NOVA.runOnPageLoad(async () => {
               if (!location.search.includes('list=') && NOVA.currentPage == 'watch') {
                  // video.addEventListener('play', pauseVideo);
                  // video.addEventListener('canplay', pauseVideo, { capture: true, once: true });
                  video.addEventListener('playing', pauseVideo, { capture: true, once: true });
                  // video.addEventListener('timeupdate', pauseVideo, { capture: true, once: true });
               }
            });

            // save backup
            const backupFn = HTMLVideoElement.prototype.play;
            // patch fn
            HTMLVideoElement.prototype.play = pauseVideo;
            // restore fn
            document.addEventListener('keyup', evt => {
               if (NOVA.currentPage != 'watch' && NOVA.currentPage != 'embed') return;

               if (['input', 'textarea', 'select'].includes(evt.target.localName) || evt.target.isContentEditable) return;
               if (evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;

               switch (evt.code) {
                  // Keyboard code - https://docs.microsoft.com/en-us/dotnet/api/android.views.keycode?view=xamarin-android-sdk-12
                  case 'KeyK':
                  case 'Space':
                  case 'MediaPlay':
                  case 'MediaPlayPause':
                     restorePlayFn();
                     break;
               }
            });
            navigator.mediaSession.setActionHandler('play', restorePlayFn); // add Media hotkeys support
            document.addEventListener('click', evt => {
               if (evt.isTrusted
                  // Solution 1. Universal, click is inside the player
                  && evt.target.closest('#movie_player') // movie_player.contains(document.activeElement)
                  // Solution 2. Click from some elements
                  // && ['button[class*="play-button"]',
                  //    '.ytp-cued-thumbnail-overlay-image',
                  //    '.ytp-player-content'
                  // ].some(s => evt.srcElement.matches(s))
               ) {
                  restorePlayFn(true);
               }
            }, { capture: true });

            function pauseVideo() {
               // movie_player.stopVideo(); // unsuccessful part of the code responsible for the experiment of adding stopPlayer
               movie_player.pauseVideo(); // set stop state play-button
               this.paused || this.pause(); // alt just in case
            };

            function restorePlayFn(isClick = false) {
               restorePlayFn = function () { } // no-op function
               HTMLVideoElement.prototype.play = backupFn;
               if (!isClick) movie_player.playVideo(); // dirty fix
               // video.play();
            }
         });

      // Solution 2. Doesn't work (https://github.com/raingart/Nova-YouTube-extension/issues/123)
      // // NOVA.waitSelector('video')
      // NOVA.waitSelector('#movie_player video')
      //    .then(video => {
      //       if (user_settings.video_autopause_ignore_live && movie_player.getVideoData().isLive) return;

      //       forceVideoPause.apply(video);
      //       // video.addEventListener('timeupdate', forceVideoPause.bind(video), { capture: true, once: true });
      //    });

      // function forceVideoPause() {
      //    if (user_settings.video_autopause_ignore_playlist && location.search.includes('list=')) return;
      //    // if (user_settings.video_autopause_ignore_playlist && NOVA.queryURL.has('list')/* || !movie_player?.getPlaylistId()*/) return;

      //    this.pause();

      //    // const forceHoldPause = setInterval(() => this.paused || this.pause(), 200); // 200ms
      //    const forceHoldPause = setInterval(() => {
      //       this.paused || movie_player.pauseVideo();
      //       this.paused || this.pause(); // alt just in case
      //    }, 200); // 200ms
      //    // setTimeout(() => clearInterval(forceHoldPause), 1000); // 1s

      //    document.addEventListener('keyup', evt => {
      //       if (NOVA.currentPage != 'watch' && NOVA.currentPage != 'embed') return;

      //       if (['input', 'textarea', 'select'].includes(evt.target.localName) || evt.target.isContentEditable) return;
      //       if (evt.ctrlKey || evt.altKey || evt.shiftKey || evt.metaKey) return;

      //       switch (evt.code) {
      //          // Keyboard code - https://docs.microsoft.com/en-us/dotnet/api/android.views.keycode?view=xamarin-android-sdk-12
      //          case 'KeyK':
      //          case 'Space':
      //          case 'MediaPlay':
      //          case 'MediaPlayPause':
      //             stopForceHoldPause();
      //             break;
      //       }
      //    });
      //    navigator.mediaSession.setActionHandler('play', stopForceHoldPause); // add Media hotkeys support
      //    document.addEventListener('click', evt => {
      //       if (evt.isTrusted
      //          // Solution 1. Universal, click is inside the player
      //          && evt.target.closest('#movie_player') // movie_player.contains(document.activeElement)
      //          // Solution 2. Click from some elements
      //          // && ['button[class*="play-button"]',
      //          //    '.ytp-cued-thumbnail-overlay-image',
      //          //    '.ytp-player-content'
      //          // ].some(s => evt.srcElement.matches(s))
      //       ) {
      //          stopForceHoldPause();
      //       }
      //    }, { capture: true });

      //    function stopForceHoldPause() {
      //       clearInterval(forceHoldPause);
      //       movie_player.playVideo(); // dirty fix. onStateChange starts before click/keyup
      //    }
      // }

   },
   options: {
      video_autopause_embed: {
         _tagName: 'select',
         label: 'Apply to video type',
         // 'label:zh': '',
         // 'label:ja': '',
         // 'label:ko': '',
         // 'label:id': '',
         // 'label:es': '',
         // 'label:pt': '',
         // 'label:fr': '',
         // 'label:it': '',
         // 'label:tr': '',
         // 'label:de': '',
         // 'label:pl': '',
         // 'label:ua': 'Застосувати до відео',
         options: [
            {
               label: 'all', value: false, selected: true,
               // 'label:zh': '',
               // 'label:ja': '',
               // 'label:ko': '',
               // 'label:id': '',
               // 'label:es': '',
               // 'label:pt': '',
               // 'label:fr': '',
               // 'label:it': '',
               // 'label:tr': '',
               // 'label:de': '',
               // 'label:pl': '',
               // 'label:ua': 'всіх',
            },
            {
               label: 'embed', value: 'on',
               // 'label:zh': '',
               // 'label:ja': '',
               // 'label:ko': '',
               // 'label:id': '',
               // 'label:es': '',
               // 'label:pt': '',
               // 'label:fr': '',
               // 'label:it': '',
               // 'label:tr': '',
               // 'label:de': '',
               // 'label:pl': '',
               // 'label:ua': 'вбудованих',
            },
         ],
      },
      video_autopause_ignore_playlist: {
         _tagName: 'input',
         label: 'Ignore in playlist',
         'label:zh': '忽略播放列表',
         'label:ja': 'プレイリストを無視する',
         'label:ko': '재생목록 무시',
         'label:id': 'Abaikan daftar putar',
         'label:es': 'Ignorar lista de reproducción',
         // 'label:pt': 'Ignorar lista de reprodução',
         // 'label:fr': 'Ignorer la liste de lecture',
         'label:it': 'Ignora playlist',
         // 'label:tr': 'Oynatma listesini yoksay',
         // 'label:de': 'Wiedergabeliste ignorieren',
         'label:pl': 'Zignoruj listę odtwarzania',
         // 'label:ua': 'Ігнорувати список відтворення',
         type: 'checkbox',
         'data-dependent': { 'video_autopause_embed': false },
      },
      video_autopause_ignore_live: {
         _tagName: 'input',
         label: 'Ignore live',
         // 'label:zh': '',
         // 'label:ja': '',
         // 'label:ko': '',
         // 'label:id': '',
         // 'label:es': '',
         // 'label:pt': '',
         // 'label:fr': '',
         // 'label:it': '',
         // 'label:tr': '',
         // 'label:de': '',
         // 'label:pl': '',
         // 'label:ua': 'Ігнорувти живі трансляції',
         type: 'checkbox',
         'data-dependent': { 'video_autopause_embed': false },
      },
      // video_autopause_embed: {
      //    _tagName: 'input',
      //    label: 'Only for embedded videos',
      //    'label:zh': '仅适用于嵌入式视频',
      //    'label:ja': '埋め込みビデオのみ',
      //    'label:ko': '삽입된 동영상에만 해당',
      //    'label:id': 'Hanya untuk video tersemat',
      //    'label:es': 'Solo para videos incrustados',
      //    // 'label:pt': 'Apenas para vídeos incorporados',
      //    // 'label:fr': 'Uniquement pour les vidéos intégrées',
      //    'label:it': 'Solo per i video incorporati',
      //    'label:tr': 'Yalnızca gömülü videolar için',
      //    // 'label:de': 'Nur für eingebettete Videos',
      //    'label:pl': 'Tylko dla osadzonych filmów',
      //    // 'label:ua': 'Тільки для вбудованих відео',
      //    type: 'checkbox',
      // },
      video_autopause_comment_link: {
         _tagName: 'input',
         label: 'Apply if URL has link to comment',
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
         type: 'checkbox',
         title: 'Pause playback if you have opened the url with link to comment',
         // 'title:zh': '',
         // 'title:ja': '',
         // 'title:ko': '',
         // 'label:vi': '',
         // 'label:id': '',
         // 'title:es': '',
         // 'title:pt': '',
         // 'title:fr': '',
         // 'title:it': '',
         // 'title:tr': '',
         // 'title:de': '',
         // 'title:pl': '',
         // 'label:ua': '',
      },
   }
});
