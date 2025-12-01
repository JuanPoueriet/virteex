import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PlusCircle, Filter, MoreHorizontal } from 'lucide-angular';
import { PriceList } from '../../../core/models/price-list.model';
import { PriceListsService } from '../../../core/api/price-lists.service';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-price-lists-page',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './price-lists.page.html',
  styleUrls: ['./price-lists.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceListsPage implements OnInit {
  protected readonly PlusCircleIcon = PlusCircle;
  protected readonly FilterIcon = Filter;
  protected readonly MoreHorizontalIcon = MoreHorizontal;

  private priceListsService = inject(PriceListsService);
  private notificationService = inject(NotificationService);

  priceLists = signal<PriceList[]>([]);
  isLoading = signal(true);

  ngOnInit(): void {
    this.loadPriceLists();
  }

  loadPriceLists(): void {
    this.isLoading.set(true);
    this.priceListsService.getPriceLists().subscribe({
      next: (data) => {
        this.priceLists.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('Could not load price lists.');
        this.isLoading.set(false);
      },
    });
  }

  getStatusClass(status: PriceList['status']): string {
    if (status === 'Active') return 'status-active';
    if (status === 'Inactive') return 'status-inactive';
    return 'status-draft';
  }
}