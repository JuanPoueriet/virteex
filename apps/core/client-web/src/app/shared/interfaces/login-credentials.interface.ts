export interface LoginCredentials {
    /**
     * Correo electrónico del usuario.
     * @example 'test@example.com'
     */
    email: string;

    /**
     * Contraseña del usuario.
     * @example '123456'
     */
    password: string;

    /**
     * Token de validación de reCAPTCHA v3 generado en el frontend.
     */
    recaptchaToken: string;
}