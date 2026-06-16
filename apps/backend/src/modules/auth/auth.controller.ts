import { Controller, Post, Get, Put, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, UpdateUserRoleDto } from './dto/auth.dto';

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
  async logout(@Request() req: any, @Body() body: { refreshToken?: string }) {
    await this.authService.logout(req.user.id, body.refreshToken);
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
  me(@Request() req: any) { return this.authService.getProfile(req.user.id); }

  @Put('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateProfile(@Request() req: any, @Body() body: { name?: string; avatar?: string }) { return this.authService.updateProfile(req.user.id, body); }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) { return this.authService.changePassword(req.user.id, changePasswordDto); }

  @Get('permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getPermissions(@Request() req: any) { return { role: req.user.role, permissions: this.authService.getPermissions(req.user.role) }; }

  @Put('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateUserRole(@Param('userId') userId: string, @Body() updateUserRoleDto: UpdateUserRoleDto) { return this.authService.updateUserRole(updateUserRoleDto.userId, updateUserRoleDto.role); }
}