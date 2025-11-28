
import { CreateTaxDto } from "../taxes/dto/create-tax.dto";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { LocalizationTemplate } from "./localization-template.entity";

@Entity({ name: 'tax_templates' })
export class TaxTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    countryCode: string;

    @Column({ type: 'jsonb' })
    taxes: CreateTaxDto[];

    @ManyToOne(() => LocalizationTemplate, template => template.taxTemplates)
    template: LocalizationTemplate;
}