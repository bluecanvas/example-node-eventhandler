Simple event handler for Blue Canvas
====================================

This example shows how to run a simple event handler for the
[Blue Canvas Events API](https://docs.bluecanvas.io/reference/events-api).

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/bluecanvas/example-node-eventhandler)

Overview
--------

The application consists of two processes:

 - **`web`** — A [hapi] server that serves the frontend assets, accepts new
   notifications, starts background jobs, and reports on the status of existing
   jobs.
 - **`worker`** — A small node process that listens for and executes incoming
   jobs.

[hapi]: https://hapi.dev

