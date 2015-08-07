pongular = require('pongular').pongular

require '../../node.js' # pong-base

ALL_MANAGERS = [
	'ProfileManager',
	'EventManager',
	'EventOwnerManager',
	'ObManager'
]

pongular.module 'app', ['pong-base']
.uses './test/site/app/**/*.shared.coffee'

.service 'fbRoot', (Firebase)-> new Firebase("http://sparks-development.firebaseio.com")

.service 'StartManagers', [ALL_MANAGERS..., (args...)->
	-> m.listen() for m in args
]

.service 'ProfileManager', ($modelManager, Profile, Site)->
	$modelManager Profile,

		timestamp: true

		initialize: (rec)->
			console.log "Initialized for new record"

		counters:

			profile_count:
				target: Site.single()

			profile_confirmed_count:
				countIf: ['is_confirmed', true]
				target: Site.single()

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

.service 'ObManager', ($modelManager, Ob, Event, Site, Profile)->
	$modelManager Ob,
		composites:
			event_complete: ['event_key', 'is_complete']
			profile_complete: ['profile_key', 'is_complete']

		counters:
			ob_count:
				target: (rec)-> [Site.single(), Profile.child(rec.profile_key), Event.child(rec.event_key)]

			ob_completed_count:
				countIf: ['is_complete', true]
				target: (rec)-> [Site.single(), Profile.child(rec.profile_key), Event.child(rec.event_key)]

			# using countIf, total, and target to keep a running total of karma earned for a profile
			# note that this also triggers the Profile counter that totals the earned_karma field
			karma_earned:
				countIf: ['is_complete', true]
				total: 'karma_reward'
				target: (rec)-> Profile.child(rec.profile_key)
