// import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// setupZoneTestEnv({
//   errorOnUnknownElements: true,
//   errorOnUnknownProperties: true,
// });

// Use setup-env/zoneless for Zoneless testing
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
});
