import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request as ExpressRequest } from 'express';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, UpdateUserRoleDto } from './dto/auth.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) { return this.authService.login(loginDto); }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) { return this.authService.register(registerDto); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) { return this.authService.refreshToken(refreshTokenDto); }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: ExpressRequest, @Body() body: LogoutDto) {
    await this.authService.logout((req.user as { id: string }).id, body.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) { return this.authService.forgotPassword(forgotPasswordDto); }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) { return this.authService.resetPassword(resetPasswordDto); }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Request() req: ExpressRequest) { return this.authService.getProfile((req.user as { id: string }).id); }

  @Put('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@Request() req: ExpressRequest, @Body() body: UpdateProfileDto) { return this.authService.updateProfile((req.user as { id: string }).id, body); }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: ExpressRequest, @Body() changePasswordDto: ChangePasswordDto) { return this.authService.changePassword((req.user as { id: string }).id, changePasswordDto); }

  @Get('permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPermissions(@Request() req: ExpressRequest) { return { role: (req.user as { role: UserRole }).role, permissions: this.authService.getPermissions((req.user as { role: UserRole }).role) }; }

  @Put('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUserRole(@Param('userId') userId: string, @Body() updateUserRoleDto: UpdateUserRoleDto) { return this.authService.updateUserRole(updateUserRoleDto.userId, updateUserRoleDto.role); }
}