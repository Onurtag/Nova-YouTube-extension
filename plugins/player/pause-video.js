_plugins.push({
   name: 'Auto pause video',
   id: 'stop-autoplay',
   section: 'player',
   depends_page: 'watch, embed',
   // sandbox: false,
   desc: 'Pause video autoplay',
   // version: '0.1',
   _runtime: function (user_settings) {

      PolymerYoutube.waitFor('#movie_player', function (playerId) {
         playerId.addEventListener("onStateChange", _onStateChange.bind(this));

         function _onStateChange(state) {
            // console.log('state', state);
            // 1- unstarted
            // 0- ended
            // 1- playing
            // 2- paused
            // 3- buffering
            // 5- video cued
            if (state === 1 || state === 3) 
               playerId.pauseVideo();
         }

      })

   },
});
