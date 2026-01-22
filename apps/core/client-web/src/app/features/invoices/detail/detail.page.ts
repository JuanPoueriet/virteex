import { Component, ChangeDetectionStrategy, input, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, Printer, Download, Mail, MoreVertical } from 'lucide-angular';
import { Invoice, InvoicesService } from '../../../core/services/invoices';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-invoice-detail-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceDetailPage {
  private invoicesService = inject(InvoicesService);
  private notificationService = inject(NotificationService);

  id = input<string>();
  invoice = signal<Invoice | undefined>(undefined);

  protected readonly PrinterIcon = Printer;
  protected readonly DownloadIcon = Download;
  protected readonly MailIcon = Mail;
  protected readonly MoreIcon = MoreVertical;

  constructor() {
    effect(() => {
      const invoiceId = this.id();
      if (invoiceId) {
        this.loadInvoice(invoiceId);
      }
    });
  }

  loadInvoice(id: string): void {
    this.invoicesService.getInvoiceById(id).subscribe({
        next: (data) => {
            this.invoice.set(data);
        },
        error: (err) => {
            // Manejo de error si la factura no se encuentra
            this.notificationService.showError('No se pudo cargar la factura.');
            console.error(err);
        }
    });
  }
  
  printInvoice(): void {
    window.print();
  }

  downloadPdf(): void {
    const invoiceId = this.id();
    if (!invoiceId) return;

    this.invoicesService.downloadInvoicePdf(invoiceId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const currentInvoice = this.invoice();
        a.download = `factura-${currentInvoice ? currentInvoice.invoiceNumber : 'doc'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: () => {
        this.notificationService.showError('No se pudo descargar el PDF de la factura.');
      }
    });
  }

  createCreditNote(invoiceId: string): void {
      if(confirm('¿Estás seguro de que quieres anular esta factura con una nota de crédito? Esta acción no se puede deshacer.')) {
          this.invoicesService.createCreditNote(invoiceId).subscribe({
              next: () => {
                  this.notificationService.showSuccess('Factura anulada y nota de crédito creada.');
                  this.loadInvoice(invoiceId); // Recargar para ver el nuevo estado
              },
              error: (err) => this.notificationService.showError(err.message)
          });
      }
  }
}
