var _ = require('./underscore');

var reChars = "\\.*+|?()[]{}$^";

/**
 * Escape all special regex chars in a string
 * @param s
 */
function reEscape(s) {
    var result = '';
    for (var i = 0; i < s.length; ++i) {
        var c = s[i];
        if (reChars.indexOf(c) >= 0) {
            result += '\\' + c;
        } else {
            result += c;
        }
    }
    return result;
}

/**
 * 返回第一个非null/undefined/false的元素
 * @param col
 */
function firstNotEmpty(col) {
    if (!col) {
        return null;
    }
    for (var i = 0; i < col.length; ++i) {
        if (col[i]) {
            return col[i];
        }
    }
    return null;
}

var defaultSep = '/'; // 默认的分隔符

/**
 * TODO: cache
 * @param route
 * @returns {Array}
 */
function getRouteParams(route) {
    route = reEscape(route);
    var re = /((?!\\):(\\\*)?[a-zA-Z_][a-zA-Z_0-9]*)/g;
    var matches = [];
    var matched;
    while ((matched = re.exec(route)) != null) {
        matched = matched[0];
        if (matched.length > 3 && matched[0] === ':' && matched[1] === '\\' && matched[2] === '*') {
            matched = matched.substring(3);
        } else {
            matched = matched.substring(1);
        }
        matches.push(matched);
    }
    return matches;
}

function reMatches(re, source) {
    var matches = [];
    var matched;
    matched = re.exec(source);
    if (matched) {
        for (var i = 1; i < matched.length; ++i) {
            matches.push(matched[i]);
        }
    }
    return matches;
}

function reMatchesInGlobal(re, source) {
    var matches = [];
    var matched;
    while ((matched = re.exec(source)) != null) {
        matches.push(matched[0]);
    }
    return matches;
}

/**
 * 创建一个只有在route规则匹配时才会返回非假的函数(实际返回的应该是dest和params)
 * @param route
 */
function makeRoute(route) {
    var routeParams = getRouteParams(route);
    var sourceRoute = route;
    route = reEscape(route);
    route = route.replace(/(:[a-zA-Z_][a-zA-Z_0-9]*)/g, "([^" + defaultSep + "]+)");
    route = route.replace(/(:\\\*[a-zA-Z_][a-zA-Z_0-9]*)/g, "(.+)");
    route = "^" + route + "$";
    route = new RegExp(route);
    return function (source) {
        var matches = reMatches(route, source);
        if (matches && matches.length > 0) {
            var result = [];
            for (var i = 0; i < routeParams.length; ++i) {
                if (i < matches.length) {
                    result.push([routeParams[i], matches[i]]);
                }
            }
            return result;
        } else {
            if (routeParams.length < 1) {
                return sourceRoute === source ? [] : null;
            }
            return null;
        }
    }
}

/**
 * 创建一个用来构造反转路由的函数
 * @param route
 * @returns {*}
 */
function makeUnRoute(route) {
    var params = _.toArray(arguments);
    params.shift();
    var routeParams = getRouteParams(route);
    var routeParamPairs = [];
    for (var i = 0; i < routeParams.length; ++i) {
        if (i < params.length) {
            routeParamPairs.push([routeParams[i], params[i]]);
        } else {
            routeParamPairs.push([routeParams[i], '']);
        }
    }
    return _.reduce(routeParamPairs, function (route, pair) {
        return route.replace(new RegExp("(?!\\\\):(\\*)?" + pair[0], 'g'), pair[1]);
    }, route);
}

/**
 * 建立路由,route-str可能是一个字符串,也可能是一个context-route
 * @param routeStr
 * @param handler 不一定是函数,任何可以用来让使用者知道怎么处理路由结果的表示都可以
 * @returns {{name: *, route: *, extraInfo: *, handler: *}}
 */
function route(routeStr, handler) {
    var routeName;
    var extraInfo = null;
    if (arguments.length > 2) {
        routeName = arguments[2];
    } else {
        routeName = '__route__' + Math.random();
    }
    if (arguments.length > 3) {
        extraInfo = arguments[3];
    }
    return {
        name: routeName,
        route: routeStr,
        extraInfo: extraInfo,
        handler: handler
    };
}

/**
 * 嵌套路由
 * @param ctx
 * @param routes
 */
function contextRoute(ctx, routes) {
    return {
        context: ctx,
        routes: routes
    };
}

/**
 * 判断是否是嵌套路由
 * @param route
 * @returns {boolean}
 */
function isContextRoute(route) {
    return route.context ? true : false;
}

/**
 * 建立路由表,这个时候根据路由定义,还有context建立正则
 * @param routes
 * @returns {*}
 */
function makeRouteTable(routes) {
    var context = '';
    if (arguments.length > 1) {
        context = arguments[1];
    }
    return _.map(routes, function (route) {
        if (isContextRoute(route)) {
            return _.extend({}, route, {
                routes: makeRouteTable(route.routes, context + route.context)
            });
        } else {
            var routeStr = (route.extraInfo ? route.extraInfo : '') + context + route.route;
            return _.extend({}, route, {
                route: routeStr,
                routeFn: makeRoute(routeStr),
                routeParams: getRouteParams(routeStr)
            });
        }
    });
}

/**
 * 在一个路由表中找到映射
 * @param routeTable
 * @param source
 * @returns {*}
 */
function routeTableMatch(routeTable, source) {
    return firstNotEmpty(_.map(routeTable, function (route) {
        if (isContextRoute(route)) {
            return routeTableMatch(route.routes, source);
        } else {
            var routeFn = route.routeFn;
            if (!routeFn) {
                return null;
            }
            var routeBinding = routeFn(source);
            if (!routeBinding) {
                return null;
            }
            return _.extend({}, route, {
                binding: routeBinding
            });
        }
    }));
}

/**
 * 在路由表中根据名字找到路由, 如果路由在context中,则补全完整的路由
 * @param routeTable
 * @param name
 * @returns {*}
 */
function findRouteInRouteTable(routeTable, name) {
    return firstNotEmpty(_.map(routeTable, function (route) {
        if (isContextRoute(route)) {
            return findRouteInRouteTable(route.routes, name);
        } else {
            return route.name === name && route; // return route
        }
    }));
}

function reverseInRouteTableUsingFn(routeTable, name, findFn) {
    var params = _.toArray(arguments);
    params.shift();
    params.shift();
    params.shift();
    var route = findFn(routeTable, name);
    if (!route) {
        return null;
    }
    params.unshift(route.route);
    return makeUnRoute.apply(this, params);
}

function reverseInRouteTable(routeTable, name) {
    var params = _.toArray(arguments);
    params.shift();
    params.shift();
    var args = _.clone(params);
    _.each([findRouteInRouteTable, name, routeTable], function (ele) {
        args.unshift(ele);
    });
    return reverseInRouteTableUsingFn.apply(this, args);
}

/**
 * 方便的路由反转
 * @param routeTable
 * @param routeName
 * @param params
 */
var urlFor = reverseInRouteTable;

function defroutes() {
    return makeRouteTable(_.toArray(arguments));
}

exports.firstNotEmpty = firstNotEmpty;
exports.getRouteParams = getRouteParams;
exports.route = route;
exports.makeRoute = makeRoute;
exports.makeRouteTable = makeRouteTable;
exports.defroutes = defroutes;
exports.routeTableMatch = routeTableMatch;
exports.contextRoute = contextRoute;
exports.context = contextRoute;
exports.urlFor = urlFor;
exports.reverseInRouteTable = reverseInRouteTable;
exports.reverseInRouteTableUsingFn = reverseInRouteTableUsingFn;
exports.findRouteInRouteTable = findRouteInRouteTable;
