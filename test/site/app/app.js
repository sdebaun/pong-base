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
      return {
        uid: auth.uid,
        name_first: auth.google.cachedUserProfile.given_name,
        name_last: auth.google.cachedUserProfile.family_name,
        email: auth.google.email,
        profile_pic_url: auth.google.profileImageURL
      };
    },
    facebook: function(auth) {
      return {
        uid: auth.uid
      };
    }
  };
});

var di;

di = typeof window !== 'undefined' ? window.angular : require('pongular').pongular;

di.module('app').service('Site', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('site'));
  }
]).service('Profile', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('profile'));
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
