'use strict'

angular.module 'app', [
  'ui.router',
  'pong-base',
  'firebase'
]

.service 'fbRoot', (Firebase)-> new Firebase("http://sparks-development.firebaseio.com")

.service 'fbAuth', ['$firebaseAuth', 'fbRoot', ($firebaseAuth, fbRoot)->$firebaseAuth(fbRoot)]

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
    controller: ['$scope', '$state', 'fbAuth', 'authed', 'Profile', ($scope, $state, fbAuth, authed, Profile)->
      fbAuth.$onAuth (result)->
        $scope.auth = result
        if result?.uid then Profile.promise.get('uid',result.uid).then (snap)->
          unless snap.val() then Profile.push {uid: result.uid, displayName: result.google.displayName}
    ]

  .state 'authed.main',
    url: '/'
    templateUrl: 'main.html'
