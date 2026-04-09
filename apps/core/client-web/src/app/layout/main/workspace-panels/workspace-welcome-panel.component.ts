import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { LucideAngularModule, Sparkles, Workflow, PanelTopClose, Layers } from 'lucide-angular';

@Component({
  selector: 'app-workspace-welcome-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="workspace-welcome">
      <header>
        <lucide-icon [img]="SparklesIcon" size="18"></lucide-icon>
        <h3>Centro de trabajo</h3>
      </header>

      <p>
        Ahora puedes organizar tu espacio con pestañas acoplables y mantener tus vistas activas sin perder contexto.
      </p>

      <ul>
        <li>
          <lucide-icon [img]="WorkflowIcon" size="16"></lucide-icon>
          <span>Cambia entre pestañas sin recargar tus flujos.</span>
        </li>
        <li>
          <lucide-icon [img]="PanelTopCloseIcon" size="16"></lucide-icon>
          <span>Cierra y reordena paneles según tu forma de trabajo.</span>
        </li>
        <li>
          <lucide-icon [img]="LayersIcon" size="16"></lucide-icon>
          <span>Diseño limpio y consistente con el tema de la plataforma.</span>
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .workspace-welcome {
        height: 100%;
        padding: 1.25rem;
        display: grid;
        gap: 1rem;
        align-content: start;
        background: linear-gradient(160deg, var(--bg-layer-1) 0%, var(--bg-layer-2) 100%);
        border-radius: 12px;
      }

      header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--accent-primary);
      }

      h3 {
        margin: 0;
        font-size: 1rem;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.45;
      }

      ul {
        list-style: none;
        display: grid;
        gap: 0.75rem;
      }

      li {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        color: var(--text-primary);
      }
    `,
  ],
})
export class WorkspaceWelcomePanelComponent {
  @Input() api: unknown;
  @Input() params: unknown;

  protected readonly SparklesIcon = Sparkles;
  protected readonly WorkflowIcon = Workflow;
  protected readonly PanelTopCloseIcon = PanelTopClose;
  protected readonly LayersIcon = Layers;
}
