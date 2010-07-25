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
