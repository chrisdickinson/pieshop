var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('backends');
    var CompiledQuery = function(backend, data, resource_uri, resourceCallback) {
        this.backend = backend;
        this.data = data;
        this.resource_uri = resource_uri;
        this.resourceCallback = resourceCallback;
    };
    var dict_copy = function(x) { for(var i in x) { if (x.hasOwnProperty(i)) { this[i] = x[i]; } } };

    var TastyPieBackend = function () {};

    TastyPieBackend.prototype.build_resources = function(data, resource_type) {
        var objects = [];
        for(var i = 0, len = data.objects.length; i < len; ++i) {
            for(var field_name in data.objects[i]) if(data.objects[i].hasOwnProperty(field_name)) {
                var field = resource_type.prototype._meta.get_field_by_name(field_name);
                if(field) {
                    data.objects[i][field_name] = field.backendToJSValue(this, data.objects[i][field_name]);
                }
            }
            objects.push(new resource_type(data.objects[i]));
        }
        return objects;
    };

    TastyPieBackend.prototype.compile_delete = function(query) {
        var q = this.compile_get(query);
        return new CompiledQuery(this, q.values, q.resource_uri, function(callback) {
            return function(data) {
                callback(data);
            };
        });
    };

    TastyPieBackend.prototype.compile_put = function(query) {
        var values = {},
            resource_uri = query.instance ? query.instance.resource_uri : query.resource.prototype._meta.opts.resource_uri
;
        for(var name in query.resource.prototype._meta.fields) {
            var field = query.resource.prototype._meta.fields[name],
                val = field.jsToBackendValue(this, query._values[name]);
            values[name] = val;
            if((val === undefined || val === null) && !field.nullable) {
                throw new Error("Field "+name+" cannot be null!");
            }
        }
        return new CompiledQuery(this, JSON.stringify({'objects':[values]}), resource_uri, function (callback) {
            var backend = this.backend;
            return function(data) {
                var resources = backend.build_resources(data);
                callback(resources[0]);
            };        
        });
    };

    TastyPieBackend.prototype.compile_post = function(query) {
        var q = this.compile_get(query);
        return new CompiledQuery(this, q.data, q.resource_uri, function(callback) {
            return q.resourceCallback(function(objects) {
                var i = 0,
                    len = objects.length,
                    results = [],
                    recurse = function() {
                        if(i < len) {
                            try {
                                var curObj = objects[i++];
                                for(var name in query._values) if(query._values.hasOwnProperty(name)) {
                                    curObj[name] = query._values[name];
                                }
                                curObj.save(function(obj, err) {
                                    if(err) {
                                        callback(results, err);
                                    } else {
                                        results.push(obj);
                                        recurse();
                                    }
                                });
                            } catch(err) {
                                callback(results, err);
                            }
                        } else {
                            callback(results, err);
                        }
                    };
                recurse();
            }); 
        }); 
    };

    TastyPieBackend.prototype.compile_get = function(query) {
        var data = {
            'format':'json'
        }; 
        if(query._limit) {
            data.limit = query._limit;
        }
        if(query._offset) {
            data.offset = query._offset;
        }
        if(query._order_by) {
            if(query._order_by instanceof Array) {
                data.sort_by = query._order_by[0];      // only sort by the primary value.
            } else {
                data.sort_by = query._order_by;
            }
        }
        var resource_uri = query.resource.prototype._meta.opts.resource_uri;

        for(var i in query._filters) if(query._filters.hasOwnProperty(i)) {
            var split = i.split('__'),
                field_name = split[0],
                joins = split.slice(1, -1),
                last = split.slice(-1)[0],
                filter_type = last === field_name ? 'exact' : last,
                original_value = query._filters[i],
                field = query.resource.prototype._meta.get_field_by_name(i),
                value = original_value;

            if(field_name === 'pk') {
                if(filter_type === 'exact') {
                    resource_uri += value + '/'; 
                } else {
                    var resource_uri_split = resource_uri.split('/').slice(0,-1);
                    value = (value.length > 0 ? value : [value]).join(';');
                    resource_uri_split.push('set');
                    resource_uri_split.push(value);
                    resource_uri = resource_uri_split.join('/') + '/';
                }
            } else {
                if(field) {
                    value = field.getLookupValue(value, type, this);
                }
                data[i] = value;
            }
        }
        return new CompiledQuery(this, data, resource_uri, function(callback) {
            var backend = this.backend;
            return function(data) {
                var resources = backend.build_resources(data, query.resource);
                callback(resources);
            };
        });
    };

    var CharField = function(kwargs) {};
    CharField.prototype.jsToLocal = function(value) {
        return value;
    };
    CharField.prototype.localToJS = function(value) {
        return value;
    };
    CharField.prototype.getLookupValue = function(value, type) {
        return value;
    };
    var TextField = CharField;

    var AutoField = function(kwargs) {};
    AutoField.prototype.jsToLocal = function(value) {
        return parseInt(value, 10);
    };
    AutoField.prototype.localToJS = function(value) {
        return parseInt(value, 10);
    };
    AutoField.prototype.getLookupValue = function(value, type) {
        return parseInt(value, 10);
    };


    var IntegerField = function(kwargs) {};
    IntegerField.prototype.jsToLocal = function(value) {
        return parseInt(value, 10);
    };
    IntegerField.prototype.localToJS = function(value) {
        return parseInt(value, 10);
    };
    IntegerField.prototype.getLookupValue = function(value, type) {
        return parseInt(value, 10);
    };

    var DateTimeField = function(kwargs) {};
    DateTimeField.prototype.jsToLocal = function(value) {
        var pad = function(num) { 
            return num < 10 ? '0'+num : String(num);
        };
        return [value.getFullYear(), pad(value.getMonth()), pad(value.getDate())].join('-') + ' ' +
        [pad(value.getHours()), pad(value.getMinutes()), pad(value.getSeconds())].join(':'); 
    };

    DateTimeField.prototype.localToJS = function(value) {
        return new Date(Date.parse(value));
    };

    DateTimeField.prototype.getLookupValue = function(value, type) {
        return value;
    };

    TastyPieBackend.prototype.fields = {
        AutoField:AutoField,
        CharField:CharField,
        TextField:TextField,
        IntegerField:IntegerField,
        DateTimeField:DateTimeField
    };

    TastyPieBackend.prototype.compile = function(query) {
        return this['compile_'+query.method.toLowerCase()](query);
    };

    exporter('CompiledQuery', CompiledQuery);
    exporter('TastyPieBackend', new TastyPieBackend());
})(get_global_object('pieshop', exp));
