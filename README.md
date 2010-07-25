pieshop
=======

pieshop is a Javascript client for RESTful APIs. It is being developed as a
client for [django-tastypie](http://github.com/toastdriven/django-tastypie).

Python dependencies (for running tests)

-   django
-   django-tastypie
-   mimeparse
-   django-qunit

features
========

-   callback-driven chainable query interface inspired by Django's ORM
-   resource objects (aka "models")
-   filtering
-   limit/offset

goals
=====

The primary goal is to develop a complete Javascript abstraction of the django-tastypie RESTful API. Other goals include:

-   pluggable backends (more than just django-tastypie)
-   support for HTTP methods GET, POST, PUT, and DELETE.
-   validation/error handling
-   more delicious pie-themed goodness

Example usage
=============

    Person = pieshop.resource({
        'resource_uri': 'http://mysite.com/api/person/',
        'get_full_name': function(person) {
            return person.first_name + person.last_name;
        }
    });

    pieshop.query(Person).limit(10).offset(10).filter({'sex': 'female'}).each(function(person) {
        console.log(person);
        console.log(person.get_full_name());
    });

testing
=======
You should probably have a working copy of (node.js)[http://nodejs.org/], (npm)[http://github.com/isaacs/npm],
and (jsmin)[http://www.crockford.com/javascript/jsmin.html].

    git clone http://github.com/codysoyland/pieshop.git
    cd pieshop
    npm install .
    pieshop-compile | jsmin > pieshoptests/js/pieshop.min.js # with jsmin installed
    # pieshop-compile > pieshoptests/js/pieshop.min.js # without jsmin
    virtualenv testenv
    pip install -E testenv -r testing-requirements.txt
    source testenv/bin/activate
    pieshoptests/manage.py syncdb --noinput
    pieshoptests/manage.py runserver
    open "http://localhost:8000/"

license
=======

Copyright (c) 2010 Cody Soyland

Released under new-style BSD license
