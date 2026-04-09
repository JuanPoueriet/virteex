import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-workspace-route-panel',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <section class="workspace-route-panel">
      <router-outlet></router-outlet>
    </section>
  `,
  styles: [
    `
      :host,
      .workspace-route-panel {
        display: block;
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class WorkspaceRoutePanelComponent {
  @Input() api: unknown;
  @Input() params: unknown;
}
