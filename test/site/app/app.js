'use strict';
angular.module('app', ['ui.router', 'pong-base', 'firebase']).service('fbRoot', function(Firebase) {
  return new Firebase("http://sparks-development.firebaseio.com");
}).config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $urlRouterProvider.otherwise('/');
  $locationProvider.html5Mode(true);
  return $stateProvider.state('authed', {
    abstract: true,
    url: '',
    template: '<div model=\'Site\' with=\'SINGLE\'>\n<div model=\'Profile\' as=\'UserProfile\' by=\'uid\' with=\'{{auth.uid}}\'>\n  <appbar></appbar><profilebar></profilebar>\n  <div ui-view></div>\n</div></div>',
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
  }).state('authed.event', {
    url: '/event/:event_id',
    templateUrl: 'event.html',
    controller: [
      '$scope', '$stateParams', function($scope, $stateParams) {
        return $scope.event_id = $stateParams.event_id;
      }
    ]
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
}).directive('appbar', function() {
  return {
    restrict: 'E',
    template: '<div class=\'navbar container\'>\n  <div><a href=\'#\' ui-sref=\'authed.main()\'>My App!</a></div>\n  <div>{{Site.profile_count}} total profiles.  {{Site.event_count}} total events.  {{Site.karma_earned_total}} total karma earned.</div>\n  <div ng-hide=\'auth.uid\'>\n    <button login=\'google\' method=\'popup\'>Login w Popup</button>\n    <button login=\'google\'>Login w Redirect</button>\n  </div>\n  <div ng-show=\'auth.uid && UserProfile_loaded\'>\n    NAME: {{UserProfile.name_first}} {{UserProfile.name_last}}\n    UID: {{auth.uid}}\n    <button logout ng-show=\'auth.uid\'>Logout</button>\n  </div>\n  <hr/>\n</div>'
  };
}).directive('profilebar', function() {
  return {
    restrict: 'E',
    template: '<div class=\'user container\' ng-show=\'UserProfile_loaded\'>\n  <h2>Your Profile (model directive)</h2>\n  <img ng-src=\'{{UserProfile.profile_pic_url}}\' width=64 height=64 style=\'border-radius: 32px\'/>\n  <h3>{{UserProfile.name_first}} {{UserProfile.name_last}}</h3>\n</div>'
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
]).service('Ob', [
  '$model', 'fbRoot', function($model, fbRoot) {
    return $model(fbRoot.child('ob'));
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
