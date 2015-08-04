'use strict';
angular.module('app', ['ui.router', 'pong-base', 'firebase']).service('fbRoot', function(Firebase) {
  return new Firebase("http://sparks-development.firebaseio.com");
}).service('fbAuth', [
  '$firebaseAuth', 'fbRoot', function($firebaseAuth, fbRoot) {
    return $firebaseAuth(fbRoot);
  }
]).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/');
  $locationProvider.html5Mode(true);
  return $stateProvider.state('authed', {
    abstract: true,
    url: '',
    template: '<div ui-view></div>',
    resolve: {
      authed: [
        'fbAuth', function(fbAuth) {
          return fbAuth.$waitForAuth();
        }
      ]
    },
    controller: [
      '$scope', '$state', 'fbAuth', 'authed', 'Profile', function($scope, $state, fbAuth, authed, Profile) {
        return fbAuth.$onAuth(function(result) {
          $scope.auth = result;
          if (result != null ? result.uid : void 0) {
            return Profile.promise.get('uid', result.uid).then(function(snap) {
              if (!snap.val()) {
                return Profile.push({
                  uid: result.uid,
                  displayName: result.google.displayName
                });
              }
            });
          }
        });
      }
    ]
  }).state('authed.main', {
    url: '/',
    templateUrl: 'main.html'
  });
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('app').service('Profile', [
  'fbRoot', '$model', function(fbRoot, $model) {
    return $model(fbRoot.child('profile'));
  }
]);
