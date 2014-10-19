var core = require('./core');
var _ = require('./underscore');

function strHttpMethod(method) {
    return method.toLowerCase();
}

function rmHttpMethodPrefix(s) {
    var idx = s.indexOf('_');
    if (idx >= 0) {
        return s.substring(idx + 1);
    } else {
        return s;
    }
}

var httpMethods = ['get', 'post', 'put', 'delete', 'head', 'option'];

/**
 * 建立http的route表. 如果method使用:ANY,则映射到所有已知http method
 * @param method
 * @param routeStr
 * @param handler
 * @returns {*}
 */
function httpRoute(method, routeStr, handler) {
    var routeName;
    if (arguments.length > 3 && arguments[3]) {
        routeName = arguments[3];
    } else {
        routeName = '__route__' + Math.random();
    }
    if ('any' === strHttpMethod(method)) {
        return core.contextRoute('', _.map(httpMethods, function (method) {
            return httpRoute(method, routeStr, handler, routeName);
        }));
    } else {
        var rstr = strHttpMethod(method) + '_' + routeName;
        return core.route(routeStr, handler, rstr, strHttpMethod(method) + '_');
    }
}

/**
 * @param routeTable
 * @param method
 * @param source
 * @returns {*}
 */
function httpRouteTableMatch(routeTable, method, source) {
    var findResult = core.routeTableMatch(routeTable, strHttpMethod(method) + '_' + source);
    if (!findResult) {
        return null;
    }
    return _.extend({}, findResult, {
        name: rmHttpMethodPrefix(findResult.name),
        route: rmHttpMethodPrefix(findResult.route),
        method: method,
        source: source
    });
}

function findRouteInHttpRouteTable(routeTable, name) {
    return core.firstNotEmpty(_.map(httpMethods, function (method) {
        var mname = strHttpMethod(method) + '_' + name;
        return core.findRouteInRouteTable(routeTable, mname);
    }));
}

/**
 * 获取Http的路由表的路由反射
 * @param routeTable
 * @param name
 */
function reverseInHttpRouteTable(routeTable, name) {
    var params = _.toArray(arguments);
    params.shift();
    params.shift();
    var args = [routeTable, name, findRouteInHttpRouteTable];
    Array.prototype.push.apply(args, params);
    var reverseResult = core.reverseInRouteTableUsingFn.apply(this, args);
    if (!reverseResult) {
        return null;
    }
    return rmHttpMethodPrefix(reverseResult);
}

function quickHttpMethodRoute(method, pattern, handler) {
    var args = _.toArray(arguments);
    args.shift();
    args.unshift(strHttpMethod(method));
    return httpRoute.apply(this, args);
}

function quickHttpMethodRouteGenerator(method) {
    return function () {
        var args = _.toArray(arguments);
        args.unshift(method);
        return quickHttpMethodRoute.apply(this, args);
    }
}

var GET = quickHttpMethodRouteGenerator('get');
var POST = quickHttpMethodRouteGenerator('post');
var PUT = quickHttpMethodRouteGenerator('put');
var DELETE = quickHttpMethodRouteGenerator('delete');
var HEAD = quickHttpMethodRouteGenerator('head');
var OPTION = quickHttpMethodRouteGenerator('option');
var ANY = quickHttpMethodRouteGenerator('any');

/**
 * 方便的路由反转
 * @param routeTable
 * @param routeName
 * @param params
 */
var urlFor = reverseInHttpRouteTable;

var findRoute = httpRouteTableMatch;

exports.urlFor = urlFor;
exports.urlForHttp = urlFor;
exports.findRoute = findRoute;
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
exports.HEAD = HEAD;
exports.OPTION = OPTION;
exports.ANY = ANY;
exports.httpRoute = httpRoute;
exports.reverseInHttpRouteTable = reverseInHttpRouteTable;
exports.findRouteInHttpRouteTable = findRouteInHttpRouteTable;
