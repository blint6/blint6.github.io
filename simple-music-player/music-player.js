'use strict';

angular.module('music-player.about', ['ui.router']);

'use strict';

angular.module('music-player.admin', []);

'use strict';

angular.module('music-player.auth', ['music-player.admin']);

'use strict';

angular.module('music-player.listen', ['ui.router']);
'use strict';

angular.module('music-player.system', ['music-player.auth','mean-factory-interceptor']);

'use strict';

angular.module('music-player.about')

.config(['$stateProvider',
    function ($stateProvider) {
        $stateProvider
            .state('about', {
                url: '/about',
                templateUrl: 'about/views/index.html'
            });
}]);

'use strict';

angular.module('music-player.admin')

.value('env', {})

.value('roleNames', {
    'track.edit': 'Track Edit/Create',
    'track.delete': 'Track Delete',
    'user.roles': 'Manage User Roles'
})

// Admin-features menus, with state mapping
.value('adminMenus', {
    'user.roles': 'admin.roles'
})

.controller('AdminCtrl', ['$scope', '$rootScope', '$state', 'roleNames', 'adminMenus',
    function ($scope, $rootScope, $state, roleNames, adminMenus) {
        $scope.roleNames = roleNames;

        // Provide full access to admin
        var adminIndex = $rootScope.global.user.roles.indexOf('admin');

        if (adminIndex > -1) {
            $scope.menus = Object.keys(adminMenus);
        } else {
            // Take all user roles that are admin-features roles
            $scope.menus = $rootScope.global.user.roles.filter(function (role) {
                return typeof adminMenus[role] !== 'undefined';
            });
        }

        $scope.clickMenu = function (role) {
            $state.go(adminMenus[role]);
        };
    }])

.controller('RolesCtrl', ['$scope', '$http', 'roleNames',
    function ($scope, $http, roleNames) {

        $scope.roleNames = roleNames;

        $scope.findRolesByUser = function () {
            $http.get('/userroles/' + $scope.username).success(function (data) {
                $scope.userEdit = data;
                $scope.roles = {};

                for (var i = 0; i < $scope.userEdit.roles.length; i++) {
                    $scope.roles[$scope.userEdit.roles[i]] = true;
                }
            }).error(function () {
                $scope.userEdit = undefined;
                $scope.roles = undefined;
            });
        };

        $scope.changeRole = function (role) {
            var grant = !!$scope.roles[role],
                operation = grant ? 'grant' : 'revoke';

            $http.get(['', operation, $scope.userEdit.username, role].join('/')).error(function (err) {
                console.log(err);
                $scope.roles[role] = !grant;
            });
        };
}]);

'use strict';

angular.module('music-player.admin')

.config(['$stateProvider',
    function ($stateProvider) {
        $stateProvider
            .state('admin', {
                templateUrl: 'admin/views/index.html'
            })
            .state('admin.menu', {
                url: '/admin',
                templateUrl: 'admin/views/menu.html'
            })
            .state('admin.roles', {
                url: '/admin/roles',
                templateUrl: 'admin/views/roles.html'
            });
}]);

'use strict';

angular.module('music-player.auth')

.controller('LoginCtrl', ['$scope', '$rootScope', '$http', '$location', 'env', 'adminMenus',
    function ($scope, $rootScope, $http, $location, env, adminMenus) {

        function loginSuccess(user) {
            $scope.loginError = 0;
            $rootScope.$emit('loggedin', user);
        }

        // This object will be filled by the form
        $scope.user = {};
        $scope.global = $rootScope.global;

        if (env.isBackendActive) {
            $scope
                .login = function () {
                    $location.url('/');
                    $http.post('/login', {
                        email: $scope.user.email,
                        password: $scope.user.password
                })
                .success(loginSuccess)
                .error(function () {
                    $scope.loginerror = 'Authentication failed.';
                });
            };
        } else {
            loginSuccess({
                name: 'Guest',
                email: $scope.user.email,
                username: $scope.user.email,
                roles: ['authenticated', 'admin']
            });
        }

        $scope.hasAdminFeatures = function () {
            if (!$rootScope.global.authenticated) {
                return false;
            }

            for (var menu in adminMenus) {
                if ($rootScope.global.hasRole(menu)) {
                    return true;
                }
            }

            return false;
        };
    }])

.controller('RegisterCtrl', ['$scope', '$rootScope', '$http', '$location',
    function ($scope, $rootScope, $http, $location) {
        $scope.user = {};

        $scope.register = function () {
            $scope.usernameError = null;
            $scope.registerError = null;
            $http.post('/register', {
                email: $scope.user.email,
                password: $scope.user.password,
                confirmPassword: $scope.user.confirmPassword,
                username: $scope.user.username,
                name: $scope.user.name
            })
                .success(function (user) {
                    // authentication OK
                    $scope.registerError = 0;
                    $rootScope.$emit('loggedin', user);
                    $location.url('/');
                })
                .error(function (error) {
                    // Error: authentication failed
                    if (error === 'Username already taken') {
                        $scope.usernameError = error;
                    } else {
                        $scope.registerError = error;
                    }
                });
        };
    }])

.directive('loginBanner', function () {
    return {
        restrict: 'E',
        templateUrl: 'auth/views/login-banner.html',
        controller: 'LoginCtrl'
    };
});

'use strict';

//Setting up route
angular.module('music-player.auth')

.config(['$stateProvider',
    function ($stateProvider) {
        //================================================
        // Check if the user is not conntect
        //================================================
        var checkLoggedOut = function ($q, $timeout, $http, $location) {
            // Initialize a new promise
            var deferred = $q.defer();

            // Make an AJAX call to check if the user is logged in
            $http.get('/loggedin').success(function (user) {
                // Authenticated
                if (user !== '0') {
                    $timeout(function () {
                        deferred.reject();
                    }, 0);
                    $location.url('/login');

                }

                // Not Authenticated
                else {
                    $timeout(deferred.resolve, 0);

                }
            });

            return deferred.promise;
        };
        //================================================

        // states for my app
        $stateProvider
            .state('auth', {
                templateUrl: 'auth/views/index.html'
            })
            .state('auth.login', {
                url: '/login',
                templateUrl: 'auth/views/login.html',
                resolve: {
                    loggedin: checkLoggedOut
                }
            })
            .state('auth.register', {
                url: '/register',
                templateUrl: 'auth/views/register.html',
                resolve: {
                    loggedin: checkLoggedOut
                }
            });
    }
])

.run(['$rootScope',
    function ($rootScope) {
        $rootScope.global = $rootScope.global || {};

        if (window.user && !$rootScope.global.authenticated) {
            $rootScope.global.authenticated = true;
            $rootScope.global.user = window.user;
        }

        $rootScope.global.hasRole = function (role) {
            return $rootScope.global.authenticated && ($rootScope.global.user.roles.indexOf(role) > -1 || $rootScope.global.user.roles.indexOf('admin') > -1);
        };

        $rootScope.$on('loggedin', function (event, val) {
            window.user = val;
            $rootScope.global.authenticated = !!val;
            $rootScope.global.user = val;
        });
}]);

'use strict';

angular.module('music-player.listen')

.controller('PlayerCtrl', ['$scope', '$state', 'PlayerService', 'audio',
    function ($scope, $state, PlayerService, audio) {

        $scope.player = PlayerService;
        $scope.audio = audio;
        $scope.isPaused = function () {
            return PlayerService.paused;
        };

        $scope.play = PlayerService.play;
        $scope.pause = PlayerService.pause;
        $scope.previous = PlayerService.previous;
        $scope.next = PlayerService.next;
}])

.controller('NavigationCtrl', ['$scope',
    function ($scope) {
        $scope.kinds = {
            techno: {
                name: 'Electro'
            },
            house: {
                name: 'House'
            },
            drone: {
                name: 'Funk'
            },
            ambient: {
                name: 'Ambient'
            },
        };
}])

.controller('ScrubberCtrl', ['$scope', 'audio',
    function ($scope, audio) {
        $scope.currentTimeMS = 0;
        $scope.durationMS = 0;

        function updateView() {
            $scope.$apply(function () {
                $scope.currentBufferPercentage = ((audio.buffered.length && audio.buffered.end(0)) / audio.duration) * 100;
                $scope.currentTimePercentage = (audio.currentTime / audio.duration) * 100;
                $scope.currentTimeMS = (audio.currentTime * 1000).toFixed();
                $scope.durationMS = (audio.duration * 1000).toFixed();
            });
        }
        audio.addEventListener('timeupdate', updateView, false);
        $scope.seekTo = function ($event) {
            var xpos = $event.offsetX / $event.target.offsetWidth;
            audio.currentTime = (xpos * audio.duration);
        };
}])

.controller('KindCtrl', ['$scope', '$filter', '$state', '$stateParams', 'paginate', 'currentResource', 'PlayerService', 'TrackQuery',
    function ($scope, $filter, $state, $stateParams, paginate, currentResource, PlayerService, TrackQuery) {

        var _tracklistInfo = {
            lastQuery: false,
            tracks: []
        };

        var freshTracklistInfo = function () {
                var info = {
                    lastQuery: false,
                    tracks: []
                };

                if (typeof $stateParams.kind !== 'undefined') {
                    info.kind = $stateParams.kind;
                }

                return info;
            },

            // Track fetching management
            tracksHandler = function (tracks) {
                if (tracks.length > 0) {
                    for (var i = 0; i < tracks.length; i++) {
                        tracks[i].linkId = $state.href('listen.kind_track', {
                            kind: tracks[i].kind.slug,
                            track: tracks[i].trackId
                        });
                        _tracklistInfo.tracks.push(tracks[i]);
                    }
                }

                filterTracks();
            },

            filterTracks = function () {
                $scope.filteredTracks = _tracklistInfo.tracks;
            },

            resetPage = function () {
                _tracklistInfo.tracks = [];

                //$scope.page = paginate(function (skip, limit) {
                //    var params = {
                //        skip: skip,
                //        limit: limit,
                //        q: $scope.query
                //    };
                //
                //    if (_tracklistInfo.kind) {
                //        params.kind = _tracklistInfo.kind;
                //    }
                //
                //    TrackQuery.query(params, tracksHandler);
                //});
                TrackQuery.query({}, tracksHandler);
            };

        currentResource('tracklistInfo').get(freshTracklistInfo).then(function (info) {

            // Don't update tracklist if we clicked a track (URL changes, but we don't change display)
            if (info.keepInfo) {
                delete info.keepInfo;
                _tracklistInfo = info;
            } else {
                _tracklistInfo = freshTracklistInfo();
                currentResource('tracklistInfo').set(_tracklistInfo);
            }

            resetPage();
        });

        //$scope.$watch('query', function (qry) {
        //    if (qry !== undefined) {
        //        resetPage();
        //    }
        //});

        $scope.query = $stateParams.query;
        $scope.loadNextTracks = function () {
            return $scope.page.next();
        };
}])

.controller('KindNewCtrl', ['$scope', '$state', 'slugify', 'Kind',
    function ($scope, $state, slugify, Kind) {
        $scope.kind = new Kind();

        $scope.sumbit = function () {
            $scope.kind.slug = slugify($scope.kind.title);
            $scope.kind.$save().then(function () {
                $state.go('listen.track-create-continue');
            });
        };
}])

.controller('TrackEditCtrl', ['$scope', '$window', '$state', '$stateParams', '$q', 'fileUpload', 'currentResource', 'slugify', 'Kind', 'Track', 'trackEditScopeWatcher',

    function ($scope, $window, $state, $stateParams, $q, fileUpload, currentResource, slugify, Kind, Track, trackEditScopeWatcher) {

        if (!$state.current.data || !$state.current.data.keepData) {
            currentResource('track').unset();
        }

        function handleUploads(savedTrack) {
            var deferred = $q.defer(),
                promise = deferred.promise;

            if ($scope.files.artwork) {
                promise.then(function () {
                    return fileUpload('upload/artwork/' + savedTrack._id, {
                        artwork: $scope.files.artwork
                    });
                });
            }

            if ($scope.files.track) {
                promise.then(function () {
                    return fileUpload('upload/track/' + savedTrack._id, {
                        track: $scope.files.track
                    });
                });
            }

            promise.then(function (mostUpToDateTrack) {
                $scope.track = mostUpToDateTrack;
            });

            deferred.resolve(savedTrack);
            return promise;
        }

        $scope.newTrack = typeof $stateParams.track === 'undefined';
        $scope.files = {};

        $scope.submit = function () {

            $scope.track.slug = slugify($scope.track.title);

            if ($scope.newTrack) {
                $scope.track.$save()
                    .then(handleUploads)
                    .then(function () {
                        currentResource('track').unset();
                        return currentResource('track').get(function () {
                            var track = new Track();
                            track.date = new Date();
                            return track;
                        }).then(function (data) {
                            $scope.track = data;
                        });
                    });
            } else {
                $scope.track.$update()
                    .then(handleUploads)
                    .then(function () {
                        currentResource('track').unset();
                        $state.go('listen.kind', {
                            kind: $scope.track.slug
                        });
                    });
            }
        };

        $scope.delete = function () {
            if ($window.confirm('You are about to delete this track, OK?')) {
                var trackKind = $scope.track.kind;

                $scope.track.$delete().then(function () {
                    currentResource('track').unset();
                    $state.go('listen.kind', {
                        kind: trackKind.slug
                    });
                });
            }
        };

        trackEditScopeWatcher($scope);

        return $q.all(
            currentResource('track').get(function () {
                var track;

                if ($scope.newTrack) {
                    track = new Track();
                    track.date = new Date();
                    return track;
                } else {
                    track = Track.get({
                        trackId: $stateParams.track
                    });

                    return track.$promise.then(function () {
                        var parse = Date.parse(track.date);

                        if (!isNaN(parse)) {
                            track.date = new Date(parse);
                        }

                        return track;
                    });
                }
            }).then(function (data) {
                $scope.track = data;
                $scope.track.kind = $scope.kinds.length && $scope.kinds[0].slug;
            }),

            Kind.query(function (kinds) {
                $scope.kinds = kinds;
            })
        );
}])

.controller('SettingsCtrl',
    function () {

    });

'use strict';

angular.module('music-player.listen')

.config(['$stateProvider', '$anchorScrollProvider',
    function ($stateProvider, $anchorScrollProvider) {
        $anchorScrollProvider.disableAutoScrolling();

        $stateProvider
            .state('listen', {
                url: '/listen',
                templateUrl: 'listen/views/index.html',
                abstract: true
            })
            .state('listen.home', {
                url: '/home',
                templateUrl: 'listen/views/kind.html',
                controller: 'KindCtrl'
            })
            .state('listen.kind', {
                url: '/:kind',
                templateUrl: 'listen/views/kind.html',
                controller: 'KindCtrl'
            })
            .state('listen.kind_track', {
                url: '/:kind/t/:track',
                templateUrl: 'listen/views/kind.html',
                controller: 'KindCtrl'
            })
            .state('listen.kind_track_query', {
                url: '/:kind/t/:track/q/:query',
                templateUrl: 'listen/views/kind.html',
                controller: 'KindCtrl'
            })
            .state('listen.track-create', {
                url: '/track/create',
                templateUrl: 'listen/views/track-edit.html',
                controller: 'TrackEditCtrl'
            })
            .state('listen.track-create-continue', {
                url: '/track/create/continue',
                templateUrl: 'listen/views/track-edit.html',
                controller: 'TrackEditCtrl',
                data: {
                    keepData: true
                }
            })
            .state('listen.track-edit', {
                url: '/track/:track/edit',
                templateUrl: 'listen/views/track-edit.html',
                controller: 'TrackEditCtrl'
            })
            .state('listen.kind-create', {
                url: '/kind/create',
                templateUrl: 'listen/views/kind-edit.html',
                controller: 'KindNewCtrl'
            });
}]);

'use strict';

angular.module('music-player.listen')

.value('CLIENT_ID', '1c21814089b72a7cd4ce9246009ddcfb')

// Player
.factory('PlayerService', ['$rootScope', 'audio', 'storage', 'CLIENT_ID',
    function ($rootScope, audio, storage, CLIENT_ID) {
        var player,
            i;

        player = {
            tracks: undefined,
            playing: false,
            paused: true,
            stopped: true,

            play: function () {

                if (player.stopped || !player.paused) {
                    audio.src = player.playing.streamUrl + '?client_id=' + CLIENT_ID;
                }
                audio.play();
                player.paused = false;
                player.stopped = false;

                var playCount = storage.get('playCount');
                if (playCount === 1000) alert('holy fucking shit you\'ve listened to 1,000 microbeats you are awesome i will buy you a drink and give you lots of hugs');
                if (playCount === 2000) alert('2,000 plays you are awesome if we are not friends why are we not friends you are probably really rad');
                playCount = playCount + 1;
                storage.set('playCount', playCount);
            },

            pause: function () {
                if (!player.paused) {
                    audio.pause();
                    player.paused = true;
                }
            },
            stop: function () {
                player.pause();
                player.stopped = true;
            },
            next: function () {
                if (typeof i === 'number') {
                    if (i < player.tracks.length - 1) {
                        player.setTrack(player.tracks[i + 1]);
                        player.play();
                    } else {
                        player.stop();
                    }
                } else {
                    player.play();
                }
            },
            previous: function () {
                if (typeof i === 'number') {
                    if (i > 0) {
                        player.setTrack(player.tracks[i - 1]);
                        player.play();
                    }
                } else {
                    player.play();
                }
            },
            setTracks: function (tracks, track) {
                player.tracks = tracks;
                player.setTrack(track);
            },
            setTrack: function (track) {
                if (player.tracks.length === 0) {
                    return;
                }

                if (typeof track !== 'undefined') {

                    // Find track in playlist
                    for (i = 0; i < player.tracks.length && player.tracks[i].title !== track.title; i++);

                    if (i < player.tracks.length) {
                        player.playing = player.tracks[i];
                    } else {
                        i = -1;
                    }
                } else if (player.playing) {
                    return player.setTrack(player.playing);
                } else {
                    return player.setTrack(player.tracks[0]);
                }
            },
        };
        audio.addEventListener('ended', function () {
            $rootScope.$apply(player.next());
        }, false);
        return player;
}])

/**
 * The current resouce service stores a data being handled in some controller in order to fetch it back when needed
 */
.factory('currentResource', ['$q',
    function ($q) {
        var _resource = {};

        return function (id) {
            return {
                // If cb given, get the value from it if resource undefined
                get: function (cb) {
                    if (cb && typeof _resource[id] === 'undefined') {
                        return $q.when(cb()).then(function (data) {
                            _resource[id] = data;
                            return data;
                        });
                    }

                    return $q.when(_resource[id]);
                },
                set: function (track) {
                    _resource[id] = track;
                },
                unset: function () {
                    delete _resource[id];
                }
            };
        };
}])

/**
 * The paginator
 */
.factory('paginate', function () {
    var pageBase = 8,
        pageInterval = 4;
    var Paginate = function (cb) {
        this._index = pageBase;
        this._cb = cb;
        this._stop = false;
    };

    Paginate.prototype.next = function (cb) {
        if (!this._stop) {
            var fetched = (cb || this._cb)(this._index, pageInterval) === false;
            this._index += fetched || pageInterval;
            this._stop = typeof fetched === 'number' && fetched === 0;
        }
    };

    return function (cb) {
        cb(0, pageBase);
        return new Paginate(cb);
    };
})

.factory('Track', ['$resource',
    function ($resource) {
        return $resource('tracks/:trackId', {
            trackId: '@_id'
        }, {
            get: {
                interceptor: {
                    response: function (response) {
                        var data = response.data,
                            parse = Date.parse(data.date);

                        if (!isNaN(parse)) {
                            data.date = new Date(parse);
                        }

                        return response;
                    }
                }
            },
            update: {
                method: 'PUT'
            }
        });
}])

.factory('TrackQuery', ['$resource',
    function ($resource) {
        return $resource('tracks/k/:kind/search', {});
}])

.factory('Kind', ['$resource',
    function ($resource) {
        return $resource('kinds/:kindId', {
            kindId: '@_id'
        }, {
            update: {
                method: 'PUT'
            }
        });
}])

// Audio Factory
.factory('audio', ['$document',
    function ($document) {
        var audio = $document[0].createElement('audio');
        return audio;
}])

// Local Storage Factory
.factory('storage', function () {
    return {
        set: function (key, obj) {
            var string = JSON.stringify(obj);
            localStorage.setItem(key, string);
        },
        get: function (key) {
            var data = localStorage.getItem(key);
            var obj = JSON.parse(data);
            return obj;
        },
        clearAll: function () {
            localStorage.clear();
        }
    };
})

.factory('scrollToId', function () {
    return function (id) {
        var trackElement = document.getElementById(id),
            scrollable = document.getElementById('scroll_tracks');

        if (typeof trackElement !== 'undefined') {
            $(scrollable).animate({
                scrollTop: trackElement.offsetParent.offsetTop
            });
        }
    };
})

// SC URL change watcher. Empty fields are auto replaced by API fetched data
.factory('trackEditScopeWatcher', ['$http', 'CLIENT_ID',
    function ($http, CLIENT_ID) {
        return function (scope) {
            var apiFields = {
                title: 'title',
                streamUrl: 'stream_url',
                artworkUrl: 'artwork_url',
            };

            scope.$watch('track.soundcloudLink', function (newValue) {
                if (newValue && newValue.match(/^https?:\/\/[^\/]*soundcloud.com/)) {
                    $http.get('http://api.soundcloud.com/resolve.json?url=' + newValue + '&client_id=' + CLIENT_ID).success(function (data) {
                        for (var f in apiFields) {
                            if (!scope.track[f]) {
                                scope.track[f] = data[apiFields[f]];
                            }
                        }

                        if (!scope.track.artist) {
                            scope.track.artist = data.user.username;
                        }
                    });
                }
            });
        };
}])

.directive('whenScrolled', function () {
    return function (scope, elm, attr) {
        var raw = elm[0];

        elm.bind('scroll', function () {
            if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
                scope.$apply(attr.whenScrolled);
            }
        });
    };
})

.directive('mpTrack', function () {
    return {
        restrict: 'E',
        templateUrl: 'listen/views/track.html',
        scope: {
            trackList: '=',
            track: '=',
            query: '@',
        },
        controller: ['$scope', '$rootScope', 'PlayerService', 'currentResource',
            function ($scope, $rootScope, PlayerService, currentResource) {
                $scope.global = $rootScope.global;
                $scope.clickTrack = function (trackObj) {
                    PlayerService.setTracks($scope.trackList, trackObj);
                    PlayerService.play();

                    return currentResource('tracklistInfo').get().then(function (info) {
                        info.keepInfo = true;
                    });
                };
        }]
    };
})

.directive('mpMusicPlayer', function () {
    return {
        restrict: 'E',
        templateUrl: 'listen/views/player.html',
        scope: {},
        controller: 'PlayerCtrl'
    };
})

.filter('playTime', function () {
    return function (ms) {
        var hours = Math.floor(ms / 36e5),
            mins = '0' + Math.floor((ms % 36e5) / 6e4),
            secs = '0' + Math.floor((ms % 6e4) / 1000);
        mins = mins.substr(mins.length - 2);
        secs = secs.substr(secs.length - 2);
        if (hours) {
            return hours + ':' + mins + ':' + secs;
        } else {
            return mins + ':' + secs;
        }
    };
})

.filter('dateSimple', function () {
    return function (dateString) {
        return moment(new Date(dateString)).format('LL');
    };
});

'use strict';


angular.module('music-player.listen')

    .factory('MusicPlayerResourceMockFactory', ['$q', function ($q) {
        return function(StoreMock) {
            function MusicPlayerResourceMock(pojso) {
                for (var k in pojso) {
                    this[k] = pojso[k];
                }

                // Initialize requested objects (associations))
                for (var i = 1; i < arguments.length; i++) {
                    this[arguments[i]] = {};
                }
            }

            MusicPlayerResourceMock.prototype.$save = function() {
                if (this._id)
                    throw Error('Resource already saved');

                StoreMock.put(this);

                var defer = $q.defer();
                defer.resolve();
                return defer.promise;
            };

            MusicPlayerResourceMock.prototype.$update = function() {
                if (!this._id)
                    throw Error('Resource not in the store');

                // Do nothing, actually we don't care :)

                var defer = $q.defer();
                defer.resolve();
                return defer.promise;
            };

            MusicPlayerResourceMock.prototype.$delete = function() {
                if (!this._id)
                    throw Error('Resource not in the store');

                StoreMock.del(this);

                var defer = $q.defer();
                defer.resolve();
                return defer.promise;
            };

            MusicPlayerResourceMock.get = function (params) {
                var obj;

                StoreMock.get(params, function (fetchedObj) {
                    // Here is not async actually
                    obj = fetchedObj;

                    var defer = $q.defer();
                    obj.$promise = defer.promise;
                    defer.resolve();
                });

                return obj;
            };

            MusicPlayerResourceMock.query = function (params, cb) {
                if (arguments.length === 1) {
                    cb = params;
                    params = null;
                }
                StoreMock.list(cb);
            };

            return MusicPlayerResourceMock;
        };
    }])

    .factory('StoreMock', [function () {
        return function(objIdKey) {
            var objs = null, idGenerator = 1, waitingCbs = [];
            var excludedToSave = ['_id', '$$hashKey', 'object'];

            function printJson() {
                try {
                    var objsCopy = [];

                    objs.forEach(function(obj) {
                        var objCopy = {}, prop;

                        for (prop in obj) {
                            if (excludedToSave.indexOf(prop) < 0) {
                                objCopy[prop] = obj[prop];
                            }
                        }

                        objsCopy.push(objCopy);
                    });

                    console.log(JSON.stringify(objsCopy, null, '  '));
                } catch (e) {
                    console.error('Got error while printing JSON', e);
                }
            }

            return {

                get: function(params, cb) {
                    for (var i = 0; i < objs.length; i++)
                        if (objs[i]._id === params[objIdKey]) return cb(objs[i]);

                    // Not found
                    cb();
                },

                list: function (cb) {
                    if (objs === null)
                        waitingCbs.push(cb);
                    else
                        cb(objs);
                },

                put: function(obj, cb) {
                    obj._id = String(idGenerator++);
                    obj[objIdKey] = obj._id;

                    if (!objs) objs = [];
                    objs.unshift(obj);

                    printJson();
                    if (typeof cb === 'function') cb();
                },

                del: function(obj, cb) {
                    for (var i = 0; i < objs.length; i++)
                        if (objs[i]._id === obj._id) {
                            objs.splice(i, 1);
                            printJson();
                            if (typeof cb === 'function') cb();
                            return;
                        }

                    // Not found
                    if (typeof cb === 'function') cb(Errror('not found'));
                },

                resolve: function() {
                    waitingCbs.forEach(function (cb) {
                        cb(objs);
                    });
                    if (!objs) objs = [];
                    waitingCbs = null;
                }
            };
        };
    }])

    .factory('TrackStoreMock', ['StoreMock',
        function (StoreMock) {
            return StoreMock('trackId');
    }])

    .factory('KindStoreMock', ['StoreMock',
        function (StoreMock) {
            return StoreMock('kindId');
    }])

    .factory('Kind', ['MusicPlayerResourceMockFactory', 'KindStoreMock',
        function (MusicPlayerResourceMockFactory, KindStoreMock) {
            return MusicPlayerResourceMockFactory(KindStoreMock);
        }])

    .factory('Track', ['MusicPlayerResourceMockFactory', 'TrackStoreMock',
        function (MusicPlayerResourceMockFactory, TrackStoreMock) {
            return MusicPlayerResourceMockFactory(TrackStoreMock, 'kind');
        }])

    .factory('TrackQuery', ['TrackStoreMock', function (TrackStoreMock) {
        return {
            query: function (params, cb) {
                console.log('Fetching all tracks');
                TrackStoreMock.list(cb);
            }
        }
    }])

    .factory('slugify', [function () {
        return function(title) {
            return title.toLowerCase()
                .replace(/ /g, '-')
                .replace(/-+/g, '-')
                .replace(/[^\w-]/g, '');
        };
    }])

    .run(['$http', 'slugify', 'Track', 'Kind', 'TrackStoreMock', 'KindStoreMock',
        function ($http, slugify, Track, Kind, TrackStoreMock, KindStoreMock) {
            var kinds = {};

            $http
                .get('static-tracks.json')
                .success(function(tracksData) {
                    tracksData.forEach(function(rawTrack) {
                        var track = new Track(rawTrack);
                        track.date = new Date(rawTrack.date);
                        track.$save();

                        if (!kinds[track.kind]) {
                            var kind = new Kind({
                                title: track.kind
                            });

                            kinds[track.kind] = kind;

                            kind.slug = slugify(kind.title);

                            kind.$save();
                        }
                    });

                    console.log('Resolved');
                    TrackStoreMock.resolve();
                    KindStoreMock.resolve();
                });
    }])

    .filter('dateSimple', function () {
        return function (date) {
            return moment(date).format('LL');
        };
    });

'use strict';

angular.module('music-player.system').controller('HeaderController', ['$scope', '$rootScope', 'Global', 'Menus',
    function($scope, $rootScope, Global, Menus) {
        $scope.global = Global;
        $scope.menus = {};

        // Default hard coded menu items for main menu
        var defaultMainMenu = [{
            'roles': ['authenticated'],
            'title': 'Articles',
            'link': 'all articles'
        }, {
            'roles': ['authenticated'],
            'title': 'Create New Article',
            'link': 'create article'
        }];

        // Query menus added by modules. Only returns menus that user is allowed to see.
        function queryMenu(name, defaultMenu) {

            Menus.query({
                name: name,
                defaultMenu: defaultMenu
            }, function(menu) {
                $scope.menus[name] = menu;
            });
        }

        // Query server for menus and check permissions
        queryMenu('main', defaultMainMenu);

        $scope.isCollapsed = false;

        $rootScope.$on('loggedin', function() {

            queryMenu('main', defaultMainMenu);

            $scope.global = {
                authenticated: !! $rootScope.user,
                user: $rootScope.user
            };
        });

    }
]);

'use strict';


'use strict';

//Global service for global variables
angular.module('music-player.system')

.factory('Global', [

    function () {
        var _this = this;
        _this._data = {
            user: window.user,
            authenticated: !!window.user
        };
        return _this._data;
    }
])

.factory('fileUpload', ['$http',
    function ($http) {
        return function (uploadUrl, files, data) {
            var fd = new FormData();

            if (data) {
                for (var d in data) {
                    fd.append(d, data[d]);
                }
            }

            if (files) {
                for (var f in files) {
                    fd.append(f, files[f]);
                }
            }

            return $http.post(uploadUrl, fd, {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined
                }
            });
        };
    }
])

.directive('fileModel', ['$parse',
    function ($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var model = $parse(attrs.fileModel);
                var modelSetter = model.assign;

                element.bind('change', function () {
                    scope.$apply(function () {
                        modelSetter(scope, element[0].files[0]);
                    });
                });
            }
        };
    }
]);

'use strict';

angular.module('mean-factory-interceptor',[])
    .factory('httpInterceptor', ['$q','$location',function ($q,$location) {
        return {
            'response': function(response) {
                if (response.status === 401) {
                    $location.path('/login');
                    return $q.reject(response);
                }
                return response || $q.when(response);
            },

            'responseError': function(rejection) {

                if (rejection.status === 401) {
                    $location.url('/login');
                    return $q.reject(rejection);
                }
                return $q.reject(rejection);
            }

        };
    }
    ])
//Http Intercpetor to check auth failures for xhr requests
    .config(['$httpProvider',function($httpProvider) {
        $httpProvider.interceptors.push('httpInterceptor');
    }]);
'use strict';

angular.module('music-player.system').factory('Menus', ['$resource', function($resource) {
    return $resource('admin/menu/:name', {
        name: '@name',
        defaultMenu: '@defaultMenu'
    });
}]);

'use strict';

//Setting up route
angular.module('music-player.system').config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {
            // For unmatched routes:
            $urlRouterProvider.otherwise('/listen/home');
        }
    ])
    .config(['$locationProvider',
        function($locationProvider) {
            $locationProvider.hashPrefix('!');
        }
    ]);
