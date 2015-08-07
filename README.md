# pong-base

Coordinate client and server firebase use with shared code and easy server-side behavior.

## installation

You need to install this twice: once for your node server, and once for your angular client.  You'll also need pongular if you don't already have it.

```bash
$ npm install --save pongular pong-base
```

```bash
$ bower install --save pong-base
```

The npm and bower packages contain everything your app needs on the server and client respectively.

Then in both environments, you'll need to specify the `pong-base` module as a dependency:

```coffee
# on the client
angular.module 'app', [
  'pong-base'
]

```

```coffee
# on the server
pongular.module 'app', [
  'pong-base'
]
```

## overview

There are several parts to pongbase that you use together to streamline firebase use on both the client and server.

* `$model`.  You'll create services that are used by both the angular client and server to refer to a specific part of the data.
* `$modelManager`.  Server-side pongular services give you an easy way to write back-end behavior that must be secure.
* `collection` and `model` directives.  Use these in your angular client wherever you need to retreive data.

You also get some simple `login` and `logout` directives that plug right into Firebase's oauth system.

## shared code

Shared code uses a bit of hackery to choose the right DI library.  This is the snippet that I add to the top of all my `.shared` files:

```coffee
# shared by browser and node
di = (typeof window!='undefined') && window.angular || require('pongular').pongular
di.module 'myApp'
```

On the client, that will use angular's DI, and on the server, it will use pongular's.  The syntax for both is identical.  Magic!

## Describing and Referencing your Firebase Data

### The `$model` Service (shared)

Define `$model`s in your `.shared` code to get:

* use firebase without controller code with the `model` directive
* consistent references to FB paths on both client and server
* extra syntactic sugar on the client and server for directly modifying FB resources.

```coffee
# defined somewhere else...
# .service 'fbRoot', -> new Firebase("MY_FIREBASE_URL")

.service 'Profile', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('profile')
]

.service 'Site', ['$model', 'fbRoot', ($model, fbRoot)->
  $model fbRoot.child('site')
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
```

You can directly use these services anywhere in your client or server by simply injecting them:

```coffee
# its basically a firebase
.directive 'newEventForm', ['Event', (Event)->
  template: ...
  link: (scope,el,attrs)->
    scope.create = (data)-> Event.push(data)
]

# the model has an extra `promise` attribute tacked on
# that lets you easily do things and avoid callback hell
.service 'doStuff', ['Site', (Site)->
  (name)->
    Site.single().promise.set({name: name}) # NOT IMPLEMENTED YET
    .then (siteRef)-> siteRef.promise.get()
    .then (snap)-> console.log snap.val().name
]
```

### Data Directives (angular)

The `collection` and `model` directives lets you easily use services defined with `$model` in your angular app.

No need to attach a variable to a controller "by hand" or anything like that.  You just specify the attribute:

```html
<div model='Site'>
  {{Site.name}}
</div>
```

Specifying nothing but `model` will tell the directive to treat it like a singleton.  It will create an isolate scope with a Site property.  That property is bound to the .single() method of the Site service, which resolves to a child with the key of 'SINGLE'

Once you start specifying anything else but the model, the directives will get clever about what they think you want
and build the firebase query accordingly.

#### `collection` directive

This uses `by` and `with` attributes to get an array of up to `limit` records.  Use `ng-repeat` to iterate over them in angular.

* `by` will filter your records based on one of their properties, using firebase's `orderByChild()`.  This attribute is *not* $eval'd.
* You can also use `with` in conjunction with `by` in order to get records with a specific child.  If `with` is an array of items, it is assumed to be a composite key and is `join()`d with `|`.  This attribute *is* $eval'd.
* `limit` will simply apply a `limitToFirst()` filter on the firebase query.  If no `limit` is specified, it defaults to one.  This attribute *is* $eval'd.  

#### `model` directive

This uses the same `by` and `with` attributes, but they behave slightly differently.  It also directly attaches a property to the scope named after the model, instead of requiring an `ng-repeat` to iterate.

* `with` is required, and if used by itself, simply gets the child with the matching key.  This attribute *is* $eval'd.
* `by` is optional, and changes what `with` means.  If used, it will use the value to find a single record with a child that matches `with`.
* `limit` doesn't do 

#### Aliasing with `as`

For both `collection` and `model` directives, you can use an `as` attribute to change the name of the scope property used.

### Auth Directives & Services (angular)

#### `$authManager` service

Use this service to automatically update a scope property whenever auth state changes.  It takes up to three arguments:

* pass a `scope` to tell it to update the property on that particular scope.  If none passed, defaults to $rootScope.
* then pass `property` to tell it what to bind to.  Defaults to "auth".
* finally, if you want something else to happen in your app when auth state changes, pass a `callback`.  This will be called with the auth result as the only argument.

```coffee
# somewhere like module.run or in a top-level 'authed' state in ui-router, see test/site/app/app.coffee for example

$authManager() # just bind to $rootScope.auth
$authManager $scope # bind to a specific scope
$authManager $scope, 'userAuth' # bind to $scope.userAuth
$authManager $scope, 'userAuth', (result)-> console.log 'auth changed', result
```

#### `login` and `logout` directives

Simply attach them to anything that works with `ng-click` and these directives will hook the element to the proper behavior:

```html
<div ng-hide='auth.uid'>
  <button login='google'>Login with Google</button>
  <button login='facebook'>Login with Google</button>
</div>
<div ng-show='auth.uid'>
  <button logout>Logout</button>
</div>
```

When those buttons are clicked, and authentication state changes, the `$authManager` will automatically update whatever you told it to update.

#### Examples

Use ng-repeat to iterate over the first ten profiles.  It will apply orderByPriority() to the query automatically.

```html
<div collection='Profile' limit='10'>
  <div ng-repeat='Profile in Profiles'>
  <h1>{{Profile.name}}</h1>
  </div>
</div>
```

This would create an `<h1>` element for each Profile, showing the name field.

You can take use the `by` and `with` attributes to take advantage of firebase's orderByChild query filter in order to select a subset of children from Firebase:

```html
<div collection='Profile' by='is_public' with='true' limit='10'>
  <div ng-repeat='Profile in Profiles'>
  <h1>{{Profile.name}}</h1>
  </div>
</div>
```

You can nest `model` directives in lots of interesting ways.

Nest your `model`s to show data from multiple objects.  Here, we're showing stuff from the Site singleton as well as the Profile found with a `uid` matching `auth.uid`.  

```html
<div model='Site'>
  <div collection='Profile' by='uid' with='{{auth.uid}}' limit='1'>
    <div ng-repeat='Profile in Profiles'>
      <h1>{{profile.name}}</h1>
      <h2>Karma: {{profile.karma_earned}}</h2>
      <span>Total karma for all users on site: {{site.karma_earned_total}}</span>
    </div>
  </div>
</div>
```

Here's how to nest `model`s to reflect a many-to-many relationship.
This shows the Events that the user is a member of.

```html
<div model='Profile' by='uid' with='{{auth.uid}}' limit='1'>
  <h1>{{Profile.name}}</h1>

  <h3>My Events</h3>

  <div model='EventOwner' by='profile_key' with='Profile.$key'>
    <div model='Event' with='EventMember.Event_key'>
      <h4>{{Event.name}}</h4>
      <span>Member since {{EventMember.created_on}}</span>
  </div>
</div>
```

In this case:

* We repeat the innards of the EventOwner div for each EventOwner that has a profile_key equal to the current Profile.$key.
* For each EventOwner, we find the Event `model` with a matching Event_key.


Show a logged in user's profile (found with auth.uid scope variable) and outstanding objectives and Events they're members of.

```html
<div model='Site'>
  <div model='Profile' by='uid' with='{{auth.uid}}' limit='1'>
    <h1>{{profile.name}}</h1>
    <h2>Karma: {{profile.karma_earned}}</h2>
    <span>Total karma on site: {{site.karma_earned_total}}</span>

    <h3>My Objectives</h3>

    <div model='ObjectiveAssignment' by='profile_complete' with='[profile.$key,false]'>
      {{objectiveAssignment.name}}: {{objectiveAssignment.karma_reward}} karma
    </div>

    <h3>My Events</h3>

    <div model='EventMember' by='profile_key' with='profile.$key'>
      <div model='Event' key='EventMember.Event_key'>
        <h4>{{Event.name}}</h4>
        <span>Member since {{EventMember.created_on}}</span>
    </div>
  </div>
</div>
```

### The `$modelManager` Service (node)

Define `$modelManager`s in your server code and call `listen()` when you start your server:

```coffee
# this is called somewhere in server startup.
.service 'CalledByMyServer', (ProfileManager, ObjectiveAssignedManager)->
  ->
    for m in (ProfileManager, ObjectiveAssignedManager)
      m.listen()

.service 'ProfileManager', ($modelManager, Site, Profile, ImportantServerSideFunction)->
  $modelManager Profile,
    # automatically adds created_on and modified_on fields
    timestamp: true

    # will only get run once and set an is_initalized flag
    initialize: (rec)->
      ImportantServerSideFunction(rec)

    # counters will update targets based on add/removes on model
    counters:

      # just specify a target and it will count every record
      # count is saved to in a 'profileCount' field
      profile_count: 
        target: Site.single()

      # specify a countIf to selectively increment or decrement
      # site.profileConfirmedCount will inc or dec not just add/removes
      # but also changes to the field (changes tracked by is_confirmed_old)
      profile_confirmed_count:
        countIf: ['is_confirmed', true]
        target: Site.single()

      # specify a field to total and it will inc or dec by that amount
      # changes tracked by karma_old
      karma_earned_total:
        total: 'karma_earned'
        target: Site.single()

.service 'EventMemberManager', ($modelManager, EventMember, Event)->
  $modelManager EventMember,
    counters:

      # provide a function as your counter target and whatever it returns will be used as the target
      Event_member_count:
        target: (rec)-> Event.byKey(rec.profile_key)

.service 'ObjectiveAssignedManager', ($modelManager, ObjectiveAssigned, Profile, Objective)->
  $modelManager ObjectiveAssigned,

    # composite indexes allow for easy queries on multiple children
    composites:

      # will create a field 'profile_completed_key' on each child
      # it will be always updated to "#{profile_key}|#{is_completed}"
      profile_complete: ['profile_key', 'is_complete']
      objective_complete: ['objective_key', 'is_complete']

    counters:

      # if the function you provide returns an array, it will update the counter in each target
      objective_assigned_count:
        target: (rec)-> [Site.single(), Profile.byKey(rec.profile_key), Objective.byKey(rec.objective_key)]

      objective_assigned_complete_count:
        countIf: ['is_complete', true]
        target: (rec)-> [Site.single(), Profile.byKey(rec.profile_key), Objective.byKey(rec.objective_key)]

      # using countIf, total, and target to keep a running total of karma earned for a profile
      # note that this also triggers the Profile counter that totals the earned_karma field
      karma_earned:
        countIf: ['is_complete', true]
        total: 'karma_reward'
        target: (rec)-> Profile.byKey(rec.profile_key)

```

## build notes

Shared code needs to be deployed in both places.  I personally just modify my build tasks to look for `*.shared.coffee` files and deal with them appropriately.

Whatever build process you use, make sure that your `.shared` code ends up in both your client and server distribution.

#### angular-fullstack

update your ```Gruntfile.js``` to make sure shared code ends up in the same place in your ```dist/```.

```
    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= yeoman.client %>',
          dest: '<%= yeoman.dist %>/public',
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            'bower_components/**/*',
            'assets/images/{,*/}*.{webp}',
            'assets/fonts/**/*',
            'index.html'
          ]
        }, {
          expand: true,
          cwd: '.tmp/images',
          dest: '<%= yeoman.dist %>/public/assets/images',
          src: ['generated/*']
        }, {
          expand: true,
          dest: '<%= yeoman.dist %>',
          src: [
            'package.json',
            'client/app/**/*.shared.coffee', // ADD FOR SHARED MODULES ON CLIENT!
            'server/**/*'
          ]
        }]
      },
```