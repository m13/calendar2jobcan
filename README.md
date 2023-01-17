[![Build Status](https://travis-ci.org/m13/calendar2jobcan.svg?branch=master)](https://travis-ci.org/m13/calendar2jobcan)

# SETUP

#### Input: CSV (NEW!)

If you don't organize yourself using Google Calendar, now there is a new input method.

First, generate a default `monthly.csv` with

```bash
$ ./csv-generator.js # it will try to skip all JAPANESE holidays (Sat + Sun too)
File ./monthly.csv written.
Review extra working or swapped days !!
```

Then ensure to modify your `.env` file with

```yaml
INPUT=csv
```

And run it like the usage section.
CSV has only 1 argument, which is the filename (just in case you want to organize backups, etc.)

#### Input: Google Calendar

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
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
  }
}
```

#### Output: Jobcan

Create a file named `.env` and add your credentials:

```yaml
INPUT=calendar # or "csv"
OUTPUT=jira # or jobcan
STRATEGY=ticket # or sum or min-max
HOLIDAY_ZONE=JP # https://github.com/commenthol/date-holidays/#supported-countries-states-regions
JOBCAN_USERNAME=whatever@email.com
JOBCAN_PASSWORD=BliBliBli
CALENDAR_TIMEZONE=Asia/Tokyo # leave empty to default "Asia/Tokyo"
```

#### Output: Jira (NEW!)

Create a file named `jira.json` in the root folder and add your API key, domain URL and email like the format below:
```{
    "email": "em@il.com",
    "token": "123456789ACBDEFG",
    "domainUrl": "https://id.atlassian.net"
}
```
Generate your Jira API key here: https://id.atlassian.com/manage-profile/security/api-tokens

Your Google Calendar events must have the JIRA ticket ID wrapped in either [] or {} in the title or description.

For example: `[SPACE-1234]` or `{SPACE-1234}`.

It should only log to JIRA events that:
- Have been accepted by you
- Have a JIRA ID in either the description or title wrapped by [] or {}
- Are not Out Of Office
- Are not All-day

## Strategies

- `sum`: Time is the sum of all events individually (by @m13)
- `min-max`: Time is calculated from earliest event to latest one (by @vadimburlakin)
- `ticket`: Converts google calendar events to a ticket array to be persisted into JIRA (my @mt-fabio) - Only works if OUTPUT=jira

# USAGE

1. You must set up your .env file correctly based on the desired OUTPUT.
2. The first argument is a start date (inclusive) and second is end date (exclusive), retrieves your last week by default.
3. You only need to do this once, but if you haven't logged into your google account via the app you will be prompted this

```bash
$ npm i
$ node . 2020-01-01 2020-01-16
With locale en, timezone +09:00
🤖 Search between 2019-12-31T15:00:00.000Z and 2020-01-15T15:00:00.000Z
Authorize this app by visiting this url: https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly&response_type=code&client_id=248773543032-bacddogoa9k6qaakvfan2s5gv79k6hjk.apps.googleusercontent.com&redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob
Enter the code from that page here: ...
```

4. Open the url and allow access.
5. You should be redirected to localhost. Grab the code from the URL and paste it in your terminal
6. If successful you should see:
```
Token stored to token.json
```

7. It then retrieves the information from your google calendar or csv (Note that CSV does not work with JIRA) and displays it:

```
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
Do you want to persist the information into JOBCAN? (y/N) y
```

# PENDING

- [x] JobCan strategies
- [x] TimeZone
- [x] Add multiple inputs (Google Calendar, CSV, ..)
- [x] Manage Holidays (JP/AU/wherever)
- [x] JIRA Integration
- [ ] Tests
