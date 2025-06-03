# K-inder

K-inder gives you the ability to "swipe" through your kodi database with your friends and find your movie match.

## Requirements

For now there are some assumptions for this to work:

* Working docker / podman installation.
* All your movies integrated via a single samba share.
* Kodi API is accessable.
* All movies are exported into single files per movie.
* Build a dockerimage from the repository by your self.

## Settings

The following environment variables have to be set on runtime:

* KT_KODI_USERNAME : Username to access your Kodi API.
* KT_KODI_PASSWORD : Password to access your Kodi API.
* KT_KODI_HOST : Host (usually ip:port) of your Kodi instance.
* KT_SMB_USER : Username to access your samba share.
* KT_SMB_PASSWORD : Password to access your samba share.

There are more settings, but they are just interesting for development. Take a look at the Dockerfile for a complete list.

## Start your voting Session

If you have your image (e.g. kinder:latest) ready to run start it with:

`docker run -it --rm -e KT_KODI_USERNAME=kodi -e KT_KODI_PASSWORD=kodi -e KT_KODI_HOST=192.168.0.100:8080 -e KT_SMB_USER=movies -e KT_SMB_PASSWORD=movies -p 5000:5000 kinder:latest`

Start a browser (for example on your mobile) and open http://ip:5000 where ip is the ip of the computer you starter kinder on.

Enter a name for you and your session.

Now your movies will be presented to you (and everyone else who joined the same session) and you can vote yes (click/touch right) or no (click/touch left).

In the upper left corner you can access the actual top / flop 3 (movies with most pros and movies with most cons).

Thats it.

## Planed features

Most important: More options for a session. E.g.: Ignore some genres. Ignore already watched movies. Ignore already pro-voted / con-voted movies from previous sessions.

Also: Don't access only samba shares. It should be possible to also access direct files or even every source that could be included into Kodi.

## Finally

This is a very early state but its working for me. But I hope that someone out there can use it or even help me improve it. So please send me your feedback!