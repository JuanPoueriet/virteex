import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme';
import { LanguageService } from './core/services/language';
import { AuthService } from './core/services/auth';
import { ModalService } from './shared/service/modal.service';
import { ModalComponent } from './shared/components/modal/modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,ModalComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  public themeService = inject(ThemeService);
  private languageService = inject(LanguageService);
  private authService = inject(AuthService);
  public modalService = inject(ModalService);

  ngOnInit(): void {
    // this.authService.checkAuthStatus().subscribe();
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



