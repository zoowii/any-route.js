var any_route = require('./core');
var http_route = require('./http');
var route = any_route.route;
var context = any_route.context;
var defroutes = any_route.defroutes;
var urlFor = http_route.urlFor;
var GET = http_route.GET
    , POST = http_route.POST
    , ANY = http_route.ANY;

var a = '/a/:*b/:c';
console.log(any_route.getRouteParams(a));

var b = '/a/b/c/d';
var c = any_route.makeRoute(a);
console.log(c(b));

var testUrl = "/user/123/view/any-note/abc/def";
var testRoute = "/user/:id/view/:project/:*path";
console.log((any_route.makeRoute(testRoute))(testUrl));

// 建立路由表
var rtbl = any_route.makeRouteTable([route("/test/:id/update", "test_handler", "test"), context('/user', [
    route("/:id/view/:project/:*path", "view_user_handler", "view_user")
])]);
//console.log(rtbl, (findRouteInRouteTable(rtbl, 'view_user')));
// 进行路由匹配
console.log(any_route.routeTableMatch(rtbl, testUrl));

// 路由反转
console.log(any_route.reverseInRouteTable(rtbl, 'view_user', '433', "test-project", "github.com/zoowii"));

// http的test demo
var userHttpRoutes = [
    GET("/:id/view/:project/:*path", "view_user_handler", "view_user"),
    POST("/:id/view/:project/:*path", "update_user_handler", "update_user")
];

var httpRtbl = defroutes(
    GET("/test/:id/update", "test_handler", "test"),
    context("/user", userHttpRoutes)
);

console.log(http_route.findRouteInHttpRouteTable(httpRtbl, "update_user"));
console.log(http_route.findRoute(httpRtbl, 'GET', testUrl));
console.log(urlFor(httpRtbl, "update_user", "433", "test-project", "github.com/zoowii"));