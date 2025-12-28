import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

// Step 1: Initiate registration - just email
export class InitiateRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// Step 2: Verify OTP and complete registration
export class VerifyOtpRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @IsNotEmpty()
  tenantName: string;
}

// Resend OTP
export class ResendOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
