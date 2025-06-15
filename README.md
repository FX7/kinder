# K-inder

K-inder gives you the ability to "swipe" through your kodi database with your friends and find your movie match.

## Requirements

For now there are some assumptions for this to work:

* Working docker / podman installation.
* Kodi API is accessable.
* pull docker image via `docker pull docker.io/effex7/kinder:latest`

## Settings

The following environment variables **must** to be set before start:

* KT_KODI_USERNAME : Username to access your Kodi API.
* KT_KODI_PASSWORD : Password to access your Kodi API.
* KT_KODI_HOST : Host of your Kodi instance. eg: 192.168.0.100

The following environment variables **may** be set before start:

* KT_KODI_PORT : Port of your Kodi instance. Usually 8080
* KT_SMB_USER : Username to access your samba share.
* KT_SMB_PASSWORD : Password to access your samba share.

There are more settings, but they are just interesting for development. Take a look at the [Dockerfile](./Dockerfile) for a complete list.

## Quickstart your voting session

### Docker CLI

Run (and pull) the docker image with:

`docker run -it --rm -e KT_KODI_USERNAME=kodi -e KT_KODI_PASSWORD=kodi -e KT_KODI_HOST=192.168.0.100 -e KT_SMB_USER=movies -e KT_SMB_PASSWORD=movies -p 5000:5000 docker.io/effex7/kinder:latest`

(after changing all environment variables to fit your setup!)

### Compose file

Alternativly you can use the [docker-compose example file](./docker-compose-example.yml), edit it, to fit your setup, rename it to docker-compose.yml and start it via

`docker-compose up`

### Open Browser

Start a browser (for example on your mobile) and open http://ip:5000 where ip is the ip of the computer you starter K-inder on.

Enter a name for you and your session.

Now your movies will be presented to you (and everyone else who joined the same session) and you can vote yes (click/touch right) or no (click/touch left).

In the upper left corner you can access the actual top / flop 3 (movies with most pros and movies with most cons).

Thats it.

## More detailed start

Like for all docker images, you can also create a docker-compose.yml to keep your starting command shorter. (You can use the [example](./docker-compose-example.yml) for starter) Or create a .env file with your environment settings and pass it like:

`docker run -it --rm --env-file=.env -p 5000:5000 docker.io/effex7/kinder:latest`

If you want to keep your session, you need to map a data folder into the container. E.g. `-v ./data:/data`

In this example you have to make sure, that the *data* folder exists in your hosts current directory.

Its also possible to keep the log file There for you have to map a log foler into the container. E.g. `-v ./log:/log`

In this example you have to make sure, that the *log* folder exists in your hosts current directory.

All fetched poster images can also be kepped / restored over sessions (server starts). Therefore you have to map a cache folder into the container. E.g. `-v ./cache:/cache`

In this example you have to make sure, that the *cache* folder exists in your hosts current directory.
Of course this way its also possible to manipulate the posters for each movie ;-)

As mentioned above, there are also some more environment variables, for example you can set` KT_SERVER_SWAGGER=True` to access the REST API directly under http://ip:5000/apidocs/ where ip is the ip of the computer you started K-inder on. Or set `KT_LOG_LEVEL='DEBUG'` to get a more detailed log output.

Put all this together and you would result in a docker call like:

`docker run -it --rm --env-file=.env -v ./data:/data -v ./log:/log -v ./cache:/cache -p 5000:5000 docker.io/effex7/kinder:latest`

### More details about image fetching

I would like to make this application "as offline as possible". There fore I prefere fetching images from local filesystem. To receive the images from the local filesystem your movie database must be exportet into single files per movie and the movies schould be accessable for kodi via a samba share.

For me this is the way to go, but I can see, that there are many setups without samba shares or exported movie database. Therefore I try to fetch the images from many different sources. If you like to change the prefered order of fetching images you can do this by changing the order by setting the environment variable `KT_IMAGE_PREFERENCE` to something you like. Or even leave out the ways you dont want to try.

### More details about what to display as overlay

Maybe you want to see the poster only? Or would like to see the viewd state? There are some overlays that can be enabled or disabled. For now these are:

* KT_OVERLAY_TITLE : display the title of the movie
* KT_OVERLAY_DURATION : display the duration of the movie
* KT_OVERLAY_GENRES : display the genres of the movie
* KT_OVERLAY_WATCHED : display it the movie was already watched (viewcount > 0)
* KT_OVERLAY_AGE : display the FSK/PG rating of the movie

All these environment variables can be set `True` or `False` (in .env file, or docker-compose, or docker cli parameter) to enable or disable the corresponding overlay.

## Some planed features

Most important: More options for a session. E.g.: ~~Ignore some genres~~ Already available. Ignore already watched movies. Ignore already pro-voted / con-voted movies from previous sessions.

## Disclaimer

The software is provided as is. It is in a very early state but its working for me. I hope that someone out there can use it or even help me improve it. So please send me your feedback!

## Demo

I have a demo instance deployed under

[http://srv30258.blue.kundencontroller.de:5000](http://srv30258.blue.kundencontroller.de:5000)

This is only accessable via ipv6 and it may be very slow ...

The instance ~~will reset every day and~~ doesn't get to much attention from me ;-) Just a free server with a quick and dirty public  deployment and a KODi Dummy API enabled.

## Impressions

Login Screen:
![Login](./doc/login.png "The Login Screen")

Voting with poster available:
![Vote1](./doc/poster-vote.png "Voting with a poster available")

Voting with no poster available:
![Vote2](./doc/noposter-vote.png "Voting with no poster available")

Top/Flop Overview
![Tops/Flops](./doc/stats.png "Viewing the Tops and Flops")

