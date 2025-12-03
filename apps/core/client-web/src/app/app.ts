import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ThemeService } from './core/services/theme';
import { LanguageService } from './core/services/language';
import { AuthService } from './core/services/auth';
import { ModalService } from './shared/service/modal.service';
import { ModalComponent } from './shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from './shared/components/loader/loader.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalComponent, CommonModule, LoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public themeService = inject(ThemeService);
  private languageService = inject(LanguageService);
  private authService = inject(AuthService);
  public modalService = inject(ModalService);
  private router = inject(Router);

  public isLoading = signal(false);

  ngOnInit(): void {
    // this.authService.checkAuthStatus().subscribe();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.isLoading.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isLoading.set(false);
      }
    });
  }

  openTestModal(): void {
    this.modalService.open({
      title: 'Modal de Prueba',
      message: '¡El servicio de modales está funcionando correctamente!',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar'
    })?.onClose$.subscribe(result => {
      console.log('Modal cerrado con resultado:', result);
    });
  }
}



