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
    template: '<div ui-view></div>'
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

.service 'ProfileBuilder', ->

  google: (auth)->
    console.log 'Building profile from google auth'
    nameFirst: auth.google.cachedUserProfile.given_name
    nameLast: auth.google.cachedUserProfile.family_name
    email: auth.google.email
    uid: auth.uid
    profilePicUrl: auth.google.profileImageURL

  facebook: (auth)->
    auth