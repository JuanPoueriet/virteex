import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PlusCircle, Filter, MoreHorizontal, Eye, Download, FileText } from 'lucide-angular';
import { InvoicesService, Invoice } from '../../../core/services/invoices';
import { NotificationService } from '../../../core/services/notification';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-invoices-list-page',
  imports: [RouterLink, LucideAngularModule, CurrencyPipe, DatePipe],
  templateUrl: './list.page.html',
  styleUrls: ['./list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoicesListPage implements OnInit {
  protected readonly PlusCircleIcon = PlusCircle;
  protected readonly FilterIcon = Filter;
  protected readonly MoreHorizontalIcon = MoreHorizontal;
  protected readonly EyeIcon = Eye;
  protected readonly DownloadIcon = Download;
  protected readonly CreditNoteIcon = FileText;

  private invoicesService = inject(InvoicesService);
  private notificationService = inject(NotificationService);

  invoices = signal<Invoice[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.invoicesService.getInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar las facturas.');
        this.notificationService.showError(this.error()!);
        this.isLoading.set(false);
      },
    });
  }

  downloadPdf(id: string, invoiceNumber: string): void {
    this.invoicesService.downloadInvoicePdf(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${invoiceNumber}.pdf`;
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

  getStatusClass(status: Invoice['status']): string {
    switch (status) {
      case 'Paid': return 'status-paid';
      case 'Pending': return 'status-pending';
      case 'Void': return 'status-overdue';
      case 'Credit Note': return 'status-inactive';
      default: return 'status-pending';
    }
  }
}
