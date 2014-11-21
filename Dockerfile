FROM centos:centos7
MAINTAINER Matthew Taylor <matt@numenta.org>
ENV CREATION_DATE 2014-11-20

RUN yum update -y
RUN yum install git-core -y

RUN mkdir /dependent-repos

ENV NUPIC ${DEPENDENT_REPOS}/nupic
ENV NUPIC_CORE ${DEPENDENT_REPOS}/nupic.core
ENV NUPIC_RESEARCH /dependent-repos/nupic.research
ENV NUPIC_REGRESSION ${DEPENDENT_REPOS}/nupic.regression
ENV HTM_JAVA ${DEPENDENT_REPOS}/htm.java
ENV NUMENTA_ORG ${DEPENDENT_REPOS}/numenta.org

# Put dependent repositories into place
RUN cd /dependent-repos; git clone https://github.com/numenta/nupic.research.git; git clone https://github.com/numenta/nupic.research.git; git clone https://github.com/numenta/nupic.git; git clone https://github.com/numenta/nupic.core.git; git clone https://github.com/numenta/nupic.regression.git; git clone https://github.com/numenta/htm.java.git; git clone https://github.com/numenta/numenta.org.git

ADD . /src

CMD /src/bin/prep-docker.sh
# CMD bash