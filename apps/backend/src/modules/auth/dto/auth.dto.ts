import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class LoginDto {
  @ApiProperty({ example: 'master@globeinout.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Master@1234', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newuser@example.com', description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.VIEWER, description: 'User role' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.VIEWER;
}

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-abc-123', description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPass123!', description: 'New password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 123456, description: 'OTP code' })
  @IsNumber()
  otp: number;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123', description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewPass456!', description: 'New password (min 8 chars)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'user-uuid-here', description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MANAGER, description: 'New role' })
  @IsEnum(UserRole)
  role: UserRole;
}