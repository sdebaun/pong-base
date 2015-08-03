# pong-base

Coordinate client and server firebase use with shared code and easy server-side behavior.

## installation

```bash
$ npm install [THIS REPO URL]
```

## overview

There are several parts to pongbase that you use together to streamline firebase use on both the client and server.

* `$model`.  You'll create services that are used by both the angular client and server to refer to a specific part of the data.
* `$modelManager`.  Server-side pongular services give you an easy way to write back-end behavior that must be secure.
* `model` directive.  Use this in your angular client wherever you need to retreive data.

## shared code

Shared code uses a bit of hackery to choose the right DI library.  This is the snippet that I add to the top of all my `.shared` files:

```
# shared by browser and node
di = (typeof window!='undefined') && window.angular || require('pongular').pongular
di.module 'appApp'
```

On the client, that will use angular's DI, and on the server, it will use pongular's.  The syntax for both is identical.  Magic!

## Details

### shared: $model

Define `$model`s in your `.shared` code to get:

* syntactic sugar on the client.
* use without controller code with the `model` directive
* consistent references to FB paths on both client and server

```
# defined somewhere else...
# .service 'fbRoot', -> new Firebase("MY_FIREBASE_URL")

.service 'Profile', ($model, fbRoot)->
  $model fbRoot.child('profile')

.service 'Site', ($model, fbRoot)
  $model fbRoot.child('site')

.service 'Objective', ($model, fbRoot)
  $model fbRoot.child('objective')

.service 'ObjectiveAssigned', ($model, fbRoot)
  $model fbRoot.child('objectiveAssigned')

.service 'Project', ($model, fbRoot)->
  $model fbRoot.child('project')

.service 'ProjectMember', ($model, fbRoot)->
  $model fbRoot.child('projectMember')
```

You can directly use these services anywhere in your client or server by simply injecting them:

```
# in angular-land
# everything returns a firebase
.directive 'newProjectForm', ['Project', (Project)->
  template: ...
  link: (scope,el,attrs)->
    scope.create = (data)-> Project.add(data)
]

# in pongular-land
# everything returns a promise wrapping the firebase js library
.service 'setName', ['Site', (Site)->
  (name)->
    # gets a child with the key of 'SINGLE'
    Site.single()

    .update( {name: name} )

]
```
### client: model directive

The `model` directive lets you easily use services defined with `$model` in your angular app.

You can just specify a `model` attribute:
```
<div model='Site'>
  {{Site.name}}
</div>
```
This will create an isolate scope with a Site property.  That property is bound to the 

Show the top ten public profiles by priority.
```
<div model='Profile' by='is_public' order-by-priority equalTo='true' limit='10'>
  <h1>{{Profile.name}}</h1>
</div>
```

Show a logged in user's profile (found with auth.uid scope variable) and outstanding objectives and projects they're members of.
```
<div model='Site'>
  <div model='Profile' by='uid' equalTo='{{auth.uid}}' limit='1'>
    <h1>{{profile.name}}</h1>
    <h2>Karma: {{profile.karma_earned}}</h2>
    <span>Total karma on site: {{site.karma_earned_total}}

    <h3>My Objectives</h3>

    <div model='ObjectiveAssignment' by='profile_complete' equal-to-composite='[profile.$key,false]'>
      {{objectiveAssignment.name}}: {{objectiveAssignment.karma_reward}} karma
    </div>

    <h3>My Projects</h3>

    <div model='ProjectMember' by='profile_key' equal-to='profile.$key'>
      <div model='Project' key='projectMember.project_key'>
        <h4>{{project.name}}</h4>
        <span>Member since {{projectMember.created_on}}</span>
    </div>
  </div>
</div>
```

### server: $modelManager

Define `$modelManager`s in your server code and call `listen()` when you start your server:

```
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

.service 'ProjectMemberManager', ($modelManager, ProjectMember, Project)->
  $modelManager ProjectMember,
    counters:

      # provide a function as your counter target and whatever it returns will be used as the target
      project_member_count:
        target: (rec)-> Project.byKey(rec.profile_key)

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