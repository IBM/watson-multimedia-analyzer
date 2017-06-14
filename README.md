# Using IBM Watson to enrich audio and visual files.

In this developer journey we will use Watsom services to showcase how media (both audio and video) can be enriched on a timeline basis. 

## Included Components
- Bluemix Watson Natural Language Understanding
- Bluemix Watson SpeechToText
- Bluemix Watson Tone Analyzer
- Bluemix Watson Visual Recognition
- Bluemix Cloudant NoSQL DB
- Node
- AngularJS

# Steps

**NOTE:** Perform steps 1-8 **OR** click the **Deploy to Bluemix** button and jump to step 9.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm/watson-multimedia-analyzer)

1. [Clone the repo](#1-clone-the-repo)
2. [Create Bluemix application](#2-create-bluemix-application)
3. [Create and connect Bluemix services to application](#3-create-and-connect-bluemix-services-to-application)
4. [Enable and connect Watson Natural Language Understanding](#4-enable-and-connect-watson-natural-language-understanding)
5. [Enable and connect Watson Speech to Text](#5-enable-and-connect-watson-speech-to-text)
6. [Enable and connect Watson Tone Analyzer](#6-enable-and-connect-watson-tone-analyzer)
7. [Enable and connect Watson Visual Recognition](#7-enable-and-connect-watson-visual-recognition)
8. [Enable and connect Cloudant NoSQL DB](#8-enable-and-connect-cloudant-nosql-db)
9. [Configure the Watson Multimedia Analzer application](#9-configure-the-watson-multimedia-analzer-application)
10. [Run the application](#10-run-the-application)
11. [Enrichment](#11-enrichment)

## 1. Clone the repo

Clone the `watson-multimedia-analyzer` locally. In a terminal, run:

  `$ git clone https://github.com/ibm/watson-multimedia-analyzer`

## 2. Create Bluemix Application

Login to your Bluemix account, and proceed to the 
[**Apps -> Clound Foundry Apps**](https://console.ng.bluemix.net/dashboard/cf-apps) panel. Click on **Create Cloud Foundry app** and 
select **SDK for Node.js** as your application type.

From the creation panel, enter a unique name for **App Name**.

![](doc/source/images/create-app.png)

## 3. Create and connect Bluemix services to application

Create and connect the following services to your Bluemix application:

  * [**Watson Natural Language Understanding**](https://console.ng.bluemix.net/catalog/services/natural-language-understanding)
  * [**Watson Speech to Text**](https://console.ng.bluemix.net/catalog/services/speech-to-text/)
  * [**Watson Tone Analyzer**](https://console.ng.bluemix.net/catalog/services/tone-analyzer/)
  * [**Watson Visual Recognition**](https://console.ng.bluemix.net/catalog/services/visual-recognition/)
  * [**Cloudant NoSQL DB**](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/)

Click the **Connect New** button to view and select each of the Bluemix 
services.

![](doc/source/images/create-connections.png)

## 4. Enable and connect Watson Natural Language Understanding

Select the **Watson Natural Language Understanding** service. From the 
**Connect to** list, select your "multimedia analyzer application" name.

![](doc/source/images/connect-nlu.png)

## 5. Enable and connect Watson Speech to Text

Select the **Watson Speech to Text** service. From the 
**Connect to** list, select your "multimedia analyzer application" name.

![](doc/source/images/connect-stt.png)

## 6. Enable and connect Watson Tone Analyzer

Select the **Watson Tone Analyzer** service. From the 
**Connect to** list, select your "multimedia analyzer application" name.

![](doc/source/images/connect-tone.png)

## 7. Enable and connect Watson Visual Recognition

Select the **Watson Visual Recognition** service. From the 
**Connect to** list, select your "multimedia analyzer application" name.

![](doc/source/images/connect-vr.png)

## 8. Enable and connect Cloudant NoSQL DB

Select the **Cloudant NoSQL DB** service. From the 
**Connect to** list, select your "multimedia analyzer application" name.

![](doc/source/images/connect-nosql.png)

## 9. Configure the Watson Multimedia Analzer application

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

### Configure Bluemix components

Edit the [`manifest.yml`](manifest.yml) file and change the name and host to the
Bluemix Application name you defined earlier.

Copy the [`.env.sample`](.env.sample) to `.env`, and add the associated credentials
gathered from each of the Bluemix services. To view the credentials for each of 
the services, click the `View Credentials` button displayed on the service tile.

![](doc/source/images/app-and-connections.png)

### Enable enrichment

For encoding Speech-to-Text (STT) and Visual Recognition (VR) from the command
line, you need to install [`ffmpeg` and `ffprobe`](https://ffmpeg.org/download.html).

Ensure that the codec `linopus` is included in the version of `ffmpeg` that you install. To check this, make sure it is listed using this command:

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
