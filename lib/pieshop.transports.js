var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('transports');
    var jQueryAjaxTransport = function () {};
    jQueryAjaxTransport.prototype.perform = function(method, resource, compiled_query, callback) {
        var backends = global.require('pieshop.backends'),
            CompiledQuery = backends.CompiledQuery;
        if(!(compiled_query instanceof CompiledQuery)) {
            throw new Error("Transport.perform takes three arguments (Resource, CompiledQuery, callback)");
        }
        var data = compiled_query.data,
            backend = compiled_query.backend;
        jQuery.ajax({
            'url':compiled_query.resource_uri,
            'data':data,
            'type':method,
            'traditional':true,
            'dataType':'json',
            'success':function(incoming_data) {
                var resources = backend.build_resources(incoming_data, resource);
                callback(resources);
            }
        });
    };

    var nodeJsHttpClientTransport = function () {};
    nodeJsHttpClientTransport.prototype.perform = function(method, resource, compiled_query, callback) {
        var settings = global.require('pieshop.settings'),
            http = require('http'),
            querystring = require('querystring'),
            hostname = resource.prototype.hostname,
            hostport = resource.prototype.port ? resource.prototype.port : 80,
            client = http.createClient(hostport, hostname),
            data = querystring.stringify(compiled_query.data),
            uri = [compiled_query.resource_uri, data].join('?'),
            request = client.request(method, uri, {
                'host':hostname,
            });
        request.end();
        request.addListener('response', function (response) {
            response.setEncoding('utf8');
            response.addListener('data', function(chunk) {
                var resources = compiled_query.backend.build_resources(JSON.parse(chunk), resource);
                callback(resources);
            });
        }); 
    };

    exporter('jQueryAjaxTransport', new jQueryAjaxTransport());
    exporter('nodeJsHttpClientTransport', new nodeJsHttpClientTransport());
})(get_global_object('pieshop', exp));

