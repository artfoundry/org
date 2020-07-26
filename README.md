# org
Online version of the Jubal game

**Setup**

*Backend server Express setup (for game, not tools):*

- Go to /server and run 

```npm i```

- If needed, run this to set up scaffolding:

```express --view=pug org```

- Run this to start the Express server:

```DEBUG=org:* npm start```

- Alternatively, backend server can be run with node:

```node server```

- Server runs on localhost:4000 and connects to Firebase and client

*Tools setup*

- Go to /client/tools and run

```npm i```

- Run this to start Firebase server:

```firebase serve```

- In the event of an auth error after running this, run `$firebase login --reauth` and then run `$firebase serve` again

- Server runs on localhost:5000 and both serves client files and connects to Firebase

*Game setup*

- After starting Express backend server (above), go to /client/gamefiles and run:

```npm i```

- Run to start apache server (may need to set up apache user conf file, set DocumentRoot and Directory paths to /client/gamefiles in apache httpd.conf, 
and set User to [username] also in apache httpd.conf):

```sudo apachectl start```

- Server runs on localhost and connects to Express backend server.  Reloading server is unnecessary when making changes to src files.

*Apache Info*

Tutorial for setting up apache: https://medium.com/@JohnFoderaro/how-to-set-up-apache-in-macos-sierra-10-12-bca5a5dfffba

OSX Catalina security change needed: https://stackoverflow.com/questions/58455332/apache-gives-access-denied-on-macos-catalina