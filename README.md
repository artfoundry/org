# org
Online version of the Jubal game

**Setup**

*Backend server Express setup:*

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

- Server runs on localhost:5000 and both serves client files and connects to Firebase

*Game setup*

- After starting Express backend server (above), go to /client/gamefiles and run:

```npm i```

- Run to start apache server (may need to set up apache user conf file, set DocumentRoot and Directory paths to /client/gamefiles in apache httpd.conf, 
and set User to [username] also in apache httpd.conf):

```sudo apachectl start```

- Server runs on localhost and connects to Express backend server.  Reloading server is unnecessary when making changes to src files.
