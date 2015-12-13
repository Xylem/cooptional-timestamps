(function (angular) {
    'use strict';

    angular.module('app', ['ngRoute', 'ngMaterial', 'ngAnimate', 'ngMessages']).
        config(['$routeProvider', '$mdThemingProvider', function ($routeProvider, $mdThemingProvider) {
                $mdThemingProvider.theme('default')
                    .primaryPalette('blue')
                    .accentPalette('orange');

                $routeProvider.when('/', {
                    templateUrl: './scripts/wizard/wizard.html' ,
                    controller: 'wizardController'
                });

                $routeProvider.otherwise({ redirectTo: '/' });
            }
        ]);

})(window.angular);