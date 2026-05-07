import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const from =
        this.configService.get<string>('MAIL_FROM') ||
        'Fleeting Commerce <noreply@fleetingcommerce.dev>';

      const { error } = await this.resend.emails.send({
        from,
        to: email,
        subject: 'Email Verification - Your OTP Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #ffffff; border-radius: 10px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Email Verification</h1>

                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  Thank you for registering with Fleeting Commerce. Please use the following OTP code to verify your email address:
                </p>

                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #007bff;">${otp}</span>
                </div>

                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  This OTP is valid for <strong>5 minutes</strong>. Please do not share this code with anyone.
                </p>

                <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
                  If you didn't request this verification, please ignore this email.
                </p>
              </div>

              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                © ${new Date().getFullYear()} Fleeting Commerce. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `Your OTP code is: ${otp}. This code is valid for 5 minutes.`,
      });

      if (error) {
        this.logger.error(`Failed to send OTP email to ${email}:`, error);
        return false;
      }

      this.logger.log(`OTP email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}:`, error);
      return false;
    }
  }
}
