'use strict';

module.exports = {
    'all ^/(?!favicon|js/|styles/|images/).*$': ['noCache'],
    'post ^/(?!favicon|js/|styles/|images/).*$': ['bodyParser'],
    'all ^/(?!favicon|js/|styles/|images/|modern\\-browser/).*$': ['modernBrowser'],
};
