import { AbstractControl, FormControl } from '@angular/forms';
import { strongPasswordValidator } from './password.validator';

describe('strongPasswordValidator', () => {
  it('should return null for a valid strong password', () => {
    const control = new FormControl('StrongP@ssw0rd');
    const validator = strongPasswordValidator();
    expect(validator(control)).toBeNull();
  });

  it('should return errors for a weak password', () => {
    const control = new FormControl('weak');
    const validator = strongPasswordValidator();
    const result = validator(control);
    expect(result).toBeTruthy();
    expect(result!['strongPassword']).toBeTruthy();
  });
});
