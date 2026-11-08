import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ChangeEmailInput } from '@life-os/shared';
import { PinoLogger } from 'nestjs-pino';
import { AppException } from '../../common/errors/app.exception.js';
import { type Env, ENV } from '../../config/env.js';
import { MailService } from '../../mail/mail.service.js';
import { isUniqueViolation } from '../../prisma/prisma-errors.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AccountGoneError, WrongPasswordError } from '../users/users.errors.js';
import { AuthTokenService } from './auth-token.service.js';
import { EmailTakenError, InvalidLinkError } from './auth.errors.js';
import { emailChangeConfirmEmail, emailChangeNotice, linkTo } from './emails.js';
import { PasswordService } from './password.service.js';

// FR-SET-001 change email, in two steps so a typo or a stranger can't take the account:
//   1. request (logged in, verified, password): link to the NEW address, notice to the OLD.
//   2. confirm (the link): the email changes; the old address is told it happened.
@Injectable()
export class EmailChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly authTokens: AuthTokenService,
    private readonly mail: MailService,
    private readonly logger: PinoLogger,
    @Inject(ENV) private readonly env: Env,
  ) {
    logger.setContext(EmailChangeService.name);
  }

  async request(userId: string, { newEmail, password }: ChangeEmailInput): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AccountGoneError();
    if (!(await this.passwords.verify(user.passwordHash, password))) throw new WrongPasswordError();
    if (newEmail === user.email) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'Some fields are invalid.',
        {
          details: [{ field: 'newEmail', message: 'This is already your email address.' }],
        },
      );
    }
    // Checked again at confirm time: the address could be taken in between.
    if (await this.prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })) {
      throw new EmailTakenError();
    }

    const token = await this.authTokens.issue(user.id, 'EMAIL_CHANGE', newEmail);
    const link = linkTo(this.env.EMAIL_LINK_BASE_URL, 'confirm-email-change', token);
    await this.mail.send(emailChangeConfirmEmail(newEmail, user.displayName, link));
    await this.mail.send(emailChangeNotice(user.email, user.displayName, newEmail, 'requested'));
  }

  async confirm(token: string): Promise<void> {
    const changed = await this.prisma.$transaction(async (tx) => {
      const { userId, newEmail } = await this.authTokens.consume(token, 'EMAIL_CHANGE', tx);
      if (!newEmail) throw new InvalidLinkError();
      const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      try {
        await tx.user.update({
          where: { id: userId },
          // The link was opened from the new inbox, so the new address is verified.
          data: { email: newEmail, emailVerifiedAt: new Date() },
        });
      } catch (err) {
        if (isUniqueViolation(err, 'User', 'email')) throw new EmailTakenError(err);
        throw err;
      }
      // Reset and verification links went to the old address: none of them may still work.
      await tx.authToken.deleteMany({ where: { userId, usedAt: null } });
      return { oldEmail: before.email, newEmail, name: before.displayName, userId };
    });

    // After the commit, and best-effort: the change already happened.
    await this.mail
      .send(emailChangeNotice(changed.oldEmail, changed.name, changed.newEmail, 'completed'))
      .catch((err: unknown) => {
        this.logger.error({ err, userId: changed.userId }, 'Could not send email-changed notice');
      });
  }
}
