import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { type Env, ENV } from '../config/env.js';

export interface Email {
  to: string;
  subject: string;
  text: string;
}

// Sends email over SMTP: Mailpit locally, a provider (Resend/Postmark, docs/04) in production.
// Callers decide what a failure means; this just throws.
@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(@Inject(ENV) env: Env) {
    this.transport = createTransport(env.SMTP_URL);
    this.from = env.MAIL_FROM;
  }

  async send(email: Email): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...email });
  }

  onModuleDestroy(): void {
    this.transport.close();
  }
}
