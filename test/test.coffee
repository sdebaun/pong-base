pongular = require('pongular').pongular;

require '../index.js' # pong-base

pongular.module 'app', ['pong-base']
.service 'pbRoot', ($pb)-> $pb "https://guildbook.firebaseio.com/"

.service 'profile', ($model,pbRoot)->
	$model pbRoot.child('profile'), ['email', 'authid']

.service 'event', ($model,pbRoot)->
	$model pbRoot.child('event'), ['viewPublic']

.service 'eventOwner', ($model,pbRoot)->
	$model pbRoot.child('eventOwner'), ['event_id', 'owner_id']

.service 'faker', -> require 'faker'

.service 'fixture', (faker)->
	profile: ->
		nameFirst: faker.name.firstName()
		nameLast: faker.name.lastName()
		email: faker.internet.email()
	event: ->
		name: 'Some Event'
	eventOwner: (event,owner)->
		owner_id: owner.key()
		event_id: event.key()

.service 'pick', ->
	(arr)-> arr[Math.floor(Math.random()*arr.length)]

pongular.injector(['app', 'pong-base']).invoke ($watch, $q, fixture, pbRoot, profile, event, eventOwner, pick)->
	pbRoot.remove()
	.then ->
		console.log 'all data removed from firebase'
	.then ->
		$watch(m) for m in [profile, event, eventOwner]
	.then ->
		console.log 'all data removed from firebase'
		$q.all (profile.all().push(fixture.profile()) for i in [1..10])
	.then (profiles)->
		console.log "#{profiles.length} profiles generated"
		$q.all (event.all().push(fixture.event()) for i in [1..5])
		.then (events)->
			console.log "#{events.length} events generated"
			$q.all (eventOwner.all().push(fixture.eventOwner(e,pick(profiles))) for e in events)
			.then (eventOwners)-> console.log "#{eventOwners.length} owners assigned"
		.then ->
			profiles[0].once()
			.then (snap)-> snap.val().email
			.then (email)->
				console.log 'looking up first profile by email', email
				profile.by('email',email)
				.then (refs)-> refs[0].once()
				.then (snap)-> console.log 'profile found:', snap.val()
	.catch (err)-> console.log err
	.finally -> process.exit()

