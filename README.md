# Using IBM Watson to enrich audio and visual files.

In this developer journey we will use Watson services to showcase how media (both audio and video) can be enriched on a timeline basis. 

!! ARCHITECTURE DIAGRAM

## Flow

## With Watson

Want to take your Watson app to the next level? Looking to leverage Watson Brand assets? Join the [With Watson](https://www.ibm.com/watson/with-watson) program which provides exclusive brand, marketing, and tech resources to amplify and accelerate your Watson embedded commercial solution.

## Included components

* [Watson Natural Language Understanding](https://www.ibm.com/watson/developercloud/natural-language-understanding.html): A Bluemix service that can analyze text to extract meta-data from content such as concepts, entities, keywords, categories, sentiment, emotion, relations, semantic roles, using natural language understanding.
* [Watson Speech-to-Text](https://www.ibm.com/watson/developercloud/speech-to-text.html): A service that converts human voice into written text.
* [Watson Tone Analyzer](https://www.ibm.com/watson/developercloud/tone-analyzer.html): Uses linguistic analysis to detect communication tones in written text.
* [Watson Visual Recognition](https://www.ibm.com/watson/developercloud/visual-recognition.html): Visual Recognition understands the contents of images - visual concepts tag the image, find human faces, approximate age and gender, and find similar images in a collection.
* [Cloudant NoSQL DB](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db): A fully managed data layer designed for modern web and mobile applications that leverages a flexible JSON schema.

## Featured Technologies
* [Node.js](https://nodejs.org/): An asynchronous event driven JavaScript runtime, designed to build scalable applications.
* AngularJS

# Watch the Video

!! COMING SOON

# Steps

Use the ``Deploy to Bluemix`` button **OR** create the services and run locally.
> NOTE: Both the app server and enrichment process must be run locally. 

## Deploy to Bluemix
[![Deploy to Bluemix](https://deployment-tracker.mybluemix.net/stats/3999122db8b59f04eecad8d229814d83/button.svg)](https://bluemix.net/deploy?repository=https://github.com/IBM/watson-multimedia-analyzer.git)

1. Press the above ``Deploy to Bluemix`` button and then click on ``Deploy``.

2. In Toolchains, click on Delivery Pipeline to watch while the app is deployed. Once deployed, the app can be viewed by clicking 'View app'.
![](doc/source/images/toolchain-pipeline.png)

3. To see the app and services created and configured for this journey, use the Bluemix dashboard. The app is named `watson-multimedia-analyzer` with a unique suffix. The following services are created and easily identified by the `wma-` prefix:
    * wma-natural-language-understanding
    * wma-speech-to-text
    * wma-tone-analyzer
    * wma-visual-recognition
    * wma-cloudant

## Run locally
> NOTE: These steps are only needed when running locally instead of using the ``Deploy to Bluemix`` button.

1. [Clone the repo](#1-clone-the-repo)
2. [Create Watson services with IBM Bluemix](#2-create-watson-services-with-ibm-bluemix)
3. [Configure the Watson Multimedia Analzer application](#3-configure-the-watson-multimedia-analzer-application)
4. [Configure credentials](#4-configure-credentials)
5. [Enrichment](#5-enrichment)

## 1. Clone the repo

Clone the `watson-multimedia-analyzer` locally. In a terminal, run:

  `$ git clone https://github.com/ibm/watson-multimedia-analyzer`

### 2. Create Watson services with IBM Bluemix

Create the following services:

* [**Watson Visual Recognition**](https://console.bluemix.net/catalog/services/visual-recognition)
* [**Watson Speech to Text**](https://console.bluemix.net/catalog/services/speech-to-text)
* [**Watson Tone Analyzer**](https://console.ng.bluemix.net/catalog/services/tone-analyzer)
* [**Watson Natural Language Understanding**](https://console.ng.bluemix.net/catalog/services/natural-language-understanding)
* [**Watson Cloudant NoSQL DB**](https://console.bluemix.net/catalog/services/cloudant-nosql-db)

## 3. Configure the Watson Multimedia Analzer application

### Install package managers

Use this [link](https://nodejs.org/en/download/) to download and install node.js and npm to your local system.

Install the Bower package manager: 

```
npm install -g bower
```
### Install dependencies

```
cd watson-multimedia-analyzer
npm install
bower install
```

### 4. Configure credentials

The credentials for Bluemix services (Visual Recognition, Speech to Text, Tone Analyzer, 
Natural Language Understanding, and Cloudant NoSQL DB), can be found in the ``Services`` menu in Bluemix,
by selecting the ``Service Credentials`` option for each service.

Copy the [`env.sample`](env.sample) to `.env`.

```
$ cp env.sample .env
```
Edit the `.env` file with the necessary settings.

#### `env.sample:`

```
# Replace the credentials here with your own.
# Rename this file to .env before starting the app.

# Cloudant NoSQL DB Credentials and Config options (Required)
DB_USERNAME=<add_db_username>
DB_PASSWORD=<add_db_password>
DB_HOST=<add_db_host_name>
DB_PORT=<add_db_port_num>
DB_URL=<add_db_url>

# Tone Analyzer Credentials
TONE_USERNAME=<add_tone_username>
TONE_PASSWORD=<add_tone_password>

# SpeechToText Credentials
STT_USERNAME=<add_stt_username>
STT_PASSWORD=<add_stt_username>

# Visual Recognition Key
VR_KEY=<add_vr_recognition_key>

# Natural Language Understanding Credentials and endpoint
NLU_URL=<add_nlu_url>
NLU_USERNAME=<add_nlu_username>
NLU_PASSWORD=<add_nlu_password>
```

### Enable enrichment

For encoding Speech-to-Text (STT) and Visual Recognition (VR) from the command
line, you need to install [`ffmpeg` and `ffprobe`](https://ffmpeg.org/download.html).

Ensure that the codec `libopus` is included in the version of `ffmpeg` that you install. To check this, make sure it is listed using this command:

```
ffmpeg -encoders | grep opus
```

### Configure application credentials

Username and password are defined by the object `users` in [`app.js`](app.js). The default username/password credentials are `enrich`/`enrichit`. 

Note that the default credentials must NOT be removed. You can, however, add
additional credentials.

## 10. Run the application

### Run the application locally

Note that the application must be run locally to perform enrichment.

* Start the enrichment Service

```
npm start
```
* Take note of the successful creation and deployment of the Cloudant NoSQL DB
```
watson-multimedia-analyzer $ npm start

> WatsonMulitMediaPipeline@0.0.5 start /test/watson-multimedia-analyzer
> node app.js | node_modules/.bin/pino

[2017-06-13T21:17:14.333Z] INFO (50150 on TEST-MBP.attlocal.net): AppEnv is: {"app":{},"services":{},"isLocal":true,"name":"test-multimedia-enrichment","port":6007,"bind":"localhost","urls":["http://localhost:6007"],"url":"http://localhost:6007"}
[2017-06-13T21:17:14.335Z] INFO (50150 on TEST-MBP.attlocal.net): cloudant_credentials null
[2017-06-13T21:17:14.336Z] INFO (50150 on TEST-MBP.attlocal.net): dbConfig  {"url":"https://65e02d54-e2d1-4ccb-a5db-72064d16f76d-bluemix:19f3a0601a8992be63e4a6cb449172a6ef3f1533e52669e96de93eb31e0115f2@65e02d54-e2d1-4ccb-a5db-72064d16f76d-bluemix.cloudant.com","host":"65e02d54-e2d1-4ccb-a5db-72064d16f76d-bluemix.cloudant.com","port":"443","username":"xxx","password":"xxx"}
[2017-06-13T21:17:14.368Z] INFO (50150 on TEST-MBP.attlocal.net): AppEnv is: {"app":{},"services":{},"isLocal":true,"name":"test-multimedia-enrichment","port":6007,"bind":"localhost","urls":["http://localhost:6007"],"url":"http://localhost:6007"}
[2017-06-13T21:17:14.368Z] INFO (50150 on TEST-MBP.attlocal.net): cloudant_credentials null
server starting on http://localhost:6007
[2017-06-13T21:17:15.053Z] INFO (50150 on TEST-MBP.attlocal.net): video_metadata_db_status Database already created!
[2017-06-13T21:17:15.058Z] INFO (50150 on TEST-MBP.attlocal.net): video_metadata_db Database already created!
[2017-06-13T21:17:15.058Z] INFO (50150 on TEST-MBP.attlocal.net): Successfully created database:  video_metadata_db
[2017-06-13T21:17:15.136Z] INFO (50150 on TEST-MBP.attlocal.net): Successfully Created views in database
[2017-06-13T21:17:15.136Z] INFO (50150 on TEST-MBP.attlocal.net): Views already exist.
```
*  UI will be available where indicated (in this example: http://localhost:6007/)

### Deploy the Application to Bluemix
You are now ready to deploy the application to Bluemix.

* Download and install the [Cloud Foundry CLI](https://console.ng.bluemix.net/docs/cli/index.html#cli) tool.
* From the root directory of this project run the following command:
```
cf push
```
* You should see a lot of activity as the application is deployed to Bluemix. At the end of the activity, the application should be 'Starter'.
* Access the application using the following url:
```
http:\\{BLUEMIX_APPLICATION_NAME}.mybluemix.net
```
* When prompted for a username and password, use the credentials stored in `app.js`.

## 11. Enrichment

Enrichment is initiated via the command line using `bin/processMedia`.  The usage for the command is as follows:

```
bin/processMedia --help

Usage: processMedia [options]

Options:

-h, --help output usage information
-d, --save-to-db save to db
-o, --save-to-file save to file
-S, --use-stt use STT
-V, --use-vr Use Visual Recognition
-r, --vr-rate <i> Visual Recognition Rate (default 10 seconds)
-m, --enrichment-model GAP|TIMED Enrichment Model
-g, --time-gap  Time Gap for GAP model
-f, --media-file filename Media File
-x, --xml-file filename XML URI or filename
```

*Note:* Using Visual Recognition will take significantly longer. It is worth testing your setup without using the -V option. Once the -S option or the subtitles are correctly determined, add the -V option. There is a limitation on your VR account (250 images/day), so proceed with caution.

### Enrich a local MP4/WAV file (Using STT)

If you just have an MP4 or Wav file locally on your machine, you can just enrich it. We will copy this file to `public/media_files` automatically so you can use the UI to browse the results.

For convenience, use the supplied sample mp4 file:
```
# STT Only
bin/processMedia -S -f public/media_files/terror-on-ice.mp4

# STT & VR (Will take a lot longer)
bin/processMedia -S -V -f public/media_files/terror-on-ice.mp4
```

### Enrich from a URL pointing to a MP4/WAV file (Using STT)

If you have a MP4 or Wav at a URL or on YouTube you can enrich it as follows:
```
# STT & VR (Will take a lot longer)
bin/processMedia -S -f http://someurl.com/somefilename.mp4

# (Youtube) STT & VR (Will take a lot longer)
bin/processMedia -S -V -r 10000 -f https://www.youtube.com/watch?v=_aGCpUeIVZ4
```
*Note:* Remember the VR Rate can QUICKLY eat up your 250 images. So choose Wisely!!!

### Enrich from a URL Feed:

If you have a remote URL that references an XML file in the 'schema/media' or 'mrss' format
then you can enrich by pointing to that URL

```
bin/processMedia -V -x http://some.url.com/some_mrss.xml
```

### Enrich a Media+Transcript file via an XML

Open the XML Template file (samples/episode_template.xml) and fill it out as noted.
You MUST give it a GUID/Title/media:content and media:subTitle to make this work.

Save this file as a new name somewhere (like `feeds`):

```
bin/processMedia -V -x feeds/new_feed.xml
```
