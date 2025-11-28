// app/core/api/chart-of-accounts.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Account, CashFlowCategory, RequiredDimension } from '../models/account.model';

export interface CreateAccountDto extends Omit<Account, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'balance' | 'children' | 'isSystemAccount' | 'level' | 'isExpanded' | 'hasChildren'> {
  statementMapping?: {
    balanceSheetCategory: string;
    incomeStatementCategory: string;
    cashFlowCategory: CashFlowCategory;
  };
  rules?: {
    requiresReconciliation: boolean;
    isCashOrBank: boolean;
    allowsIntercompany: boolean;
    isFxRevaluation: boolean;
    requiredDimensions: RequiredDimension[];
  };
  advanced?: {
    version: number;
    hierarchyType: string;
    effectiveFrom: Date;
    effectiveTo?: Date;
  };
}

export type UpdateAccountDto = Partial<CreateAccountDto>;


@Injectable({ providedIn: 'root' })
export class ChartOfAccountsApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/chart-of-accounts`;

  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(this.apiUrl);
  }
  
  getAccountTree(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.apiUrl}/tree`);
  }

  getAccountById(id: string): Observable<Account> {
    return this.http.get<Account>(`${this.apiUrl}/${id}`);
  }

  createAccount(account: CreateAccountDto): Observable<Account> {
    return this.http.post<Account>(this.apiUrl, account);
  }

  updateAccount(id: string, account: UpdateAccountDto): Observable<Account> {
    return this.http.patch<Account>(`${this.apiUrl}/${id}`, account);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}