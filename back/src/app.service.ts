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

    if (!titleTemplate || !descriptionTemplate) {
      return { error: 'titleTemplate et descriptionTemplate sont obligatoires' };
    }

    if (!startISO || !endISO) {
      return { error: 'startISO et endISO sont obligatoires' };
    }

    if (!tokens?.access_token && !tokens?.refresh_token) {
      return { error: 'Aucun token Google fourni' };
    }

    const auth = this.oauthClientFromTokens(tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const results: any[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i];
      const v = variables[i];

      const summary = this.renderTemplate(titleTemplate, v);
      const description = this.renderTemplate(descriptionTemplate, v);

      // Un échec sur un destinataire ne doit pas interrompre tout le lot.
      try {
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
          ok: true,
          eventId: res.data.id,
          htmlLink: res.data.htmlLink,
          status: res.data.status,
        });
      } catch (e: any) {
        const message =
          e?.response?.data?.error?.message ?? e?.message ?? String(e);
        console.error(`Echec pour ${email}:`, message);

        results.push({
          recipient: email,
          variable: v,
          ok: false,
          error: message,
        });
      }
    }

    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;

    return { ok: failed === 0, created, failed, results };
  }
}
