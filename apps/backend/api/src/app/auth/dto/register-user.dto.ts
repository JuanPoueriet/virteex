


import { IsRNC } from '../../../../../../libs/shared/util-auth/src/index';
import {
    IsString,
    IsNotEmpty,
    IsEmail,
    MinLength,
    MaxLength,
    Matches,
    IsOptional,
    IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {

    @ApiProperty({ example: 'Acme Corp', description: 'Organization Legal Name' })
    @IsString({ message: 'El nombre de la organización debe ser un texto.' })
    @IsNotEmpty({ message: 'El nombre de la organización no puede estar vacío.' })
    @MinLength(2, {
        message: 'El nombre de la organización debe tener al menos 2 caracteres.',
    })
    organizationName: string;

    @ApiProperty({ example: '131222222', description: 'Tax ID (RNC)', required: false })
    @IsString({ message: 'El RNC debe ser un texto.' })
    @IsOptional()
    @IsRNC({ message: 'El RNC no es válido (verifique los dígitos o el formato).' })
    rnc?: string;

    @ApiProperty({ example: 'uuid-of-region', description: 'Fiscal Region ID' })
    @IsUUID('4', { message: 'El ID de la región fiscal no es válido.' })
    @IsNotEmpty({ message: 'Debe seleccionar una región fiscal.' })
    fiscalRegionId: string;

    @ApiProperty({ example: 'John', description: 'User First Name' })
    @IsString({ message: 'El nombre debe ser un texto.' })
    @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'User Last Name' })
    @IsString({ message: 'El apellido debe ser un texto.' })
    @IsNotEmpty({ message: 'El apellido no puede estar vacío.' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com', description: 'User Email' })
    @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
    @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
    email: string;

    @ApiProperty({ example: 'StrongP@ssw0rd', description: 'User Password' })
    @IsString({ message: 'La contraseña debe ser un texto.' })
    @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
    @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
    @MaxLength(50, {
        message: 'La contraseña no puede tener más de 50 caracteres.',
    })
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'La contraseña debe contener al menos una mayúscula, una minúscula y un número o carácter especial.',
    })
    password: string;

    @ApiProperty({ description: 'Google Recaptcha V3 Token' })
    @IsString()
    @IsNotEmpty({ message: 'El token de reCAPTCHA es obligatorio.' })
    recaptchaToken: string;
}