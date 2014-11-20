FROM centos:centos7
MAINTAINER Matthew Taylor <matt@numenta.org>
ENV CREATION_DATE 2014-11-20

# Install git
RUN yum update

COPY . /src

CMD /src/bin/prep-docker.sh
