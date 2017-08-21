FROM ibmcom/ibmnode:latest
MAINTAINER Scott Graham <swgraham@us.ibm.com>
#
#  This is the watson-multimedia-analyzer image
#
ENV NODE_ENV production
ADD . /watson-multimedia-analyzer
WORKDIR /watson-multimedia-analyzer

RUN apt-get update \
  && apt-get -y install vim \
  && apt-get -y install ffmpeg\
  && apt-get -y install curl\
  && apt-get clean \
  && npm install \
  && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

EXPOSE 8080
CMD ["node" , "app.js"]