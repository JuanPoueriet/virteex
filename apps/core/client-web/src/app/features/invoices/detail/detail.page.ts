import { Component, ChangeDetectionStrategy, Input, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// Se importa ActivatedRoute para acceder a los parámetros de la URL.
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
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
export class InvoiceDetailPage implements OnInit {
  private invoicesService = inject(InvoicesService);
  private notificationService = inject(NotificationService);
  // Se inyecta ActivatedRoute.
  private route = inject(ActivatedRoute);

  // Mantenemos el @Input por si se usa en otros contextos, pero ahora no es la fuente principal.
  @Input() id = '';
  invoice = signal<Invoice | undefined>(undefined);

  protected readonly PrinterIcon = Printer;
  protected readonly DownloadIcon = Download;
  protected readonly MailIcon = Mail;
  protected readonly MoreIcon = MoreVertical;

  ngOnInit(): void {
    // ---- INICIO DE LA CORRECCIÓN ----
    // Se obtiene el 'id' directamente de los parámetros de la ruta activa.
    // Esto es más robusto que depender únicamente del binding de inputs del router.
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.id = routeId;
      this.loadInvoice();
    } else if (this.id) {
        // Como fallback, si el id viene de un @Input, también cargamos.
        this.loadInvoice();
    }
    // ---- FIN DE LA CORRECCIÓN ----
  }

  loadInvoice(): void {
    this.invoicesService.getInvoiceById(this.id).subscribe({
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

  // --- NUEVO MÉTODO ---
  downloadPdf(): void {
    this.invoicesService.downloadInvoicePdf(this.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura-${this.invoice()?.invoiceNumber}.pdf`;
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
  // --- FIN DEL NUEVO MÉTODO ---

  createCreditNote(invoiceId: string): void {
      if(confirm('¿Estás seguro de que quieres anular esta factura con una nota de crédito? Esta acción no se puede deshacer.')) {
          this.invoicesService.createCreditNote(invoiceId).subscribe({
              next: () => {
                  this.notificationService.showSuccess('Factura anulada y nota de crédito creada.');
                  this.loadInvoice(); // Recargar para ver el nuevo estado
              },
              error: (err) => this.notificationService.showError(err.message)
          });
      }
  }
}