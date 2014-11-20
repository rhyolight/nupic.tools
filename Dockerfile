FROM phusion/baseimage:latest
MAINTAINER Matthew Taylor <matt@numenta.org>
ENV CREATION_DATE 2014-11-20

# Set correct environment variables.
ENV HOME /root

# Regenerate SSH host keys. baseimage-docker does not contain any, so you
# have to do that yourself. You may also comment out this instruction; the
# init system will auto-generate one during boot.
RUN /etc/my_init.d/00_regen_ssh_host_keys.sh

RUN apt-get update
RUN apt-get install -y git

ADD . /src

CMD /src/bin/prep-docker.sh
