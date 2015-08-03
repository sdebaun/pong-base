pongular = require('pongular').pongular;


require '../index' # pong-base

pongular.module 'app', ['pong-base']
.service 'pbRoot', ($pb)-> $pb "https://sparks-development.firebaseio.com/"

.service 'profile', ($model,pbRoot)->
	$model pbRoot.child('profile'), ['email', 'authid']

.service 'event', ($model,pbRoot)->
	$model pbRoot.child('event'), ['viewPublic']

.service 'eventOwner', ($model,pbRoot)->
	$model pbRoot.child('eventOwner'), ['event_id', 'owner_id']

.service 'faker', -> require 'faker'

.value 'fakePictures', [
	'http://worldtravelbliss.com/wp-content/uploads/2015/04/BM-2015-Carnival-of-Mirrors.jpg'
	'https://pbs.twimg.com/media/BzyXBnMIQAEU9HU.jpg'
	'http://boropulse.com/wp-content/uploads/2015/04/Lightning-In-a-Bottle-1.jpg'
	'http://www.neontommy.com/sites/default/files/users/user620/LIB%20Woogie%20Stage.jpg'
	'http://www.psybient.org/love/wp-content/uploads/Yaga-report-photo-2.jpg'
	'http://www.psybient.org/love/wp-content/uploads/Yaga-report-photo-4.jpg'
	'http://festivalfire.com/wp-content/uploads/2015/05/LIB2015.jpg'
	'http://imgs.l4lmcdn.com/wild-woods-festival.jpg'
	'http://www.neontommy.com/sites/default/files/users/user620/LIB%20Seminar.jpg'
	'http://solpurpose.com/wp-content/uploads/2013/02/Itom-Neyen.jpg'
	'https://www.goabase.net/pic/20140110tribalgathering_20131105034003.jpg'
	'https://s-media-cache-ak0.pinimg.com/736x/8d/f6/41/8df641b1d49e6270f74493f17cb8e5a5.jpg'
	'http://sensiblereason.com/wp-content/uploads/2015/03/scamp31.jpg'
	'http://i.imgur.com/nUTcriDl.jpg'
	'http://sensiblereason.com/wp-content/uploads/2015/03/junglejame1.jpg'
]
.service 'fixture', (faker,pick,fakePictures)->
	profile: ->
		nameFirst: faker.name.firstName()
		nameLast: faker.name.lastName()
		email: faker.internet.email()
	event: ->
		name: 'Some Event'
		cardPic: pick(fakePictures)
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
		$q.all (event.all().push(fixture.event()) for i in [1..3])
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
				.lookup()
				.then (refs)-> refs[0].once()
				.then (snap)-> console.log 'profile found:', snap.val()
	.catch (err)-> console.log err
	.finally -> process.exit()

