var get_global_object, exp=null;
try {
    exp = exports;
    get_global_object = require('./namespace').get_global_object;
} catch(Error) {}

(function (global) {
    var exporter = global.getExporter('fields');

    var PrepValue = function(value, clean_function) {
        this.value = value;
        this.clean_function = clean_function;
    };
    PrepValue.prototype.modify = function (callback) {
        return new PrepValue(callback(this.value), this.clean_function);
    };

    PrepValue.prototype.clean = function () {
        return this.clean_function(this.value);
    };

    var Field = function (kwargs) {
        if(kwargs) {
            this.nullable = kwargs.nullable;
            this.blank = kwargs.blank;
        }
    };

    var PositiveIntegerField = function(kwargs) {
        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                return parseInt(value);
            });  
        };
        Field.apply(this, [kwargs]);
    };
    PositiveIntegerField.prototype = new Field();
    PositiveIntegerField.prototype.constructor = PositiveIntegerField;

    var CharField = function (kwargs) {
        this.max_length = kwargs.max_length;
        this.getPrepLookup = function(value, type) {
            return new PrepValue(value, function(value) {
                return "'"+value+"'";
            });
        };
        Field.apply(this, [kwargs]);
    };
    CharField.prototype = new Field();
    CharField.prototype.constructor = CharField;

    exporter('Field', Field);
    exporter('PositiveIntegerField', PositiveIntegerField);
    exporter('CharField', CharField);
})(get_global_object('pieshop', exp));
