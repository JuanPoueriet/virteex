import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-client-feature',
  imports: [],
  templateUrl: './client-feature.html',
  styleUrl: './client-feature.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFeature {}
