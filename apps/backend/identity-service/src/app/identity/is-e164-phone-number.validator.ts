import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
@ValidatorConstraint({ name: 'isE164PhoneNumber', async: false })
export class IsE164PhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) { return true; }
  defaultMessage(args: ValidationArguments) { return 'Invalid phone number'; }
}
export function IsE164PhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({ target: object.constructor, propertyName: propertyName, options: validationOptions, constraints: [], validator: IsE164PhoneNumberConstraint });
  };
}
