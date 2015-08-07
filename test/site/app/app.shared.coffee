# shared by browser and node
di = if (typeof window!='undefined') then window.angular else require('pongular').pongular
di.module 'app'

.service 'Site', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('site')
]

.service 'Profile', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('profile')
]

.service 'Objective', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('objective')
]

.service 'ObjectiveAssigned', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('objectiveAssigned')
]

.service 'Event', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('event')
]

.service 'EventOwner', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('eventOwner')
]

