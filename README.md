[![Build Status](https://travis-ci.org/m13/calendar2jobcan.svg?branch=master)](https://travis-ci.org/m13/calendar2jobcan)

# SETUP

#### Google Calendar

First you will need to create your own application (if you belong to my company, I can share my own `client_secret` with you).
You can do it manually, going to https://console.developers.google.com/apis/dashboard, create a new project, enabling Google Calendar API and creating a set of credentials.
Or you can click to the `Enable the Google Calendar API` on https://developers.google.com/calendar/quickstart/nodejs.

Whatever way, you will need to create (download) a file called `credentials.json` in this same folder.
Example:
```json
{
  "installed": {
    "client_id": "248773543032-bacddogoa9k6qaakvfan2s5gv79k6hjk.apps.googleusercontent.com",
    "project_id": "Calendar2Jobcan",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "CgPQ3epTpncXXXXXXX",
    "redirect_uris": [
      "urn:ietf:wg:oauth:2.0:oob",
      "http://localhost"
    ]
  }
}
```


#### Jobcan

Create a file named `.env` and add your credentials:
```
JOBCAN_USERNAME=whatever@moneytree.jp
JOBCAN_PASSWORD=BliBliBli
```


# USAGE

First argument is start date (inclusive) and second is end date (exclusive), but by default it retrieves your last week.

```bash
$ npm i
$ node . 2020-01-01 2020-01-16

With locale en, timezone +09:00
Search between 2019-12-31T15:00:00.000Z and 2020-01-15T15:00:00.000Z
Authorize this app by visiting this url: https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly&response_type=code&client_id=248773543032-bacddogoa9k6qaakvfan2s5gv79k6hjk.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob
Enter the code from that page here: 4/vQFHD6TUSaAB0VZ-C2YE77qqQicLHpLoAMxxxxxxxxxxxxxxx
Token stored to token.json
Fri	2020-01-03	21:30	22:15	00:00	00:45
Sun	2020-01-05	22:30	23:30	00:00	01:00
Mon	2020-01-06	09:00	17:00	01:00	07:00
Tue	2020-01-07	08:30	16:00	01:00	06:30
Wed	2020-01-08	08:30	14:30	01:00	05:00
Thu	2020-01-09	08:00	17:00	01:00	08:00
Fri	2020-01-10	08:00	17:30	01:00	08:30
Sun	2020-01-12	08:00	10:00	00:00	02:00
Mon	2020-01-13	14:00	15:00	00:00	01:00
Tue	2020-01-14	09:45	19:35	01:00	08:50
Wed	2020-01-15	08:00	20:30	01:00	11:30
06:40 avg during 9 weekdays
Do you want to persist the information into JobCan? (y/N) y
Started with 2020-01-03 & id=1577977200^C
```


# PENDING

- [ ] Tests
- [ ] Manage Holidays (events are currently discarded)
