# shared by browser and node
di = (typeof window!='undefined') && window.angular || require('pongular').pongular
di.module 'pong-base'

.value 'PBShared', -> 'Something both sides share'

