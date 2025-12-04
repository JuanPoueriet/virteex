
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  password: string;


  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
  

  @IsString()
  @IsNotEmpty({ message: 'El token de reCAPTCHA es obligatorio.' })
  recaptchaToken: string;

  @IsString()
  @IsOptional()
  twoFactorCode?: string;
}
