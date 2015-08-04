# shared by browser and node
di = if (typeof window!='undefined') then window.angular else require('pongular').pongular
di.module 'app'

.service 'Profile', ['fbRoot', '$model', (fbRoot, $model)->
	$model fbRoot.child('profile')
]

