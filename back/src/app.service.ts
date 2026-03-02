import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class AppService {
  private oauthClientFromTokens(tokens: {
    access_token?: string;
    refresh_token?: string;
  }) {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
    );

    oAuth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    return oAuth2Client;
  }

  private renderTemplate(tpl: string, v: string) {
    return tpl.replaceAll('{var}', v);
  }

  async createEventsBulk(params: {
    tokens: { access_token?: string; refresh_token?: string };
    calendarId?: string;
    titleTemplate: string;
    descriptionTemplate: string;
    startISO: string;
    endISO: string;
    recipients: string[];
    variables: string[];
  }) {
    const {
      tokens,
      calendarId = 'primary',
      titleTemplate,
      descriptionTemplate,
      startISO,
      endISO,
      recipients,
      variables,
    } = params;

    if (!recipients?.length || recipients.length !== variables?.length) {
      return {
        error:
          'recipients et variables doivent être non vides et de même longueur',
      };
    }

    const auth = this.oauthClientFromTokens(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const results: any[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i];
      const v = variables[i];

      const summary = this.renderTemplate(titleTemplate, v);
      const description = this.renderTemplate(descriptionTemplate, v);

      const tokenInfo = await auth.getTokenInfo(tokens.access_token!);
      console.log('TOKENINFO scopes:', tokenInfo.scopes);

      const res = await calendar.events.insert({
        calendarId,
        sendUpdates: 'all',
        requestBody: {
          summary,
          description,
          start: {
            dateTime: startISO,
            timeZone: 'Europe/Paris',
          },
          end: {
            dateTime: endISO,
            timeZone: 'Europe/Paris',
          },
          attendees: [{ email }],
        },
      });

      results.push({
        recipient: email,
        variable: v,
        eventId: res.data.id,
        htmlLink: res.data.htmlLink,
        status: res.data.status,
      });
    }

    return { ok: true, created: results.length, results };
  }
}
