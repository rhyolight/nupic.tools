FROM phusion/baseimage:latest
MAINTAINER Matthew Taylor <matt@numenta.org>
ENV CREATION_DATE 2014-11-20

RUN apt-get update -y
RUN apt-get install git-core -y
RUN apt-get install -y npm
RUN apt-get install -y node

RUN mkdir /dependent-repos

ENV NUPIC /dependent-repos/nupic
ENV NUPIC_CORE /dependent-repos/nupic.core
ENV NUPIC_RESEARCH /dependent-repos/nupic.research
ENV NUPIC_REGRESSION /dependent-repos/nupic.regression
ENV HTM_JAVA /dependent-repos/htm.java
ENV NUMENTA_ORG /dependent-repos/numenta.org

# Put dependent repositories into place
RUN cd /dependent-repos; git clone https://github.com/numenta/nupic.research.git; git clone https://github.com/numenta/nupic.research.git; git clone https://github.com/numenta/nupic.git; git clone https://github.com/numenta/nupic.core.git; git clone https://github.com/numenta/nupic.regression.git; git clone https://github.com/numenta/htm.java.git; git clone https://github.com/numenta/numenta.org.git

ADD . /src

# Install app dependencies
RUN cd /src; npm install -g forever; npm install

EXPOSE 8081

CMD ["/src/bin/prep-docker.sh"]