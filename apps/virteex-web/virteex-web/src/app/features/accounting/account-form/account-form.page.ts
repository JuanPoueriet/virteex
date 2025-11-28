import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChartOfAccountsApiService, CreateAccountDto, UpdateAccountDto } from '../../../core/api/chart-of-accounts.service';
import { ChartOfAccountsStateService } from '../../../core/state/chart-of-accounts.state';
import { take } from 'rxjs/operators';
import { AccountType, AccountCategory, AccountNature, CashFlowCategory, RequiredDimension } from '../../../core/models/account.model';
import { LucideAngularModule, Save } from 'lucide-angular';
import { NotificationService } from '../../../core/services/notification';

@Component({
  selector: 'app-account-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideAngularModule],
  templateUrl: './account-form.page.html',
  styleUrls: ['./account-form.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ChartOfAccountsApiService);
  public readonly stateService = inject(ChartOfAccountsStateService); // Hecho público para el template
  private readonly notificationService = inject(NotificationService);

  public accountForm!: FormGroup;
  public isEditing = signal(false);
  public isLoading = signal(true);
  private accountId: string | null = null;

  // --- Propiedades y Métodos Añadidos para Corregir Errores ---
  public activeTab = signal<'general' | 'mappings' | 'rules' | 'advanced'>('general');
  public readonly SaveIcon = Save;
  public readonly accountTypes = Object.values(AccountType);
  public readonly accountCategories = Object.values(AccountCategory);
  public readonly accountNatures = Object.values(AccountNature);
  public readonly cashFlowCategories = Object.values(CashFlowCategory);
  public readonly allDimensions: RequiredDimension[] = ['COST_CENTER', 'PROJECT', 'SEGMENT'];
  // -----------------------------------------------------------

  ngOnInit(): void {
    this.initializeForm();
    this.accountId = this.route.snapshot.paramMap.get('id');

    if (this.accountId) {
      this.isEditing.set(true);
      this.loadAccountData(this.accountId);
    } else {
      this.isLoading.set(false);
    }
  }

  private initializeForm(): void {
    this.accountForm = this.fb.group({
      // Pestaña General
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      parentId: [null],
      type: [null, Validators.required],
      nature: [{ value: null, disabled: true }, Validators.required],
      category: [null, Validators.required],
      isPostable: [true, Validators.required],
      isActive: [true, Validators.required],
  
      // Pestaña Mapeos (agrupado)
      statementMapping: this.fb.group({
        balanceSheetCategory: [''],
        incomeStatementCategory: [''],
        cashFlowCategory: [CashFlowCategory.NONE]
      }),
  
      // Pestaña Reglas (agrupado)
      rules: this.fb.group({
        requiresReconciliation: [false],
        isCashOrBank: [false],
        allowsIntercompany: [false],
        isFxRevaluation: [false],
        requiredDimensions: this.fb.array([])
      }),
  
      // Pestaña Avanzado (agrupado)
      advanced: this.fb.group({
        version: [{ value: 1, disabled: true }],
        hierarchyType: [{ value: 'LEGAL', disabled: true }],
        effectiveFrom: [new Date().toISOString().split('T')[0]],
        effectiveTo: [null]
      })
    });
  
    // Lógica para autocompletar la naturaleza
    this.accountForm.get('type')?.valueChanges.subscribe((type: AccountType) => {
      this.accountForm.get('nature')?.setValue(this.getNatureFromType(type), { emitEvent: false });
    });
  }

  private loadAccountData(id: string): void {
    this.isLoading.set(true);
    this.apiService.getAccountById(id).pipe(take(1)).subscribe({
      next: (account) => {
        // Usar patchValue para el formulario principal.
        // TypeORM puede devolver entidades con campos extra que no están en el DTO.
        this.accountForm.patchValue(account);
  
        // Si la cuenta tiene datos anidados (que deberían venir del backend),
        // los parcheamos explícitamente.
        if (account.statementMapping) {
          this.accountForm.get('statementMapping')?.patchValue(account.statementMapping);
        }
        if (account.rules) {
          this.accountForm.get('rules')?.patchValue(account.rules);
          // Manejar el FormArray de dimensiones
          this.requiredDimensionsFormArray.clear();
          account.rules.requiredDimensions?.forEach(dim => {
            this.requiredDimensionsFormArray.push(this.fb.control(dim));
          });
        }
        if (account.advanced) {
          this.accountForm.get('advanced')?.patchValue(account.advanced);
        }
  
        if (this.isEditing()) {
          this.accountForm.get('code')?.disable();
          this.accountForm.get('type')?.disable();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.notificationService.showError('Error al cargar los datos de la cuenta.');
        this.isLoading.set(false);
        this.router.navigate(['/app/accounting/chart-of-accounts']);
      }
    });
  }

  onSave(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      this.notificationService.showError('Por favor, complete todos los campos requeridos.');
      // Abrir el tab que contiene el primer error
      this.findAndFocusFirstInvalidTab();
      return;
    }
  
    this.isLoading.set(true);
    const formData = this.accountForm.getRawValue();
  
    // Construir el payload usando la estructura anidada del formulario
    const payload: CreateAccountDto | UpdateAccountDto = {
      ...formData,
      nature: this.getNatureFromType(formData.type), // Añadir la naturaleza calculada
    };
  
    const saveOperation = this.isEditing()
      ? this.apiService.updateAccount(this.accountId!, payload)
      : this.apiService.createAccount(payload as CreateAccountDto);
  
    saveOperation.pipe(take(1)).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Cuenta ${this.isEditing() ? 'actualizada' : 'creada'} con éxito.`);
        this.stateService.refreshAccounts();
        this.router.navigate(['/app/accounting/chart-of-accounts']);
      },
      error: (err) => {
        // Mejor manejo de errores
        const message = err?.error?.message ?? 'Error al guardar la cuenta.';
        this.notificationService.showError(message);
        this.isLoading.set(false);
      }
    });
  }

  private getNatureFromType(type: AccountType): AccountNature {
    const creditTypes: AccountType[] = [AccountType.LIABILITY, AccountType.EQUITY, AccountType.REVENUE];
    return creditTypes.includes(type) ? AccountNature.CREDIT : AccountNature.DEBIT;
  }

  onCancel(): void {
    this.router.navigate(['/app/accounting/chart-of-accounts']);
  }

  get requiredDimensionsFormArray(): FormArray {
    return this.accountForm.get('rules.requiredDimensions') as FormArray;
  }

  isDimensionSelected(dimension: RequiredDimension): boolean {
    return this.requiredDimensionsFormArray.value.includes(dimension);
  }

  onDimensionChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const dimension = input.value as RequiredDimension;
    if (input.checked) {
      this.requiredDimensionsFormArray.push(this.fb.control(dimension));
    } else {
      const index = this.requiredDimensionsFormArray.controls.findIndex(c => c.value === dimension);
      if (index !== -1) {
        this.requiredDimensionsFormArray.removeAt(index);
      }
    }
  }
  
  private findAndFocusFirstInvalidTab(): void {
    const controls = this.accountForm.controls;
    
    // Check general tab fields
    for (const key of ['code', 'name', 'type', 'category']) {
      if (controls[key]?.invalid) {
        this.activeTab.set('general');
        return;
      }
    }
    
    // Check other tabs by group
    if (this.accountForm.get('statementMapping')?.invalid) {
      this.activeTab.set('mappings');
      return;
    }
    if (this.accountForm.get('rules')?.invalid) {
      this.activeTab.set('rules');
      return;
    }
    if (this.accountForm.get('advanced')?.invalid) {
      this.activeTab.set('advanced');
      return;
    }
  }
}