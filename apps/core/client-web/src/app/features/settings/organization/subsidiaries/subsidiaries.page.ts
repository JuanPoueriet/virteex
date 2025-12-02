import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subsidiaries',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold mb-4">Estructura Empresarial</h2>
      <p class="text-gray-600">Gestión de subsidiarias y sucursales.</p>
    </div>
  `
})
export class SubsidiariesPage {}
