# shared by browser and node
di = if (typeof window!='undefined') then window.angular else require('pongular').pongular
di.module 'app'

.service 'Site', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('site')
]

.service 'Profile', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('profile')
]

.service 'Ob', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('ob')
]

.service 'Event', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('event')
]

.service 'EventOwner', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('eventOwner')
]

