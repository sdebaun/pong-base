'use strict'

angular.module 'app', [
  'ui.router',
  'pong-base',
  'firebase'
]

.service 'fbRoot', (Firebase)-> new Firebase("http://sparks-development.firebaseio.com")

.config ($stateProvider, $urlRouterProvider, $locationProvider) ->
  $urlRouterProvider
  .otherwise '/'

  $locationProvider.html5Mode true

  $stateProvider

  .state 'authed',
    abstract: true
    url: ''
    template: '''
<div model='Site' with='SINGLE'>
<div model='Profile' as='UserProfile' by='uid' with='{{auth.uid}}'>
  <appbar></appbar><profilebar></profilebar>
  <div ui-view></div>
</div></div>
    '''
    resolve:  
      authed: ['fbAuth', (fbAuth)-> fbAuth.$waitForAuth() ]
    controller: ['$scope', '$authManager', 'Profile', 'ProfileBuilder', ($scope, $authManager, Profile, ProfileBuilder)->
      $authManager $scope,'auth', (result)->
        if result?.uid then Profile.promise.get('uid',result.uid).then (snap)->
          unless snap.val() then Profile.push ProfileBuilder[result.provider](result)
    ]

  .state 'authed.main',
    url: '/'
    templateUrl: 'main.html'

  .state 'authed.event',
    url: '/event/:event_id'
    templateUrl: 'event.html'
    controller: ['$scope', '$stateParams', ($scope, $stateParams)->
      $scope.event_id = $stateParams.event_id
    ]

.service 'ProfileBuilder', ->

  google: (auth)->
    uid: auth.uid
    name_first: auth.google.cachedUserProfile.given_name
    name_last: auth.google.cachedUserProfile.family_name
    email: auth.google.email
    profile_pic_url: auth.google.profileImageURL

  facebook: (auth)->
    uid: auth.uid

.directive 'appbar', ->
  restrict: 'E'
  template: '''
  <div class='navbar container'>
    <div><a href='#' ui-sref='authed.main()'>My App!</a></div>
    <div>{{Site.profile_count}} total profiles.  {{Site.event_count}} total events.  {{Site.karma_earned_total}} total karma earned.</div>
    <div ng-hide='auth.uid'>
      <button login='google' method='popup'>Login w Popup</button>
      <button login='google'>Login w Redirect</button>
    </div>
    <div ng-show='auth.uid && UserProfile_loaded'>
      NAME: {{UserProfile.name_first}} {{UserProfile.name_last}}
      UID: {{auth.uid}}
      <button logout ng-show='auth.uid'>Logout</button>
    </div>
    <hr/>
  </div>
  '''

.directive 'profilebar', ->
  restrict: 'E'
  template: '''
  <div class='user container' ng-show='UserProfile_loaded'>
    <h2>Your Profile (model directive)</h2>
    <img ng-src='{{UserProfile.profile_pic_url}}' width=64 height=64 style='border-radius: 32px'/>
    <h3>{{UserProfile.name_first}} {{UserProfile.name_last}}</h3>
  </div>
  '''
