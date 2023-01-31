const fetch = require('node-fetch');
const moment = require('moment');
const colors = require('colors/safe');
const fs = require('fs').promises;
const JapaneseHolidays = require('japanese-holidays');

// Jira API Documentation
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-post
// Get API Key
// https://id.atlassian.com/manage-profile/security/api-tokens
class Jira {
  constructor() {
    this.CREDENTIAL_PATH = 'jira.json';
    this.EVENTS_PATH = 'events.json';
    this.LINE_BREAK = '--------------------------------------------------------------------';
  }

  logEvent(event) {
    const isHoliday = (date) => {
      return (
        ['Sat', 'Sun'].indexOf(date.format('ddd')) !== -1 ||
        JapaneseHolidays.isHoliday(date.toDate())
      );
    }

    const eventDuration = moment.duration(event.duration, 'minutes');
    const line = [
      colors.blue(moment(event.start).format('MM-DD')),
      `${eventDuration.asHours().toFixed(2)}`,
      colors.grey(event.description),
    ].join("  ");

    if (isHoliday(moment(event.start))) {
      console.log(colors.red(line));
    } else {
      console.log(line);
    }

    return event;
  }

  display(events) {
    console.log(this.LINE_BREAK);
    const totalDurationMinutes = events
    .map(this.logEvent)
    .reduce((acc, e) => acc += e.duration, 0);
    console.log(this.LINE_BREAK);
    const totalDuration = moment.duration(totalDurationMinutes, 'minutes').asMinutes();
    console.log(
      colors.bold(
        `>Total: ${colors.yellow(`${Math.floor(totalDuration/60)}:${totalDuration % 60}`)} ⏱`
      )
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
        const shouldUpdate = (
          jiraEvent.description != savedEvent.description || jiraEvent.duration != savedEvent.duration
        );
        if (shouldUpdate) {
          console.log(colors.green(`updateWorklog: ${jiraEvent.description}`));
          // returns jiraEvent with the new worklog ID
          jiraEvent = await this.updateWorklog(savedEvent.jiraWorklogId, jiraEvent);
        } else {
          console.log(colors.grey(`noChanges: ${jiraEvent.description}`));
        }
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
