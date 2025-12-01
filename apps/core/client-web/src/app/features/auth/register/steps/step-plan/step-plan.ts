import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check } from 'lucide-angular';
@Component({
  selector: 'app-step-plan', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './step-plan.html', styleUrls: ['./step-plan.scss']
})
export class StepPlan {
  @Input() parentForm!: FormGroup;
  protected readonly CheckIcon = Check;
  selectPlan(plan: string) { this.parentForm.get('planId')?.setValue(plan); }
}