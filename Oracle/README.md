# Oracle

Project-specific development tools:

__Teal__: [0.14.1](https://github.com/teal-language/tl), with its [Visual Studio Code extension (0.8.3)](https://marketplace.visualstudio.com/items?itemName=pdesaulniers.vscode-teal)

Server backend util, tested and working. All programs (except OS) and their dependencies are compiled from source.

__OS__: [Oracle Linux 7.8](https://cloud.oracle.com/) (2020-04-17)

__KeyDB__: [v6.2.0](https://docs.keydb.dev/), with [RediSearch v2.0.0](https://redis.io/docs/stack/search/)

__Node.js__: [v18.9.1](https://nodejs.org/)

__Apache HTTPD__: [Version 2.4.48](https://httpd.apache.org/), with [OpenSSL 1.1.1k](https://www.openssl.org/) and VirtualHost config below.

```
#
# Setup for eggonomics.net
#
<VirtualHost *:80>
  ServerName eggonomics.net
  ServerAlias www.eggonomics.net
  Redirect permanent "/" "https://eggonomics.net"
</VirtualHost>
<VirtualHost *:443>
  DocumentRoot "/httpd/egg/dist/site"
  ServerName eggonomics.net
  ServerAlias www.eggonomics.net
  <Location "/cmd">
    ProxyPass "http://localhost:39000/cmd"
    ProxyPassReverse "http://localhost:39000/cmd"
  </Location>
  <Location "/wss">
    ProxyPass "ws://localhost:39000"
    ProxyPassReverse "ws://localhost:39000"
  </Location>
  <Directory "/httpd/egg">
    AllowOverride None
    Require all granted
  </Directory>
  # Allow the solidus, i.e. for usernames
  AllowEncodedSlashes NoDecode
  <Directory "/httpd/egg/dist/site">
    AllowOverride None
    Options Indexes FollowSymLinks
    Require all granted
    # https://angular.io/guide/deployment#server-configuration
    # Don't redirect files / directories
    RewriteEngine on
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    # Redirect everything else to index.html
    # Don't encode special characters, i.e. for usernames
    RewriteRule ^ index.html [L,NE]
  </Directory>
  SSLEngine On
  SSLCertificateFile "/etc/letsencrypt/live/eggonomics.net/fullchain.pem"
  SSLCertificateKeyFile "/etc/letsencrypt/live/eggonomics.net/privkey.pem"
  Include "/etc/letsencrypt/options-ssl-apache.conf"
</VirtualHost>
```
