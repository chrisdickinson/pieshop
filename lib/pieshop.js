function documentNamespace(namespace) {
    return {
        'require':function(what) {
            var split = what.split('.'),
                retval = window;
            for(var i = 0, len = split.length; i < len; ++i) {
                retval = retval[split[i]];
            }
            return retval;
        },
        'getExporter':function(name) {
            if(!name) {
                return function(export_name, to_export) { 
                    window[namespace][export_name] = to_export;
                };
            }
            window[namespace][name] = (window[namespace][name] === undefined) ? {} : window[namespace][name];
            return function(export_name, to_export) {
                window[namespace][name][export_name] = to_export;
            };
        }
    };
}

function commonjsNamespace(exp) {
    exp.require = function(what) {
        return require(['./',what].join(''));
    };
    exp.getExporter = function(name) {
        var self = this;
        return function(export_name, to_export) {
            self[export_name] = to_export;
        };
    };
    return exp;
}

function get_global_object(namespace, exp) {
    if(exp) {
        return commonjsNamespace(exp);
    }

    if(window[namespace]) {
        return window[namespace];
    } else {
        window[namespace] = documentNamespace(namespace);
        return window[namespace];
    }
}
try {
    exports.get_global_object = get_global_object;
} catch(Error) {}


var get_global_object, exp=null;
try { 
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var registry = {},
        exporter = global.getExporter('settings');

    var set_addon = function(name, target) {
        registry[name] = target;
    };

    var get_addon = function(name) {
        var target_string = registry[name],
            target_file_and_object = target_string.split(':'),
            target_file = global.require(target_file_and_object[0]),
            target_object_parts = target_file_and_object[1] !== undefined ? target_file_and_object[1].split(':') : [],
            result = target_file;
        for(var i = 0, len = target_object_parts.length; i < len; ++i) {
            result = result[target_object_parts[i]];
        }
        return result;
    };

    exporter('get_addon', get_addon);
    exporter('set_addon', set_addon); 
})(get_global_object('pieshop', exp));


var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('backends');
    var CompiledQuery = function(backend, data, resource_uri) {
        this.backend = backend;
        this.data = data;
        this.resource_uri = resource_uri;
    };
    var dict_copy = function(x) { for(var i in x) { if (x.hasOwnProperty(i)) { this[i] = x[i]; } } };

    var TastyPieBackend = function () {};

    TastyPieBackend.prototype.build_resources = function(data, resource_type) {
        var objects = [];
        for(var i = 0, len = data.objects.length; i < len; ++i) {
            objects.push(new resource_type(data.objects[i]));
        }
        return objects;
    };

    TastyPieBackend.prototype.compile = function(query) {
        var data = {
            'format':'json',
        }; 
        if(query._limit) {
            data.limit = query._limit;
        }
        if(query._offset) {
            data.offset = query._offset;
        }
        var resource_uri = query.resource.prototype.resource_uri;

        dict_copy.call(data, query._filters);
        for(var i in query._filters) {
            if(query._filters.hasOwnProperty(i)) {
                if(i.split('__')[0] == 'pk') {
                    var item = query._filters[i],
                        resource_uri_split = resource_uri.split('/').slice(0,-1);
                    item = (item.length > 0 ? item : [item]).join(';');
                    resource_uri_split.push('set');
                    resource_uri_split.push(item);
                    resource_uri = resource_uri_split.join('/') + '/';
                    break;
                } else {
                    data[i] = query._filters[i];            
                }
            }
        }
        return new CompiledQuery(this, data, resource_uri);
    };

    exporter('CompiledQuery', CompiledQuery);
    exporter('TastyPieBackend', new TastyPieBackend());
})(get_global_object('pieshop', exp));


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


var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter(),
        settings = global.require('pieshop.settings');

    var dict_copy = function(params) {
        for(var i in params) {
            if(params.hasOwnProperty(i)) {
                this[i] = params[i];
            }
        }
    };

    var resource_factory = function(opts) {
        var ResourceProto = {},
            Resource = function (data) {
                dict_copy.call(this, data);
            };
        dict_copy.call(ResourceProto, opts);
        Resource.prototype = ResourceProto;
        return Resource;
    };

    var Query = function(Resource) {
        this.resource = Resource;
        this.method = 'GET';
        this.transport = arguments.length > 1 ? arguments[1] : settings.get_addon('transport');
        this.backend = arguments.length > 2 ? arguments[2] : settings.get_addon('backend');
    };

    Query.prototype = {
        'copy': function(params) {
            var new_query = new Query(this.resource);
            dict_copy.call(new_query, this);
            dict_copy.call(new_query, params);
            return new_query;
        },
        'limit': function(limit) {
            var copy = this.copy({'_limit': limit});
            return copy;
        },
        'offset': function(offset) {
            var copy = this.copy({'_offset': offset});
            return copy;
        },
        'filter': function(params) {
            var new_params = (this._filters) ? this._filters : {};
            dict_copy.call(new_params, params);
            return this.copy({'_filters':new_params});
        },
        // commenting this out until tests are written
        //'delete': function(callback) {
        //    this.method = 'DELETE'
        //    this.resource.prototype.backend.perform(this, callback);
        //},
        'all': function(callback) {
            var query = this.copy({
                    'method': 'GET'
                }),
                backend = this.resource.backend === undefined ? this.backend : this.resource.backend,
                transport = this.resource.transport === undefined ? this.transport : this.resource.transport,
                compiled_query = backend.compile(query);
            transport.perform(query.method, query.resource, compiled_query, callback);
        },
        'each': function(callback) {
            this.all(function(objects) {
                for (var i = 0, len = objects.length; i < len; ++i) {
                    callback.apply(objects[i], [objects[i]]);
                }
            });
        }
    };

    exporter('Query', Query);
    exporter('resource', resource_factory);
    exporter('query', function (Resource) { return new Query(Resource); });

    var settings = global.require('pieshop.settings');

    settings.set_addon('backend', 'pieshop.backends:TastyPieBackend');
    settings.set_addon('transport', 'pieshop.transports:jQueryAjaxTransport');
})(get_global_object('pieshop', exp));
