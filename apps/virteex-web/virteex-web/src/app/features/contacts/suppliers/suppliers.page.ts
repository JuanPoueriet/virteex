import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, PlusCircle } from 'lucide-angular';
@Component({
  selector: 'app-suppliers-page', standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './suppliers.page.html', styleUrls: ['./suppliers.page.scss']
})
export class SuppliersPage {
  protected readonly PlusCircleIcon = PlusCircle;
}