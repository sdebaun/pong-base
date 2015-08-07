pongular = require('pongular').pongular

require '../../node.js' # pong-base

pongular.module 'app', ['pong-base']
.uses './test/site/app/**/*.shared.coffee'

.service 'fbRoot', (Firebase)-> new Firebase("http://sparks-development.firebaseio.com")

.service 'StartManagers', (ProfileManager, EventManager, EventOwnerManager)->
	-> m.listen() for m in [ProfileManager,EventManager,EventOwnerManager]

.service 'ProfileManager', ($modelManager, Profile, Site)->
	$modelManager Profile,

		timestamp: true

		initialize: (rec)->
			console.log "Initialized for new record", rec

		counters:

			profile_count:
				target: Site.single()

			# profile_confirmed_count:
			# 	countIf: ['is_confirmed', true]
			# 	target: Site.single()

			karma_earned_total:
				total: 'karma_earned'
				target: Site.single()

.service 'EventManager', ($modelManager, Event, Site)->
	$modelManager Event,
		counters:
			event_count:
				target: Site.single()

			event_public_count:
				countIf: ['is_public', true]
				target: Site.single()

			event_private_count:
				countIf: ['is_public', false]
				target: Site.single()


.service 'EventOwnerManager', ($modelManager, EventOwner, Event)->
	$modelManager EventOwner,
		counters:
			event_owner_count:
				target: (rec)-> Event.child(rec.event_key)

