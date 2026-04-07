import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PlusCircle, Filter, MoreHorizontal, Trash2, Edit } from 'lucide-angular';
import { Tax } from '../../../core/models/tax.model';
import { TaxesService } from '../../../core/api/taxes.service';
import { NotificationService } from '../../../core/services/notification';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-taxes-page',
  imports: [LucideAngularModule, RouterLink, HasPermissionDirective, DecimalPipe],
  templateUrl: './taxes.page.html',
  styleUrls: ['./taxes.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxesPage implements OnInit {
  protected readonly PlusCircleIcon = PlusCircle;
  protected readonly FilterIcon = Filter;
  protected readonly MoreHorizontalIcon = MoreHorizontal;
  protected readonly TrashIcon = Trash2;
  protected readonly EditIcon = Edit;

  private taxesService = inject(TaxesService);
  private notificationService = inject(NotificationService);

  taxes = signal<Tax[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadTaxes();
  }

  loadTaxes(): void {
    this.isLoading.set(true);
    this.taxesService.getTaxes().subscribe({
      next: (data) => {
        this.taxes.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('No se pudieron cargar los impuestos.');
        this.isLoading.set(false);
      },
    });
  }

  deleteTax(tax: Tax): void {
    if (confirm(`¿Está seguro de que desea eliminar el impuesto "${tax.name}"?`)) {
      this.taxesService.deleteTax(tax.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Impuesto eliminado exitosamente.');
          this.loadTaxes();
        },
        error: () => this.notificationService.showError('Error al eliminar el impuesto.'),
      });
    }
  }
}
