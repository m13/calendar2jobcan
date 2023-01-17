const fetch = require('node-fetch');
const moment = require('moment');
const colors = require('colors/safe');
const fs = require('fs').promises;
const holidays = new (require('date-holidays'))();

// Jira API Documentation
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-post
// Get API Key
// https://id.atlassian.com/manage-profile/security/api-tokens
class Jira {
  constructor() {
    this.CREDENTIAL_PATH = 'jira.json';
    this.EVENTS_PATH = 'events.json';
  }

  // best effort!
  isHoliday(date) {
    return (
      ['Sat', 'Sun'].indexOf(date.format('ddd')) !== -1 ||
      holidays.isHoliday(date.toDate())
    );
  }

  display(events) {
    let totalDuration = 0;

    for (let e of events) {
      const line = [
        moment(e.start).format('MM-DD (ddd)'),
        `${moment.duration(e.duration, 'minutes').asHours()}h`,
        e.summary || e.description,
      ].join('\t');

      if (this.isHoliday(moment(e.start))) {
        console.log(colors.grey(line));
      } else {
        console.log(line);
      }

      totalDuration += e.duration;
    }

    totalDuration = moment(`2000-01-01 00:00`).add(totalDuration, 'minutes');
    console.log(
      colors.bold(`Total duration: ${totalDuration.format('HH:mm')}`)
    );
  }

  async getSavedEvents() {
    let bPersistedEvents;
    try {
      bPersistedEvents = await fs.readFile(this.EVENTS_PATH);
    } catch (error) {}

    return bPersistedEvents
      ? await JSON.parse(bPersistedEvents.toString('utf8'))
      : {};
  }

  async saveEvents(events) {
    await fs.writeFile(this.EVENTS_PATH, JSON.stringify(events));
  }

  getBody(jiraEvent) {
    let bodyString = `{
      "started": "${jiraEvent.startAt}",
      "timeSpentSeconds": ${jiraEvent.timeSpentSeconds},
      "comment": {
        "type": "doc",
        "version": 1,
        "content": [
          {
            "type": "paragraph",
            "content": [
              {
                "text": "${jiraEvent.description}",
                "type": "text"
              }
            ]
          }
        ]
      }
    }`;
    return bodyString;
  }

  async updateWorklog(jiraWorklogId, jiraEvent) {
    let credential;
    try {
      const bToken = await fs.readFile(this.CREDENTIAL_PATH);
      credential = JSON.parse(bToken.toString('utf8'));
    } catch (error) {
      console.log(error);
      return;
    }
    const jiraRequestUrl = `${credential.domainUrl}/rest/api/3/issue/${jiraEvent.id}/worklog/${jiraWorklogId}`;
    console.log(jiraRequestUrl);

    const jiraRequestPayload = {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credential.email}:${credential.token}`
        ).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: this.getBody(jiraEvent),
    };

    const response = await fetch(jiraRequestUrl, jiraRequestPayload);
    const responseJson = await response.json();

    jiraEvent.jiraWorklogId = jiraWorklogId;
    return jiraEvent;
  }

  async addWorklog(jiraEvent) {
    let credential;
    try {
      const bToken = await fs.readFile(this.CREDENTIAL_PATH);
      credential = JSON.parse(bToken.toString('utf8'));
    } catch (error) {
      console.log(error);
      return;
    }

    const jiraRequestUrl = `${credential.domainUrl}/rest/api/3/issue/${jiraEvent.id}/worklog`;
    const jiraRequestPayload = {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credential.email}:${credential.token}`
        ).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: this.getBody(jiraEvent),
    };

    const response = await fetch(jiraRequestUrl, jiraRequestPayload);
    const responseJson = await response.json();

    jiraEvent.jiraWorklogId = responseJson.id;
    return jiraEvent;
  }

  async persist(googleEvents) {
    let jiraEvents = googleEvents.map((event) => {
      const formattedEvent = {
        id: event.id,
        calendarId: event.calendarId,
        description: event.description,
        startAt: moment.utc(event.start).toISOString().replace('Z', '+0000'),
        timeSpentSeconds: event.duration * 60,
      };
      return formattedEvent;
    });

    const savedEvents = await this.getSavedEvents();
    for (let jiraEvent of jiraEvents) {
      const calendarId = jiraEvent.calendarId;
      let savedEvent = savedEvents[calendarId];

      if (savedEvent) {
        console.log(colors.green(`updateWorklog: ${jiraEvent.description}`));
        jiraEvent = await this.updateWorklog(
          savedEvent.jiraWorklogId,
          jiraEvent
        ); // returns jiraEvent with the new worklog ID
      } else {
        console.log(colors.blue(`addWorklog: ${jiraEvent.description}`));
        jiraEvent = await this.addWorklog(jiraEvent); // returns jiraEvent with the new worklog ID
      }

      savedEvents[calendarId] = jiraEvent;
    }

    await this.saveEvents(savedEvents);
  }
}

module.exports = Jira;
