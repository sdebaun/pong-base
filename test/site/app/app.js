'use strict';
angular.module('app', ['ui.router', 'pong-base', 'firebase']).service('fbRoot', function(Firebase) {
  return new Firebase("http://sparks-development.firebaseio.com");
}).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
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
      '$scope', '$authManager', 'Profile', 'ProfileBuilder', function($scope, $authManager, Profile, ProfileBuilder) {
        return $authManager($scope, 'auth', function(result) {
          if (result != null ? result.uid : void 0) {
            return Profile.promise.get('uid', result.uid).then(function(snap) {
              if (!snap.val()) {
                return Profile.push(ProfileBuilder[result.provider](result));
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
}).service('ProfileBuilder', function() {
  return {
    google: function(auth) {
      console.log('Building profile from google auth');
      return {
        nameFirst: auth.google.cachedUserProfile.given_name,
        nameLast: auth.google.cachedUserProfile.family_name,
        email: auth.google.email,
        uid: auth.uid,
        profilePicUrl: auth.google.profileImageURL
      };
    },
    facebook: function(auth) {
      return auth;
    }
  };
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('app').service('Profile', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('profile'));
  }
]).service('Site', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('site'));
  }
]).service('Objective', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('objective'));
  }
]).service('ObjectiveAssigned', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('objectiveAssigned'));
  }
]).service('Event', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('event'));
  }
]).service('EventOwner', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('eventOwner'));
  }
]);
