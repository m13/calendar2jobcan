// Code adapted from https://developers.google.com/calendar/quickstart/nodejs

const fs = require('fs').promises;
const { askFor } = require('../lib/ask.js');
const { google } = require('googleapis');

class Google {
  constructor() {
    this.TOKEN_PATH = 'token.json';
    this.CREDENTIALS_PATH = 'credentials.json';
    this.SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
    this.OFFLINE = 'offline';
  }

  async authorize() {
    const bCredentials = await fs.readFile(this.CREDENTIALS_PATH);
    const credentials = JSON.parse(bCredentials.toString('utf8'));

    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    let token;

    try {
      const bToken = await fs.readFile(this.TOKEN_PATH);
      token = JSON.parse(bToken.toString('utf8'));
    } catch (error) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: this.OFFLINE,
        scope: this.SCOPES,
      });

      console.log('Authorize this app by visiting this url:', authUrl);
      const question = 'Enter the code from that page here: ';
      const answer = await askFor(question);

      token = (await oAuth2Client.getToken(answer.toString())).tokens;

      await fs.writeFile(this.TOKEN_PATH, JSON.stringify(token));
      console.log('Token stored to', this.TOKEN_PATH);
    }

    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }
}

module.exports = Google;
